"""Health check endpoint for Face Analysis service.

Reasoning:
- Docker/Kubernetes health checks should reflect whether the service can
    actually serve requests. For this service, that means the model pipeline
    has been initialized.
"""
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
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
    # Import here to avoid circular imports at module load time.
    from app.api.v1.endpoints.face_analysis import face_analysis_service

    if not face_analysis_service:
        # Important: docker-compose uses `curl -f` against this endpoint.
        # Returning 503 marks the container unhealthy if initialization failed.
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "app_name": settings.APP_NAME,
                "version": settings.APP_VERSION,
                "detail": "Model service not initialized",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )

    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/ready", status_code=status.HTTP_200_OK)
async def readiness_check():
    """
    Readiness check endpoint for Kubernetes and orchestration.
    
    Returns:
        Readiness status with service checks
    """
    from app.api.v1.endpoints.face_analysis import face_analysis_service
    
    checks = {
        "face_analysis_service": "ready" if face_analysis_service else "not_initialized",
    }
    
    all_ready = all(v == "ready" for v in checks.values())
    
    return {
        "status": "ready" if all_ready else "not_ready",
        "checks": checks,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
