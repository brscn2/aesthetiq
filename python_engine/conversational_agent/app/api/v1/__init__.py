"""API v1 module."""
from fastapi import APIRouter

from app.api.v1.endpoints import health, chat

router = APIRouter()
router.include_router(health.router, tags=["health"])
router.include_router(chat.router, prefix="/agent", tags=["conversational-agent"])
