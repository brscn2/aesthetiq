"""Try-On routes - proxied to try-on service."""
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
async def proxy_try_on_requests(request: Request, path: str):
    """
    Proxy all /api/v1/try-on/* requests to the try-on service.
    
    Args:
        request: Incoming request
        path: Path after /api/v1/try-on/
        
    Returns:
        Response from try-on service
    """
    # Try-on service endpoints are at /api/v1/try-on/, so we append path
    target_url = f"{settings.TRY_ON_SERVICE_URL}/{path}"
    return await proxy.proxy_request(
        request=request,
        target_url=target_url,
        timeout=settings.LLM_SERVICE_TIMEOUT  # Use longer timeout for image generation
    )
