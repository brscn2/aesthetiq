"""User Data MCP tools - fetches user profile from users collection."""
from __future__ import annotations

from typing import Any, Dict, Optional

from mcp_servers.user_data_server import db
from mcp_servers.user_data_server.schemas import (
    UserProfile,
    UserSettings,
    SubscriptionStatus,
    UserRole,
)


def _sanitize(doc: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Remove/stringify ObjectId for JSON serialization."""
    if not doc:
        return {}
    doc = dict(doc)
    _id = doc.pop("_id", None)
    if _id is not None:
        doc["_id"] = str(_id)
    return doc


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
    """
    doc = await db.get_user_by_clerk_id(user_id)
    if not doc:
        return None
    
    return UserProfile(
        user_id=doc.get("clerkId", user_id),
        email=doc.get("email", ""),
        name=doc.get("name", ""),
        avatar_url=doc.get("avatarUrl"),
        subscription_status=_parse_subscription_status(doc),
        role=_parse_role(doc),
        settings=_parse_settings(doc),
        raw=_sanitize(doc),
    )
