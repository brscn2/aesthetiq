"""User Data MCP server router."""
import logging
from fastapi import APIRouter, HTTPException, Query

from mcp_servers.user_data_server import tools
from mcp_servers.user_data_server.schemas import (
    GetUserProfileRequest,
    GetUserProfileResponse,
)

logger = logging.getLogger(__name__)
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
    try:
        logger.info(f"get_user_profile called with user_id: {req.user_id}")
        profile = await tools.get_user_profile(req.user_id)
        if not profile:
            logger.warning(f"User not found: {req.user_id}")
            raise HTTPException(status_code=404, detail="User not found")
        logger.info(f"Successfully retrieved profile for user: {req.user_id}")
        return GetUserProfileResponse(profile=profile)
    except HTTPException:
        # Re-raise HTTP exceptions (like 404)
        raise
    except Exception as e:
        logger.error(f"Error calling get_user_profile for user_id={req.user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error while fetching user profile: {str(e)}"
        )


@router.get("/test/profile")
async def test_profile(user_id: str = Query(...)):
    """Test endpoint to fetch user profile."""
    try:
        logger.info(f"test_profile called with user_id: {user_id}")
        profile = await tools.get_user_profile(user_id)
        if not profile:
            logger.warning(f"User not found: {user_id}")
            raise HTTPException(status_code=404, detail="User not found")
        logger.info(f"Successfully retrieved profile for user: {user_id}")
        return {
            "user_id": user_id,
            "name": profile.name,
            "email": profile.email,
            "gender": profile.gender,
            "birth_date": profile.birth_date,
            "subscription_status": profile.subscription_status,
            "role": profile.role,
            "settings": profile.settings.model_dump(),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in test_profile for user_id={user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error while fetching user profile: {str(e)}"
        )
