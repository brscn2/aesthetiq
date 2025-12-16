"""ML routes - proxied to face_analysis service."""
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
async def proxy_ml_requests(request: Request, path: str):
    """
    Proxy all /api/v1/ml/* requests to the face_analysis service.
    
    Args:
        request: Incoming request
        path: Path after /api/v1/ml/
        
    Returns:
        Response from face_analysis service
    """
    target_url = f"{settings.FACE_ANALYSIS_URL}/api/v1/ml/{path}"
    return await proxy.proxy_request(
        request=request,
        target_url=target_url,
        timeout=settings.ML_SERVICE_TIMEOUT
    )
