"""User Data MCP tools - fetches user profile from users collection."""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from bson import ObjectId

from mcp_servers.user_data_server import db
from mcp_servers.user_data_server.schemas import (
    UserProfile,
    UserSettings,
    SubscriptionStatus,
    UserRole,
)

logger = logging.getLogger(__name__)


def _sanitize(doc: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Recursively convert all ObjectId values to strings for JSON serialization."""
    if not doc:
        return {}
    return _sanitize_value(doc)


def _sanitize_value(value: Any) -> Any:
    """Recursively sanitize a value, converting ObjectId to string."""
    if isinstance(value, ObjectId):
        return str(value)
    elif isinstance(value, dict):
        return {k: _sanitize_value(v) for k, v in value.items()}
    elif isinstance(value, list):
        return [_sanitize_value(item) for item in value]
    else:
        return value


def _parse_settings(doc: Dict[str, Any]) -> UserSettings:
    """Parse user settings from document."""
    settings_data = doc.get("settings", {})
    if not isinstance(settings_data, dict):
        return UserSettings()
    return UserSettings(
        units=settings_data.get("units", "METRIC"),
        currency=settings_data.get("currency", "EUR"),
        shoppingRegion=settings_data.get("shoppingRegion", "EU"),
        allowBiometrics=settings_data.get("allowBiometrics", False),
        allowFacialAnalysis=settings_data.get("allowFacialAnalysis", True),
        storeColorHistory=settings_data.get("storeColorHistory", True),
        contributeToTrendLearning=settings_data.get("contributeToTrendLearning", False),
        feedbackDecayDays=settings_data.get("feedbackDecayDays", 7),
        theme=settings_data.get("theme", "SYSTEM"),
    )


def _parse_subscription_status(doc: Dict[str, Any]) -> SubscriptionStatus:
    """Parse subscription status from document."""
    status = doc.get("subscriptionStatus", "FREE")
    try:
        return SubscriptionStatus(status)
    except ValueError:
        return SubscriptionStatus.FREE


def _parse_role(doc: Dict[str, Any]) -> UserRole:
    """Parse user role from document."""
    role = doc.get("role", "USER")
    try:
        return UserRole(role)
    except ValueError:
        return UserRole.USER


async def get_user_profile(user_id: str) -> Optional[UserProfile]:
    """
    Get user profile by clerkId.
    
    Args:
        user_id: The user's clerkId (from Clerk authentication)
    
    Returns:
        UserProfile with user data, or None if user not found
    
    Raises:
        Exception: If there's an error fetching or parsing the user data
    """
    try:
        logger.debug(f"Fetching user profile from database for user_id: {user_id}")
        doc = await db.get_user_by_clerk_id(user_id)
        if not doc:
            logger.debug(f"No user document found for user_id: {user_id}")
            return None
        
        logger.debug(f"Found user document for user_id: {user_id}, parsing profile")
        
        # Parse and create UserProfile with error handling
        try:
            profile = UserProfile(
                user_id=doc.get("clerkId", user_id),
                email=doc.get("email", ""),
                name=doc.get("name", ""),
                avatar_url=doc.get("avatarUrl"),
                subscription_status=_parse_subscription_status(doc),
                role=_parse_role(doc),
                settings=_parse_settings(doc),
                raw=_sanitize(doc),
            )
            logger.debug(f"Successfully parsed user profile for user_id: {user_id}")
            return profile
        except Exception as parse_error:
            logger.error(
                f"Error parsing user profile for user_id={user_id}: {parse_error}. "
                f"Document keys: {list(doc.keys()) if doc else 'None'}",
                exc_info=True
            )
            raise
    except Exception as e:
        logger.error(f"Error in get_user_profile for user_id={user_id}: {e}", exc_info=True)
        raise
