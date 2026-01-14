"""Chat endpoints for the conversational agent."""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import json
import asyncio

from app.core.config import get_settings
from app.core.logger import get_logger
from app.workflows.main_workflow import run_workflow, get_workflow
from app.services.session.session_service import get_session_service
from app.services.tracing.langfuse_service import get_tracing_service

router = APIRouter()
settings = get_settings()
logger = get_logger(__name__)


class ChatRequest(BaseModel):
    """Request body for chat endpoints."""
    user_id: str = Field(..., description="User identifier")
    session_id: Optional[str] = Field(None, description="Session identifier (creates new if not provided)")
    message: str = Field(..., description="User message", min_length=1, max_length=10000)
    
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
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Non-streaming chat endpoint.
    
    Processes the user message and returns the complete response.
    
    Args:
        request: Chat request with user_id, session_id, and message
        
    Returns:
        ChatResponse with the assistant's response
    """
    logger.info(f"Chat request from user {request.user_id}")
    
    # Get services
    session_service = get_session_service()
    tracing_service = get_tracing_service()
    
    try:
        # Load or create session
        session_data = await session_service.load_session(
            user_id=request.user_id,
            session_id=request.session_id,
        )
        
        # Start trace
        trace_id = tracing_service.start_trace(
            user_id=request.user_id,
            session_id=session_data.session_id,
            name="chat",
            metadata={"message_length": len(request.message)},
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
        )
        
        # Get the response
        response_text = final_state.get("final_response", "")
        
        # Save the conversation turn
        await session_service.save_conversation_turn(
            session_id=session_data.session_id,
            user_message=request.message,
            assistant_message=response_text,
            user_metadata={"trace_id": trace_id},
            assistant_metadata={
                "trace_id": trace_id,
                "intent": final_state.get("intent"),
                "iteration": final_state.get("iteration", 0),
            },
        )
        
        # End trace
        tracing_service.end_trace(
            trace_id=trace_id,
            output=response_text[:500],  # Truncate for trace
            metadata={"intent": final_state.get("intent")},
        )
        
        return ChatResponse(
            session_id=session_data.session_id,
            response=response_text,
            intent=final_state.get("intent"),
            metadata={
                "iteration": final_state.get("iteration", 0),
                "search_sources": final_state.get("search_sources_used", []),
            },
        )
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest) -> StreamingResponse:
    """
    Streaming chat endpoint using Server-Sent Events (SSE).
    
    Streams the response as it's generated.
    
    Args:
        request: Chat request with user_id, session_id, and message
        
    Returns:
        StreamingResponse with SSE events
    """
    logger.info(f"Streaming chat request from user {request.user_id}")
    
    async def generate_stream():
        """Generate SSE stream."""
        session_service = get_session_service()
        tracing_service = get_tracing_service()
        
        try:
            # Load or create session
            session_data = await session_service.load_session(
                user_id=request.user_id,
                session_id=request.session_id,
            )
            
            # Send metadata event
            yield _format_sse_event("metadata", {
                "session_id": session_data.session_id,
                "user_id": request.user_id,
            })
            
            # Start trace
            trace_id = tracing_service.start_trace(
                user_id=request.user_id,
                session_id=session_data.session_id,
                name="chat_stream",
            )
            
            # Send status event
            yield _format_sse_event("status", {"content": "Processing your request..."})
            
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
            )
            
            # Get the response
            response_text = final_state.get("final_response", "")
            
            # Stream the response in chunks (simulated for now)
            # In Issue 3, this will be real LLM streaming
            chunk_size = 50
            for i in range(0, len(response_text), chunk_size):
                chunk = response_text[i:i + chunk_size]
                yield _format_sse_event("chunk", {"content": chunk})
                await asyncio.sleep(0.01)  # Small delay for streaming effect
            
            # Save the conversation turn
            await session_service.save_conversation_turn(
                session_id=session_data.session_id,
                user_message=request.message,
                assistant_message=response_text,
                user_metadata={"trace_id": trace_id},
                assistant_metadata={
                    "trace_id": trace_id,
                    "intent": final_state.get("intent"),
                },
            )
            
            # End trace
            tracing_service.end_trace(
                trace_id=trace_id,
                output=response_text[:500],
            )
            
            # Send done event
            yield _format_sse_event("done", {
                "message": response_text,
                "intent": final_state.get("intent"),
                "session_id": session_data.session_id,
            })
            
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield _format_sse_event("error", {"message": str(e)})
    
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
