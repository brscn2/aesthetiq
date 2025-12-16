"""API v1 router configuration for Fashion Expert."""
from fastapi import APIRouter

from app.api.v1.endpoints import health, face_analysis

api_router = APIRouter()

api_router.include_router(
    health.router,
    tags=["health"]
)

api_router.include_router(
    face_analysis.router,
    prefix="/ml",
    tags=["machine-learning"]
)
