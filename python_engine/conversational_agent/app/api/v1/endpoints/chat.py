"""Chat endpoints for the conversational agent."""
from fastapi import APIRouter, HTTPException, Request, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import json
import asyncio

from app.core.config import get_settings
from app.core.logger import get_logger
from app.workflows.main_workflow import run_workflow, run_workflow_streaming, get_workflow
from app.services.session.session_service import get_session_service
from app.services.backend_client import BackendClient
from app.services.tracing.langfuse_service import get_tracing_service

router = APIRouter()
settings = get_settings()
logger = get_logger(__name__)


class ChatRequest(BaseModel):
    """Request body for chat endpoints."""
    user_id: str = Field(..., description="User identifier")
    session_id: Optional[str] = Field(None, description="Session identifier (creates new if not provided)")
    message: str = Field(..., description="User message", min_length=1, max_length=10000)
    pending_context: Optional[Dict[str, Any]] = Field(None, description="Pending clarification context for follow-up messages")
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user_123",
                "session_id": "session_456",
                "message": "I need a jacket for a job interview",
            }
        }


class ChatResponse(BaseModel):
    """Response body for non-streaming chat."""
    session_id: str = Field(..., description="Session identifier")
    response: str = Field(..., description="Assistant response")
    intent: Optional[str] = Field(None, description="Classified intent")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    x_auth_token: Optional[str] = Header(None, alias="X-Auth-Token"),
) -> ChatResponse:
    """
    Non-streaming chat endpoint.
    
    Processes the user message and returns the complete response.
    
    Args:
        request: Chat request with user_id, session_id, and message
        x_auth_token: Optional auth token forwarded from NestJS for backend callbacks
        
    Returns:
        ChatResponse with the assistant's response
    """
    logger.info(f"Chat request from user {request.user_id}")
    
    # Create backend client with auth token if provided
    backend_client = BackendClient(auth_token=x_auth_token) if x_auth_token else None
    
    # Get services
    session_service = get_session_service(backend_client=backend_client)
    tracing_service = get_tracing_service()
    
    try:
        # Load or create session
        session_data = await session_service.load_session(
            user_id=request.user_id,
            session_id=request.session_id,
        )
        
        # Determine pending context: use from request if provided, else check session metadata
        pending_context = request.pending_context
        if not pending_context:
            pending_context = session_service.get_pending_context(session_data)
        
        # Start trace
        trace_id = tracing_service.start_trace(
            user_id=request.user_id,
            session_id=session_data.session_id,
            name="chat",
            metadata={
                "message_length": len(request.message),
                "has_pending_context": pending_context is not None,
            },
        )
        
        # Format conversation history
        conversation_history = session_service.format_history_for_llm(
            session_data.messages
        )
        
        # Run the workflow
        final_state = await run_workflow(
            user_id=request.user_id,
            session_id=session_data.session_id,
            message=request.message,
            conversation_history=conversation_history,
            pending_context=pending_context,
        )
        
        # Get the response
        response_text = final_state.get("final_response", "")
        workflow_status = final_state.get("workflow_status", "completed")
        
        # Always save the conversation turn, even if response is empty or error
        try:
            await session_service.save_conversation_turn(
                session_id=session_data.session_id,
                user_message=request.message,
                assistant_message=response_text or "I apologize, but I encountered an issue processing your request. Please try again.",
                user_metadata={"trace_id": trace_id},
                assistant_metadata={
                    "trace_id": trace_id,
                    "intent": final_state.get("intent"),
                    "iteration": final_state.get("iteration", 0),
                    "workflow_status": workflow_status,
                },
            )
        except Exception as save_error:
            logger.error(f"Failed to save conversation turn: {save_error}")
            # Don't fail the request if save fails, but log it
        
        # Save pending clarification context if workflow is awaiting clarification
        if workflow_status == "awaiting_clarification":
            try:
                from app.workflows.state import create_clarification_context
                clarification_context = create_clarification_context(final_state)
                await session_service.save_pending_context(
                    session_id=session_data.session_id,
                    context=clarification_context,
                )
            except Exception as context_error:
                logger.error(f"Failed to save pending context: {context_error}")
                # Don't fail the request if context save fails
        
        # Save completed workflow context if workflow completed successfully with items
        elif workflow_status == "completed":
            try:
                retrieved_items = final_state.get("retrieved_items", [])
                if retrieved_items:
                    workflow_context = {
                        "intent": final_state.get("intent"),
                        "extracted_filters": final_state.get("extracted_filters"),
                        "retrieved_items": retrieved_items,
                        "style_dna": final_state.get("style_dna"),
                        "user_profile": final_state.get("user_profile"),
                        "search_scope": final_state.get("search_scope"),
                    }
                    await session_service.save_workflow_context(
                        session_id=session_data.session_id,
                        context=workflow_context,
                    )
            except Exception as context_error:
                logger.error(f"Failed to save workflow context: {context_error}")
                # Don't fail the request if context save fails
        
        # End trace
        tracing_service.end_trace(
            trace_id=trace_id,
            output=response_text[:500] if response_text else "[empty response]",
            metadata={
                "intent": final_state.get("intent"),
                "workflow_status": workflow_status,
            },
        )
        
        return ChatResponse(
            session_id=session_data.session_id,
            response=response_text or "I apologize, but I encountered an issue processing your request. Please try again.",
            intent=final_state.get("intent"),
            metadata={
                "iteration": final_state.get("iteration", 0),
                "search_sources": final_state.get("search_sources_used", []),
                "workflow_status": workflow_status,
            },
        )
        
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        # Generate user-friendly error response
        error_response = "I apologize, but I encountered an issue processing your request. Please try again or rephrase your question."
        
        # Try to save error message to session if we have session_id
        if request.session_id:
            try:
                backend_client = BackendClient(auth_token=x_auth_token) if x_auth_token else None
                session_service = get_session_service(backend_client=backend_client)
                await session_service.save_conversation_turn(
                    session_id=request.session_id,
                    user_message=request.message,
                    assistant_message=error_response,
                    assistant_metadata={"error": str(e), "error_type": type(e).__name__},
                )
            except Exception as save_error:
                logger.error(f"Failed to save error message: {save_error}")
        
        raise HTTPException(status_code=500, detail=error_response)


@router.post("/chat/stream")
async def chat_stream(
    request: ChatRequest,
    x_auth_token: Optional[str] = Header(None, alias="X-Auth-Token"),
) -> StreamingResponse:
    """
    Streaming chat endpoint using Server-Sent Events (SSE).
    
    Streams intermediate results as the workflow executes, providing
    real-time progress updates to the client.
    
    Event types:
    - metadata: Initial connection info (session_id, user_id)
    - node_start: Workflow node started executing
    - node_end: Workflow node finished executing
    - status: Human-readable status message
    - tool_call: MCP tool being called
    - intent: Intent classification result
    - filters: Extracted search filters
    - items_found: Number of items found
    - analysis: Analyzer decision
    - chunk: Response text chunk (during response generation)
    - done: Final complete response with all data
    - error: Error occurred
    
    Args:
        request: Chat request with user_id, session_id, and message
        x_auth_token: Optional auth token forwarded from NestJS for backend callbacks
        
    Returns:
        StreamingResponse with SSE events
    """
    logger.info(f"Streaming chat request from user {request.user_id}")
    
    # Create backend client with auth token if provided
    backend_client = BackendClient(auth_token=x_auth_token) if x_auth_token else None
    
    async def generate_stream():
        """Generate SSE stream with real intermediate results."""
        session_service = get_session_service(backend_client=backend_client)
        final_response = None
        final_intent = None
        final_state = None
        session_id = None
        
        try:
            # Load or create session
            session_data = await session_service.load_session(
                user_id=request.user_id,
                session_id=request.session_id,
            )
            session_id = session_data.session_id
            
            # Determine pending context: use from request if provided, else check session metadata
            pending_context = request.pending_context
            if not pending_context:
                pending_context = session_service.get_pending_context(session_data)
            
            # Format conversation history
            conversation_history = session_service.format_history_for_llm(
                session_data.messages
            )
            
            # Stream workflow events
            async for event in run_workflow_streaming(
                user_id=request.user_id,
                session_id=session_data.session_id,
                message=request.message,
                conversation_history=conversation_history,
                pending_context=pending_context,
            ):
                # Convert StreamEvent to SSE format
                yield _format_sse_event(event.type, event.content)
                
                # Capture final response and state for session saving
                if event.type == "done":
                    final_response = event.content.get("response", "")
                    final_intent = event.content.get("intent")
                    final_state = {
                        "workflow_status": event.content.get("workflow_status", "completed"),
                        "intent": final_intent,
                        "retrieved_items": event.content.get("items", []),
                        "extracted_filters": None,  # Not in done event, would need to track
                        "style_dna": None,  # Not in done event, would need to track
                        "user_profile": None,  # Not in done event, would need to track
                        "search_scope": None,  # Not in done event, would need to track
                    }
            
            # Always save the conversation turn, even if response is empty
            try:
                response_to_save = final_response or "I apologize, but I encountered an issue processing your request. Please try again."
                await session_service.save_conversation_turn(
                    session_id=session_data.session_id,
                    user_message=request.message,
                    assistant_message=response_to_save,
                    user_metadata={},
                    assistant_metadata={
                        "intent": final_intent,
                        "streaming": True,
                        "workflow_status": final_state.get("workflow_status", "completed") if final_state else "completed",
                    },
                )
            except Exception as save_error:
                logger.error(f"Failed to save conversation turn: {save_error}")
                # Don't fail the stream if save fails
            
            # Save pending clarification context if workflow is awaiting clarification
            if final_state and final_state.get("workflow_status") == "awaiting_clarification":
                try:
                    # Note: We don't have full state in done event, so we can't save full context
                    # This is a limitation - we'd need to track state during streaming
                    # For now, we'll save a minimal context
                    clarification_context = {
                        "original_message": request.message,
                        "clarification_question": None,  # Would need to track
                        "extracted_filters": None,
                        "search_scope": None,
                        "retrieved_items": final_state.get("retrieved_items", []),
                        "iteration": 0,
                    }
                    await session_service.save_pending_context(
                        session_id=session_data.session_id,
                        context=clarification_context,
                    )
                except Exception as context_error:
                    logger.error(f"Failed to save pending context: {context_error}")
            
            # Save completed workflow context if workflow completed successfully with items
            elif final_state and final_state.get("workflow_status") == "completed":
                try:
                    retrieved_items = final_state.get("retrieved_items", [])
                    if retrieved_items:
                        workflow_context = {
                            "intent": final_intent,
                            "retrieved_items": retrieved_items,
                            # Note: Other fields not available in done event
                            # This is a limitation of streaming - we'd need to track state
                        }
                        await session_service.save_workflow_context(
                            session_id=session_data.session_id,
                            context=workflow_context,
                        )
                except Exception as context_error:
                    logger.error(f"Failed to save workflow context: {context_error}")
            
        except Exception as e:
            logger.error(f"Streaming error: {e}", exc_info=True)
            error_message = "I apologize, but I encountered an issue processing your request. Please try again."
            yield _format_sse_event("error", {"message": error_message})
            
            # Try to save error message to session
            if session_id:
                try:
                    error_response = error_message
                    await session_service.save_conversation_turn(
                        session_id=session_id,
                        user_message=request.message,
                        assistant_message=error_response,
                        assistant_metadata={
                            "error": str(e),
                            "error_type": type(e).__name__,
                            "streaming": True,
                        },
                    )
                except Exception as save_error:
                    logger.error(f"Failed to save error message: {save_error}")
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def _format_sse_event(event_type: str, data: Dict[str, Any]) -> str:
    """
    Format data as a Server-Sent Event.
    
    Args:
        event_type: Type of the event
        data: Event data
        
    Returns:
        Formatted SSE string
    """
    event_data = json.dumps({"type": event_type, **data})
    return f"data: {event_data}\n\n"
