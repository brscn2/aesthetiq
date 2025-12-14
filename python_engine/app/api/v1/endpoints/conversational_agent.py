"""Conversational agent endpoint."""
from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from fastapi.responses import StreamingResponse
from typing import Optional, AsyncIterator
import json
from datetime import datetime, timezone

from app.core.logger import get_logger
from app.schemas.requests import ConversationRequest, ConversationStreamRequest
from app.schemas.responses import ConversationResponse, ConversationStreamResponse
from app.agents.conversational_agent import ConversationalAgent

router = APIRouter()
logger = get_logger(__name__)

# Initialize agent (will be dependency-injected in production)
agent = ConversationalAgent()


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
        logger.info(
            "Processing chat request",
            extra={
                "user_id": request.user_id,
                "session_id": request.session_id,
                "message_length": len(request.message)
            }
        )
        
        # Process the conversation
        response = await agent.process_message(
            message=request.message,
            user_id=request.user_id,
            session_id=request.session_id,
            context=request.context
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
            # Generate session ID
            session_id = request.session_id or f"{request.user_id}_{datetime.now(timezone.utc).timestamp()}"
            
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
            async for event in agent.stream_message(
                message=request.message,
                user_id=request.user_id,
                session_id=session_id,
                context=request.context
            ):
                event_data = event.to_dict()
                yield f"data: {json.dumps(event_data)}\n\n"
            
            logger.info("Streaming chat completed successfully")
            
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


async def log_conversation(user_id: str, message: str, response: dict):
    """
    Background task to log conversation for analytics.
    
    Args:
        user_id: User identifier
        message: User message
        response: Agent response
    """
    # TODO: Implement actual logging to database or analytics service
    logger.debug(
        "Logging conversation",
        extra={
            "user_id": user_id,
            "message_length": len(message),
            "response_length": len(response.get("message", ""))
        }
    )
