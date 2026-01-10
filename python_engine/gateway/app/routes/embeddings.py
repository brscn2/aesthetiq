"""Embedding routes - proxied to embedding service."""
from fastapi import APIRouter, Request

from app.config import get_settings
from app.proxy import proxy

router = APIRouter()
settings = get_settings()


@router.api_route(
    "/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    include_in_schema=False
)
async def proxy_embedding_requests(request: Request, path: str):
    """
    Proxy all /api/v1/embeddings/* requests to the embedding service.
    
    Args:
        request: Incoming request
        path: Path after /api/v1/embeddings/
        
    Returns:
        Response from embedding service
    """
    # Embedding service endpoints are at root (e.g. /embed/text), so we append path directly
    target_url = f"{settings.EMBEDDING_SERVICE_URL}/{path}"
    return await proxy.proxy_request(
        request=request,
        target_url=target_url,
        timeout=settings.ML_SERVICE_TIMEOUT
    )
