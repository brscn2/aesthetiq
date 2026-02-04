"""API v1 router."""
from fastapi import APIRouter
from app.api.v1.endpoints import try_on

api_router = APIRouter()

# Include try-on endpoints
api_router.include_router(
    try_on.router,
    prefix="/try-on",
    tags=["try-on"]
)
