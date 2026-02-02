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
from app.services.backend_client import BackendClient, InvalidTokenError
from app.services.tracing.langfuse_service import get_tracing_service

router = APIRouter()
settings = get_settings()
logger = get_logger(__name__)


async def save_workflow_context_to_session(
    session_service,
    session_id: str,
    final_state: Dict[str, Any],
    request_message: Optional[str] = None,
) -> None:
    """
    Save workflow context (pending clarification or completed workflow) to session metadata.
    
    This helper centralizes the context saving logic used by both chat() and chat_stream().
    
    Args:
        session_service: SessionService instance
        session_id: The session identifier
        final_state: Final state from workflow execution
        request_message: Optional original user message (for streaming endpoint limitations)
    """
    workflow_status = final_state.get("workflow_status", "completed")
    
    if workflow_status == "awaiting_clarification":
        try:
            from app.workflows.state import create_clarification_context
            clarification_context = create_clarification_context(final_state)
            await session_service.save_pending_context(
                session_id=session_id,
                context=clarification_context,
            )
        except Exception as context_error:
            logger.error(f"Failed to save pending context: {context_error}")
            # Don't fail the request if context save fails
    
    elif workflow_status == "completed":
        try:
            # Use 'or []' to handle case where retrieved_items is explicitly None
            retrieved_items = final_state.get("retrieved_items") or []
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
                    session_id=session_id,
                    context=workflow_context,
                )
        except Exception as context_error:
            logger.error(f"Failed to save workflow context: {context_error}")
            # Don't fail the request if context save fails


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
        
    Raises:
        HTTPException: 401 if auth token is invalid/expired, 500 for other errors
    """
    logger.info(f"Chat request from user {request.user_id}")
    
    # Log token reception
    if x_auth_token:
        logger.debug(f"Received auth token for user {request.user_id} (length: {len(x_auth_token)})")
    else:
        logger.warning(f"No auth token received for user {request.user_id} - session saves will require token")
    
    # Validate token early if provided (fail fast for auth issues)
    try:
        backend_client = BackendClient(auth_token=x_auth_token) if x_auth_token else None
        
        # Validate token with backend to ensure it's accepted by Clerk
        if backend_client:
            logger.debug(f"Validating token with backend for user {request.user_id}")
            await backend_client.validate_token_with_backend()
            logger.debug(f"Token validation successful for user {request.user_id}")
    except InvalidTokenError as e:
        logger.error(f"Token validation failed for user {request.user_id}: {e}")
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token. Please log in again."
        )
    
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
            response_item_ids = final_state.get("response_item_ids") or []
            retrieved_items = final_state.get("retrieved_items") or []
            if response_item_ids:
                response_item_ids_set = {str(item_id) for item_id in response_item_ids}
                retrieved_items = [
                    item
                    for item in retrieved_items
                    if str(item.get("id") or item.get("_id")) in response_item_ids_set
                ]

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
                    "items": retrieved_items,
                    "response_item_ids": response_item_ids,
                },
            )
        except Exception as save_error:
            logger.error(f"Failed to save conversation turn: {save_error}")
            # Don't fail the request if save fails, but log it
        
        # Update title if still default (smart naming)
        # Only update on first message (check message count before saving)
        try:
            logger.debug(f"Non-streaming: Checking title update for session {session_data.session_id}, current title: '{session_data.title}'")
            # Check message count to determine if this is the first user message
            messages = session_data.messages or []
            user_message_count = len([m for m in messages if m.get("role") == "user"])
            logger.debug(f"Non-streaming: Session {session_data.session_id} - user messages: {user_message_count}")
            
            # Only update title if this is the first user message (user_message_count == 0 before saving)
            # After saving, it will be 1, so we check before
            if user_message_count == 0:
                await session_service.update_title_if_default(
                    session_id=session_data.session_id,
                    user_message=request.message,
                    current_title=session_data.title,
                )
            else:
                logger.debug(f"Non-streaming: Skipping title update - not first message (user_message_count: {user_message_count})")
        except Exception as title_error:
            logger.warning(f"Failed to update session title: {title_error}", exc_info=True)
            # Non-critical, continue
        
        # Save workflow context (pending clarification or completed workflow)
        await save_workflow_context_to_session(
            session_service,
            session_data.session_id,
            final_state,
            request.message,
        )
        
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
        
        # Check if this is an authentication error
        if isinstance(e, InvalidTokenError):
            raise HTTPException(
                status_code=401,
                detail="Authentication failed. Please log in again."
            )
        
        # Generate user-friendly error response
        error_response = "I apologize, but I encountered an issue processing your request. Please try again or rephrase your question."
        
        # Try to save error message to session if we have session_id and auth token
        if request.session_id and x_auth_token:
            try:
                backend_client = BackendClient(auth_token=x_auth_token)
                session_service = get_session_service(backend_client=backend_client)
                await session_service.save_conversation_turn(
                    session_id=request.session_id,
                    user_message=request.message,
                    assistant_message=error_response,
                    assistant_metadata={"error": str(e), "error_type": type(e).__name__},
                )
            except InvalidTokenError:
                logger.warning("Cannot save error message - authentication token invalid")
            except Exception as save_error:
                logger.error(f"Failed to save error message: {save_error}")
        elif request.session_id:
            logger.warning("Cannot save error message - no auth token provided")
        
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
        
    Raises:
        HTTPException: 401 if auth token is invalid/expired
    """
    logger.info(f"Streaming chat request from user {request.user_id}")
    
    # Log token reception
    if x_auth_token:
        logger.debug(f"Received auth token for user {request.user_id} (length: {len(x_auth_token)})")
    else:
        logger.warning(f"No auth token received for user {request.user_id} - session saves will require token")
    
    # Validate token early if provided (fail fast for auth issues)
    try:
        backend_client = BackendClient(auth_token=x_auth_token) if x_auth_token else None
        
        # Validate token with backend to ensure it's accepted by Clerk
        if backend_client:
            logger.debug(f"Validating token with backend for user {request.user_id}")
            await backend_client.validate_token_with_backend()
            logger.debug(f"Token validation successful for user {request.user_id}")
    except InvalidTokenError as e:
        logger.error(f"Token validation failed for user {request.user_id}: {e}")
        async def error_stream():
            yield _format_sse_event("error", {
                "message": "Invalid or expired authentication token. Please log in again.",
                "type": "auth_error"
            })
        return StreamingResponse(error_stream(), media_type="text/event-stream", status_code=401)
    
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
                    response_item_ids = event.content.get("response_item_ids", [])
                    final_state = {
                        "workflow_status": event.content.get("workflow_status", "completed"),
                        "intent": final_intent,
                        "retrieved_items": event.content.get("items", []),
                        "response_item_ids": response_item_ids,
                        "extracted_filters": None,  # Not in done event, would need to track
                        "style_dna": None,  # Not in done event, would need to track
                        "user_profile": None,  # Not in done event, would need to track
                        "search_scope": None,  # Not in done event, would need to track
                    }
            
            # Always save the conversation turn, even if response is empty
            try:
                logger.info(f"Streaming: Saving conversation turn for session {session_data.session_id}")
                response_to_save = final_response or "I apologize, but I encountered an issue processing your request. Please try again."
                retrieved_items = (final_state or {}).get("retrieved_items") or []
                response_item_ids = (final_state or {}).get("response_item_ids") or []
                if response_item_ids:
                    response_item_ids_set = {str(item_id) for item_id in response_item_ids}
                    retrieved_items = [
                        item
                        for item in retrieved_items
                        if str(item.get("id") or item.get("_id")) in response_item_ids_set
                    ]
                await session_service.save_conversation_turn(
                    session_id=session_data.session_id,
                    user_message=request.message,
                    assistant_message=response_to_save,
                    user_metadata={},
                    assistant_metadata={
                        "intent": final_intent,
                        "streaming": True,
                        "workflow_status": final_state.get("workflow_status", "completed") if final_state else "completed",
                        "items": retrieved_items,
                        "response_item_ids": response_item_ids,
                    },
                )
                logger.info(f"Streaming: Successfully saved conversation turn for session {session_data.session_id}")
            except InvalidTokenError as token_error:
                logger.error(f"Cannot save conversation turn - authentication failed: {token_error}")
                # Token error is critical - user needs to re-authenticate
                yield _format_sse_event("error", {
                    "type": "auth_error",
                    "message": "Authentication token expired. Please log in again."
                })
            except Exception as save_error:
                logger.error(f"Failed to save conversation turn: {save_error}")
                # Log but don't fail the stream
                logger.warning("Conversation will not be saved to history")
            
            # Update title if still default (smart naming)
            # Only update on first message (check message count before saving)
            try:
                logger.info(f"Streaming: Starting title update check for session {session_data.session_id}")
                # Need to reload session to get current title and message count
                updated_session = await session_service.backend_client.get_session(session_data.session_id)
                current_title = updated_session.get("title", "New Conversation")
                messages = updated_session.get("messages") or []
                # Count user messages (excluding the one we just saved)
                user_message_count = len([m for m in messages if m.get("role") == "user"])
                logger.info(f"Streaming: Session {session_data.session_id} - title: '{current_title}', user messages: {user_message_count}")
                
                # Only update title if this is the first user message (user_message_count <= 1)
                # This ensures we only update on the very first message
                if user_message_count <= 1:
                    logger.info(f"Streaming: Updating title for first message in session {session_data.session_id}")
                    await session_service.update_title_if_default(
                        session_id=session_data.session_id,
                        user_message=request.message,
                        current_title=current_title,
                    )
                else:
                    logger.info(f"Streaming: Skipping title update - not first message (user_message_count: {user_message_count})")
                logger.info(f"Streaming: Completed title update check for session {session_data.session_id}")
            except InvalidTokenError:
                logger.warning("Cannot update session title - authentication token invalid")
            except Exception as title_error:
                logger.warning(f"Failed to update session title: {title_error}", exc_info=True)
                # Non-critical, continue
            
            # Save workflow context (pending clarification or completed workflow)
            # Note: Streaming endpoint has incomplete state (limitation of done event),
            # but helper function will save what's available
            if final_state:
                await save_workflow_context_to_session(
                    session_service,
                    session_data.session_id,
                    final_state,
                    request.message,
                )
            
        except Exception as e:
            logger.error(f"Streaming error: {e}", exc_info=True)
            
            # Check if this is an authentication error
            if isinstance(e, InvalidTokenError):
                error_message = "Authentication token expired. Please log in again."
                yield _format_sse_event("error", {
                    "type": "auth_error",
                    "message": error_message
                })
            else:
                error_message = "I apologize, but I encountered an issue processing your request. Please try again."
                yield _format_sse_event("error", {"message": error_message})
                
                # Try to save error message to session (only if not auth error)
                if session_id and x_auth_token:
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
                        
                        # Update title if still default (smart naming) - even on error
                        try:
                            logger.info(f"Streaming (error path): Starting title update check for session {session_id}")
                            updated_session = await session_service.backend_client.get_session(session_id)
                            current_title = updated_session.get("title", "New Conversation")
                            messages = updated_session.get("messages") or []
                            user_message_count = len([m for m in messages if m.get("role") == "user"])
                            logger.info(f"Streaming (error path): Session {session_id} - title: '{current_title}', user messages: {user_message_count}")
                            
                            if user_message_count <= 1:
                                logger.info(f"Streaming (error path): Updating title for first message in session {session_id}")
                                await session_service.update_title_if_default(
                                    session_id=session_id,
                                    user_message=request.message,
                                    current_title=current_title,
                                )
                            else:
                                logger.info(f"Streaming (error path): Skipping title update - not first message (user_message_count: {user_message_count})")
                        except Exception as title_error:
                            logger.warning(f"Failed to update session title in error handler: {title_error}", exc_info=True)
                    except InvalidTokenError:
                        logger.warning("Cannot save error message - authentication token invalid")
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
