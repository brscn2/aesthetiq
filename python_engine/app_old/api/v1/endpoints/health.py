"""Health check endpoint."""
from fastapi import APIRouter, status
from datetime import datetime, timezone

from app.core.config import get_settings
from app.core.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)
settings = get_settings()


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """
    Health check endpoint for monitoring and load balancers.
    
    Returns:
        Health status with timestamp
    """
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.get("/ready", status_code=status.HTTP_200_OK)
async def readiness_check():
    """
    Readiness check endpoint for Kubernetes and orchestration.
    
    Returns:
        Readiness status with service checks
    """
    # TODO: Add actual service checks (database, external APIs, etc.)
    checks = {
        "database": "not_configured",  # Check MongoDB connection
        "llm_service": "not_configured",  # Check LLM API availability
        "cache": "not_configured",  # Check Redis connection
    }
    
    return {
        "status": "ready",
        "checks": checks,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
