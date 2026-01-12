"""Recommender API endpoints.

Provides clothing recommendation endpoints with both streaming and non-streaming options.
"""
from fastapi import APIRouter, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from typing import AsyncIterator
import json
from datetime import datetime, timezone

from app.core.logger import get_logger
from app.core.config import get_settings
from app.schemas.requests import RecommendRequest
from app.schemas.responses import RecommendResponse
from app.agents.recommender import RecommenderGraph

router = APIRouter()
logger = get_logger(__name__)
settings = get_settings()


def _get_recommender(request: Request) -> RecommenderGraph:
    """
    Fetch the initialized recommender from app state.
    
    The recommender is initialized during app startup (lifespan).
    """
    recommender = getattr(request.app.state, "recommender_graph", None)
    if not recommender:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Recommender agent not initialized",
        )
    return recommender


@router.post("", response_model=RecommendResponse, status_code=status.HTTP_200_OK)
async def recommend(
    http_request: Request,
    request: RecommendRequest,
):
    """
    Get clothing recommendations based on user query.
    
    This endpoint analyzes the user's request, searches the wardrobe catalog
    using semantic search, and returns matching item IDs.
    
    Args:
        request: Recommendation request with message and user info
        
    Returns:
        RecommendResponse with item_ids and metadata
    """
    try:
        logger.info(
            "Processing recommendation request",
            extra={
                "user_id": request.user_id,
                "session_id": request.session_id,
                "message_length": len(request.message),
            }
        )
        
        recommender = _get_recommender(http_request)
        
        result = await recommender.recommend(
            user_query=request.message,
            user_id=request.user_id,
            session_id=request.session_id or f"rec_{datetime.now().strftime('%Y%m%d%H%M%S')}",
        )
        
        return RecommendResponse(
            item_ids=result["item_ids"],
            message=result.get("message"),
            session_id=result["session_id"],
            iterations=result.get("iterations", 1),
            metadata=result.get("metadata", {}),
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Recommendation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Recommendation failed: {str(e)}",
        )


@router.post("/stream", status_code=status.HTTP_200_OK)
async def recommend_stream(
    http_request: Request,
    request: RecommendRequest,
):
    """
    Stream clothing recommendations with progress updates.
    
    Returns Server-Sent Events (SSE) stream with event types:
    - stage: Progress updates (analyzing, searching, verifying, etc.)
    - result: Final item IDs
    - done: Stream complete
    - error: Error occurred
    
    Args:
        request: Recommendation request
        
    Returns:
        StreamingResponse with text/event-stream content type
    """
    async def event_generator() -> AsyncIterator[str]:
        """Generate SSE events from recommender workflow."""
        try:
            logger.info(
                "Processing streaming recommendation",
                extra={
                    "user_id": request.user_id,
                    "session_id": request.session_id,
                }
            )
            
            session_id = request.session_id or f"rec_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            # Send initial metadata
            init_data = {
                "type": "metadata",
                "session_id": session_id,
                "user_id": request.user_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            yield f"data: {json.dumps(init_data)}\n\n"
            
            # Stream through workflow
            recommender = _get_recommender(http_request)
            
            async for event in recommender.recommend_stream(
                user_query=request.message,
                user_id=request.user_id,
                session_id=session_id,
            ):
                yield event.to_sse()
            
            logger.info("Streaming recommendation completed")
            
        except Exception as e:
            logger.error(f"Streaming recommendation failed: {e}", exc_info=True)
            error_data = {
                "type": "error",
                "error": str(e),
            }
            yield f"event: error\ndata: {json.dumps(error_data)}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
