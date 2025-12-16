"""Agent routes - proxied to clothing_recommender service."""
from fastapi import APIRouter, Request

from app.config import get_settings
from app.proxy import proxy

router = APIRouter()
settings = get_settings()


@router.post("/chat")
async def proxy_chat(request: Request):
    """
    Proxy /api/v1/agent/chat to the clothing_recommender service.
    
    Args:
        request: Incoming request
        
    Returns:
        Response from clothing_recommender service
    """
    target_url = f"{settings.CLOTHING_RECOMMENDER_URL}/api/v1/agent/chat"
    return await proxy.proxy_request(
        request=request,
        target_url=target_url,
        timeout=settings.LLM_SERVICE_TIMEOUT
    )


@router.post("/chat/stream")
async def proxy_chat_stream(request: Request):
    """
    Proxy streaming /api/v1/agent/chat/stream to the clothing_recommender service.
    
    Args:
        request: Incoming request
        
    Returns:
        Streaming response from clothing_recommender service
    """
    target_url = f"{settings.CLOTHING_RECOMMENDER_URL}/api/v1/agent/chat/stream"
    return await proxy.proxy_streaming_request(
        request=request,
        target_url=target_url,
        timeout=settings.LLM_SERVICE_TIMEOUT
    )


@router.api_route(
    "/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    include_in_schema=False
)
async def proxy_agent_requests(request: Request, path: str):
    """
    Proxy all other /api/v1/agent/* requests to the clothing_recommender service.
    
    Args:
        request: Incoming request
        path: Path after /api/v1/agent/
        
    Returns:
        Response from clothing_recommender service
    """
    target_url = f"{settings.CLOTHING_RECOMMENDER_URL}/api/v1/agent/{path}"
    return await proxy.proxy_request(
        request=request,
        target_url=target_url,
        timeout=settings.LLM_SERVICE_TIMEOUT
    )
