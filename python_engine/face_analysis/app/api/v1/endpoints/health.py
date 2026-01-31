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
        
    Note:
        Service is considered healthy if ResNet model is loaded (required).
        Face shape classifier is optional and its absence does not affect health status.
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
    
    # Check if ResNet model is loaded (required for service to be healthy)
    has_resnet = hasattr(face_analysis_service, 'resnet') and face_analysis_service.resnet is not None
    has_face_shape = hasattr(face_analysis_service, 'face_shape_classifier') and face_analysis_service.face_shape_classifier is not None
    
    if not has_resnet:
        # ResNet is required - service is unhealthy without it
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "app_name": settings.APP_NAME,
                "version": settings.APP_VERSION,
                "detail": "ResNet model not loaded (required)",
                "models": {
                    "resnet": "not_loaded",
                    "face_shape_classifier": "not_loaded" if not has_face_shape else "loaded"
                },
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )
    
    # Service is healthy if ResNet is loaded (face shape classifier is optional)
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "models": {
            "resnet": "loaded",
            "face_shape_classifier": "loaded" if has_face_shape else "not_loaded"
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/ready", status_code=status.HTTP_200_OK)
async def readiness_check():
    """
    Readiness check endpoint for Kubernetes and orchestration.
    
    Returns:
        Readiness status with service checks
        
    Note:
        Service is ready if ResNet model is loaded (required).
        Face shape classifier is optional.
    """
    from app.api.v1.endpoints.face_analysis import face_analysis_service
    
    if not face_analysis_service:
        return {
            "status": "not_ready",
            "checks": {
                "face_analysis_service": "not_initialized"
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    has_resnet = hasattr(face_analysis_service, 'resnet') and face_analysis_service.resnet is not None
    has_face_shape = hasattr(face_analysis_service, 'face_shape_classifier') and face_analysis_service.face_shape_classifier is not None
    
    checks = {
        "face_analysis_service": "ready" if face_analysis_service else "not_initialized",
        "resnet_model": "ready" if has_resnet else "not_loaded",
        "face_shape_classifier": "ready" if has_face_shape else "not_loaded"
    }
    
    # Service is ready if ResNet is loaded (required)
    all_ready = has_resnet
    
    return {
        "status": "ready" if all_ready else "not_ready",
        "checks": checks,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
