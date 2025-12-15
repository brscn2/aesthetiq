"""Conversational agent endpoint."""
from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from fastapi.responses import StreamingResponse
from starlette.concurrency import run_in_threadpool
from typing import Optional, AsyncIterator
import json
import uuid
import os
from datetime import datetime, timezone, timedelta

from app.core.logger import get_logger
from app.utils.helpers import generate_session_id, validate_session_id
from app.schemas.requests import ConversationRequest, ConversationStreamRequest
from app.schemas.responses import ConversationResponse, ConversationStreamResponse
from app.agents.conversational_agent import ConversationalAgent

router = APIRouter()
logger = get_logger(__name__)

# Initialize agent (will be dependency-injected in production)
agent = ConversationalAgent()


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
    request: ConversationRequest,
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
        session_id = _ensure_session_id(request.session_id, request.user_id)

        logger.info(
            "Processing chat request",
            extra={
                "user_id": request.user_id,
                "session_id": session_id,
                "message_length": len(request.message)
            }
        )
        
        # Process the conversation
        # TEMPORARY WORKAROUND: Context (including chat history) is passed from the client.
        # TODO: Fetch chat history from database using session_id instead of trusting client input.
        # This prevents potential injection attacks and ensures data integrity.
        response = await agent.process_message(
            message=request.message,
            user_id=request.user_id,
            session_id=session_id,
            context=request.context  # TEMPORARY: Replace with DB fetch
        )
        
        # Optional: Log to analytics in background
        background_tasks.add_task(
            log_conversation,
            user_id=request.user_id,
            message=request.message,
            response=response
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
async def chat_stream(request: ConversationStreamRequest):
    """
    Stream responses from the conversational agent with workflow progress.
    
    Returns Server-Sent Events (SSE) stream with event types:
    - status: Workflow progress updates (e.g., "Analyzing request...", "Searching...")
    - chunk: Text content chunks (streaming LLM responses)
    - clothing_item: Individual clothing recommendations
    - metadata: Route and session info
    - done: Stream complete
    - error: Error occurred
    
    Args:
        request: Streaming conversation request
        
    Returns:
        StreamingResponse with text/event-stream content type
        
    Example:
        curl -X POST http://localhost:8000/api/v1/agent/chat/stream \\
          -H "Content-Type: application/json" \\
          -d '{"message": "I need pants for a wedding", "user_id": "user123"}'
    """
    async def event_generator() -> AsyncIterator[str]:
        """Generate SSE events from workflow."""
        try:
            # Validate or generate session_id
            session_id = _ensure_session_id(request.session_id, request.user_id)
            
            logger.info(
                "Processing streaming chat request",
                extra={
                    "user_id": request.user_id,
                    "session_id": session_id,
                    "message_length": len(request.message)
                }
            )
            
            # Send initial metadata
            init_data = {
                "type": "metadata",
                "session_id": session_id,
                "user_id": request.user_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            yield f"data: {json.dumps(init_data)}\n\n"
            
            # Stream through workflow with progress updates
            full_response_message = ""
            async for event in agent.stream_message(
                message=request.message,
                user_id=request.user_id,
                session_id=session_id,
                # TEMPORARY WORKAROUND: Context (including chat history) is passed from the client.
                # TODO: Fetch chat history from database using session_id instead of trusting client input.
                # This prevents potential injection attacks and ensures data integrity.
                context=request.context  # TEMPORARY: Replace with DB fetch
            ):
                event_data = event.to_dict()
                
                # Capture message from done event
                if event_data["type"] == "done":
                    full_response_message = event_data["content"].get("message", "")
                
                yield f"data: {json.dumps(event_data)}\n\n"
            
            logger.info("Streaming chat completed successfully")
            
            # Log conversation for analytics
            # Note: StreamingResponse doesn't support background_tasks param directly,
            # so we use run_in_threadpool to run the sync logging function.
            await run_in_threadpool(
                log_conversation,
                user_id=request.user_id,
                message=request.message,
                response={
                    "message": full_response_message,
                    "session_id": session_id
                }
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
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )


CHAT_LOG_FILE = "logs/chat_history.jsonl"

def log_conversation(user_id: str, message: str, response: dict):
    """
    Background task to log conversation for analytics.
    Writes to a JSONL file to simulate a database.
    
    Args:
        user_id: User identifier
        message: User message
        response: Agent response
    """
    timestamp_dt = datetime.now(timezone.utc)
    timestamp = timestamp_dt.isoformat()
    session_id = response.get("session_id")
    
    # 1. User Record
    user_record = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "user_id": user_id,
        "role": "user",
        "content": message,
        "timestamp": timestamp
    }
    
    # 2. Assistant Record (add small delta to ensure ordering)
    assistant_record = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "user_id": user_id,
        "role": "assistant",
        "content": response.get("message", ""),
        "timestamp": (timestamp_dt + timedelta(milliseconds=100)).isoformat(),
        "metadata": response.get("metadata", {})
    }
    
    try:
        # Ensure directory exists
        os.makedirs(os.path.dirname(CHAT_LOG_FILE), exist_ok=True)
        
        # Append to file
        with open(CHAT_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(user_record) + "\n")
            f.write(json.dumps(assistant_record) + "\n")
            
    except Exception as e:
        # Fallback to logger if file write fails
        logger.error(f"Failed to write chat logs: {e}")
