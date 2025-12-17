"""Conversational agent endpoints.

Design notes / reasoning:
- The agent is created during application startup (lifespan) and stored on `app.state`.
    This ensures we don't accidentally create multiple LLM clients/workflows.
- Conversation logging is off by default because it may contain PII.
"""

from fastapi import APIRouter, HTTPException, status, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from starlette.concurrency import run_in_threadpool
from typing import Optional, AsyncIterator
import json
import uuid
import os
from datetime import datetime, timezone, timedelta

from app.core.logger import get_logger
from app.core.config import get_settings
from app.utils.helpers import generate_session_id, validate_session_id
from app.schemas.requests import ConversationRequest, ConversationStreamRequest
from app.schemas.responses import ConversationResponse, ConversationStreamResponse
from app.agents.conversational_agent import ConversationalAgent

router = APIRouter()
logger = get_logger(__name__)
settings = get_settings()


def _get_agent(request: Request) -> ConversationalAgent:
    """Fetch the initialized agent from app state.

    Reasoning:
    - Avoids duplicate initialization (startup owns lifecycle).
    - Provides a single place to validate state.
    """
    agent = getattr(request.app.state, "conversational_agent", None)
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Conversational agent not initialized",
        )
    return agent


def _ensure_session_id(session_id: Optional[str], user_id: str) -> str:
    """
    Validate provided session_id or generate a new one.
    
    Args:
        session_id: Optional session ID from request
        user_id: User identifier for generation
        
    Returns:
        Valid session ID string
    """
    if session_id and not validate_session_id(session_id):
        logger.warning(f"Invalid session_id format: {session_id}. Generating new one.")
        session_id = None
        
    if not session_id:
        session_id = generate_session_id(user_id)
        
    return session_id


@router.post("/chat", response_model=ConversationResponse, status_code=status.HTTP_200_OK)
async def chat(
    http_request: Request,
    convo_request: ConversationRequest,
    background_tasks: BackgroundTasks
):
    """
    Send a message to the conversational agent and get a response.
    
    Args:
        request: Conversation request with message and optional context
        background_tasks: FastAPI background tasks for async operations
        
    Returns:
        Agent response with message and metadata
        
    Raises:
        HTTPException: If agent processing fails
    """
    try:
        # Validate or generate session_id
        session_id = _ensure_session_id(convo_request.session_id, convo_request.user_id)

        logger.info(
            "Processing chat request",
            extra={
                "user_id": convo_request.user_id,
                "session_id": session_id,
                "message_length": len(convo_request.message)
            }
        )
        
        # Process the conversation
        agent = _get_agent(http_request)
        response = await agent.process_message(
            message=convo_request.message,
            user_id=convo_request.user_id,
            session_id=session_id,
            context=convo_request.context
        )
        
        # Optional: Log to analytics in background (disabled by default)
        if settings.ENABLE_CHAT_LOGGING:
            background_tasks.add_task(
                log_conversation,
                user_id=convo_request.user_id,
                message=convo_request.message,
                response=response,
            )
        
        return ConversationResponse(
            message=response["message"],
            session_id=response["session_id"],
            metadata=response.get("metadata", {})
        )
        
    except Exception as e:
        logger.error(f"Error processing chat request: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process message: {str(e)}"
        )


@router.post("/chat/stream", status_code=status.HTTP_200_OK)
async def chat_stream(http_request: Request, stream_request: ConversationStreamRequest):
    """
    Stream responses from the conversational agent with workflow progress.
    
    Returns Server-Sent Events (SSE) stream with event types:
    - status: Workflow progress updates
    - chunk: Text content chunks
    - clothing_item: Individual clothing recommendations
    - metadata: Route and session info
    - done: Stream complete
    - error: Error occurred
    
    Args:
        request: Streaming conversation request
        
    Returns:
        StreamingResponse with text/event-stream content type
    """
    async def event_generator() -> AsyncIterator[str]:
        """Generate SSE events from workflow."""
        try:
            # Validate or generate session_id
            session_id = _ensure_session_id(stream_request.session_id, stream_request.user_id)
            
            logger.info(
                "Processing streaming chat request",
                extra={
                    "user_id": stream_request.user_id,
                    "session_id": session_id,
                    "message_length": len(stream_request.message)
                }
            )
            
            # Send initial metadata
            init_data = {
                "type": "metadata",
                "session_id": session_id,
                "user_id": stream_request.user_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            yield f"data: {json.dumps(init_data)}\n\n"
            
            # Stream through workflow with progress updates
            agent = _get_agent(http_request)
            full_response_message = ""
            async for event in agent.stream_message(
                message=stream_request.message,
                user_id=stream_request.user_id,
                session_id=session_id,
                context=stream_request.context
            ):
                event_data = event.to_dict()
                
                # Capture message from done event
                if event_data["type"] == "done":
                    full_response_message = event_data["content"].get("message", "")
                
                yield f"data: {json.dumps(event_data)}\n\n"
            
            logger.info("Streaming chat completed successfully")
            
            # Log conversation for analytics
            if settings.ENABLE_CHAT_LOGGING:
                await run_in_threadpool(
                    log_conversation,
                    user_id=stream_request.user_id,
                    message=stream_request.message,
                    response={
                        "message": full_response_message,
                        "session_id": session_id,
                    },
                )
            
        except Exception as e:
            logger.error(f"Error in stream: {str(e)}", exc_info=True)
            error_data = {
                "type": "error",
                "error": str(e)
            }
            yield f"data: {json.dumps(error_data)}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


def log_conversation(user_id: str, message: str, response: dict):
    """
    Background task to log conversation for analytics.
    
    Args:
        user_id: User identifier
        message: User message
        response: Agent response
    """
    timestamp_dt = datetime.now(timezone.utc)
    timestamp = timestamp_dt.isoformat()
    session_id = response.get("session_id")
    
    # Redact message content by default (reduces risk of storing PII).
    user_content = "[redacted]" if settings.CHAT_LOG_REDACT_CONTENT else message
    assistant_content = "[redacted]" if settings.CHAT_LOG_REDACT_CONTENT else response.get("message", "")

    user_record = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "user_id": user_id,
        "role": "user",
        "content": user_content,
        "timestamp": timestamp
    }
    
    assistant_record = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "user_id": user_id,
        "role": "assistant",
        "content": assistant_content,
        "timestamp": (timestamp_dt + timedelta(milliseconds=100)).isoformat(),
        "metadata": response.get("metadata", {})
    }
    
    try:
        os.makedirs(os.path.dirname(settings.CHAT_LOG_FILE), exist_ok=True)
        
        with open(settings.CHAT_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(user_record) + "\n")
            f.write(json.dumps(assistant_record) + "\n")
            
    except Exception as e:
        logger.error(f"Failed to write chat logs: {e}")
