"""API v1 router configuration for Clothing Recommender."""
from fastapi import APIRouter

from app.api.v1.endpoints import health, conversational_agent

api_router = APIRouter()

api_router.include_router(
    health.router,
    tags=["health"]
)

api_router.include_router(
    conversational_agent.router,
    prefix="/agent",
    tags=["conversational-agent"]
)
