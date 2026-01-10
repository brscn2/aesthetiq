"""Profile repository for user style profile queries.

This repository handles style profile collection operations.
"""
from typing import Optional

from app.core.config import get_settings
from app.core.logger import get_logger
from app.services.mongodb.connection import get_collection
from app.agents.recommender.state import UserProfile

logger = get_logger(__name__)
settings = get_settings()


class ProfileRepository:
    """Repository for styleprofiles collection operations."""
    
    def __init__(self):
        """Initialize profile repository."""
        self.collection_name = settings.MONGODB_STYLE_PROFILES_COLLECTION
    
    @property
    def collection(self):
        """Get styleprofiles collection (lazy loading)."""
        return get_collection(self.collection_name)
    
    async def get_by_user_id(self, user_id: str) -> Optional[UserProfile]:
        """
        Get user style profile by user ID.
        
        Args:
            user_id: User identifier (e.g., "user_36On4ZlnKfasGRPkKfsqX7W8FDm")
            
        Returns:
            UserProfile dict or None if not found
        """
        logger.info(f"Fetching style profile for user: {user_id}")
        
        try:
            doc = await self.collection.find_one({"userId": user_id})
            
            if doc is None:
                logger.info(f"No style profile found for user: {user_id}")
                return None
            
            # Convert ObjectId to string
            doc["_id"] = str(doc["_id"])
            
            # Extract relevant fields into UserProfile
            profile: UserProfile = {
                "userId": doc.get("userId"),
                "archetype": doc.get("archetype"),
                "sliders": doc.get("sliders"),
                "favoriteBrands": doc.get("favoriteBrands", []),
                "sizes": doc.get("sizes"),
                "negativeConstraints": doc.get("negativeConstraints", []),
            }
            
            logger.info(f"Found style profile: archetype={profile.get('archetype')}")
            return profile
            
        except Exception as e:
            logger.error(f"Failed to fetch profile for user {user_id}: {e}")
            raise
    
    async def has_profile(self, user_id: str) -> bool:
        """
        Check if user has a style profile.
        
        Args:
            user_id: User identifier
            
        Returns:
            True if profile exists
        """
        count = await self.collection.count_documents({"userId": user_id}, limit=1)
        return count > 0
