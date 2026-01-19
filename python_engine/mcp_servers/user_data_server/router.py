"""User Data MCP server router."""
from fastapi import APIRouter, HTTPException, Query

from mcp_servers.user_data_server import tools
from mcp_servers.user_data_server.schemas import (
    GetUserProfileRequest,
    GetUserProfileResponse,
)

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "healthy", "domain": "user-data"}


@router.post("/tools/get_user_profile", response_model=GetUserProfileResponse, operation_id="get_user_profile")
async def get_user_profile(req: GetUserProfileRequest):
    """
    Get user profile by clerkId.
    
    Returns basic user information including name, email, subscription status,
    and user settings (units, currency, theme, privacy preferences).
    
    Note: For style preferences (archetype, sliders, brands), use style_dna_server.
    Note: For wardrobe items, use wardrobe_server.
    """
    profile = await tools.get_user_profile(req.user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return GetUserProfileResponse(profile=profile)


@router.get("/test/profile")
async def test_profile(user_id: str = Query(...)):
    """Test endpoint to fetch user profile."""
    profile = await tools.get_user_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "user_id": user_id,
        "name": profile.name,
        "email": profile.email,
        "subscription_status": profile.subscription_status,
        "role": profile.role,
        "settings": profile.settings.model_dump(),
    }
