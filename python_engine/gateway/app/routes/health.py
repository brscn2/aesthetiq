"""Health check routes for the gateway."""
from fastapi import APIRouter, status
from datetime import datetime, timezone
import httpx
import logging

from app.config import get_settings

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


async def check_service_health(url: str, timeout: float = 5.0) -> dict:
    """Check health of an internal service."""
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(f"{url}/api/v1/health")
            if response.status_code == 200:
                return {"status": "healthy", "data": response.json()}
            return {"status": "unhealthy", "error": f"Status {response.status_code}"}
    except httpx.TimeoutException:
        return {"status": "unhealthy", "error": "timeout"}
    except httpx.ConnectError:
        return {"status": "unhealthy", "error": "connection_refused"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """
    Aggregated health check for all services.
    
    Returns:
        Combined health status of gateway and all internal services
    """
    # Check internal services
    face_analysis_health = await check_service_health(settings.FACE_ANALYSIS_URL)
    recommender_health = await check_service_health(settings.CLOTHING_RECOMMENDER_URL)
    
    # Determine overall status
    all_healthy = (
        face_analysis_health["status"] == "healthy" and
        recommender_health["status"] == "healthy"
    )
    
    if all_healthy:
        overall_status = "healthy"
    elif face_analysis_health["status"] == "healthy" or recommender_health["status"] == "healthy":
        overall_status = "degraded"
    else:
        overall_status = "unhealthy"
    
    return {
        "status": overall_status,
        "gateway": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "services": {
            "face_analysis": face_analysis_health,
            "clothing_recommender": recommender_health
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.get("/ready", status_code=status.HTTP_200_OK)
async def readiness_check():
    """
    Readiness check for orchestration (Kubernetes, etc.).
    
    Returns:
        Readiness status
    """
    # Check if at least one backend service is available
    face_analysis_health = await check_service_health(settings.FACE_ANALYSIS_URL)
    recommender_health = await check_service_health(settings.CLOTHING_RECOMMENDER_URL)
    
    any_ready = (
        face_analysis_health["status"] == "healthy" or
        recommender_health["status"] == "healthy"
    )
    
    return {
        "status": "ready" if any_ready else "not_ready",
        "checks": {
            "face_analysis": face_analysis_health["status"],
            "clothing_recommender": recommender_health["status"]
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
