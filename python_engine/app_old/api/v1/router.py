"""API v1 router configuration."""
from fastapi import APIRouter

from app.api.v1.endpoints import health, conversational_agent, face_analysis

# Create main v1 router
api_router = APIRouter()

# Include endpoint routers
api_router.include_router(
    health.router,
    tags=["health"]
)

api_router.include_router(
    conversational_agent.router,
    prefix="/agent",
    tags=["conversational-agent"]
)

api_router.include_router(
    face_analysis.router,
    prefix="/ml",
    tags=["machine-learning"]
)
