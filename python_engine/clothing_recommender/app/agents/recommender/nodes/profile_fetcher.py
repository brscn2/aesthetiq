"""Profile Fetcher node for the Recommender agent.

This node fetches user style profile from MongoDB if needed.
"""
from typing import Any

from app.core.logger import get_logger
from app.agents.recommender.state import RecommenderState, RecommenderStage
from app.services.mongodb.profile_repo import ProfileRepository

logger = get_logger(__name__)


async def profile_fetcher_node(
    state: RecommenderState,
    profile_repo: ProfileRepository
) -> dict[str, Any]:
    """
    Fetch user style profile from MongoDB.
    
    Only called if needs_profile is True from query analyzer.
    
    Args:
        state: Current recommender state
        profile_repo: Profile repository instance
        
    Returns:
        Updated state fields with user_profile
    """
    user_id = state["user_id"]
    
    logger.info(f"Fetching style profile for user: {user_id}")
    
    try:
        profile = await profile_repo.get_by_user_id(user_id)
        
        if profile:
            logger.info(
                f"Profile found: archetype={profile.get('archetype')}, "
                f"brands={profile.get('favoriteBrands', [])}"
            )
            return {
                "user_profile": profile,
                "current_stage": RecommenderStage.FETCHING_PROFILE,
                "stage_metadata": {
                    "profile_found": True,
                    "archetype": profile.get("archetype"),
                },
            }
        else:
            logger.info(f"No profile found for user: {user_id}")
            return {
                "user_profile": None,
                "current_stage": RecommenderStage.FETCHING_PROFILE,
                "stage_metadata": {"profile_found": False},
            }
            
    except Exception as e:
        logger.error(f"Failed to fetch profile: {e}")
        # Continue without profile on error
        return {
            "user_profile": None,
            "current_stage": RecommenderStage.FETCHING_PROFILE,
            "stage_metadata": {"error": str(e)},
        }
