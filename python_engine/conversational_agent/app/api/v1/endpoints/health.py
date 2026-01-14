"""Health check endpoints."""
from fastapi import APIRouter
from typing import Dict, Any

from app.core.config import get_settings

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
    # Add checks for dependencies when implemented
    # - Backend connectivity
    # - MCP server connectivity
    # - LLM service connectivity
    
    return {
        "status": "ready",
        "checks": {
            "workflow": "available",
            "backend": "not_checked",  # Will be implemented in Issue 5
            "mcp_servers": "not_checked",  # Will be implemented in Issue 2
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
