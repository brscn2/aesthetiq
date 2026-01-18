"""Health check endpoints."""
from fastapi import APIRouter
from typing import Dict, Any

from app.core.config import get_settings
from app.mcp.tools import is_mcp_connected

router = APIRouter()
settings = get_settings()


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    Health check endpoint.
    
    Returns:
        Health status information
    """
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@router.get("/health/ready")
async def readiness_check() -> Dict[str, Any]:
    """
    Readiness check endpoint.
    
    Checks if the service is ready to accept requests.
    
    Returns:
        Readiness status
    """
    # Check MCP server connectivity
    mcp_status = "connected" if is_mcp_connected() else "disconnected"
    
    # Determine overall readiness
    # Service can still function without MCP (graceful degradation)
    status = "ready"
    
    return {
        "status": status,
        "checks": {
            "workflow": "available",
            "backend": "not_checked",  # Will be implemented in Issue 5
            "mcp_servers": mcp_status,
        },
    }


@router.get("/health/live")
async def liveness_check() -> Dict[str, str]:
    """
    Liveness check endpoint.
    
    Simple check to verify the service is running.
    
    Returns:
        Liveness status
    """
    return {"status": "alive"}
