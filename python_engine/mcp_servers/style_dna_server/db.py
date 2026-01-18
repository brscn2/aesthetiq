"""Database access for Style DNA server."""
from __future__ import annotations

from typing import Any, Dict, Optional

from mcp_servers.core.config import get_settings
from mcp_servers.shared.mongo import get_collection


async def get_style_profile(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch style profile from 'styleprofiles' collection.
    
    Matches backend/src/style-profile/schemas/style-profile.schema.ts
    """
    settings = get_settings()
    coll = get_collection(settings.MONGODB_DB_STYLE, settings.MONGODB_COLLECTION_STYLE)
    # Backend style-profile schema uses `userId` (camelCase) as the unique key.
    doc = await coll.find_one({"userId": user_id})
    if doc:
        return doc
    # Fallback: some environments may still use `_id` as user identifier.
    return await coll.find_one({"_id": user_id})


async def get_color_analysis(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch the most recent color analysis from 'coloranalyses' collection.
    
    Matches backend/src/analysis/schemas/color-analysis.schema.ts
    """
    settings = get_settings()
    coll = get_collection(settings.MONGODB_DB_COLOR_ANALYSIS, settings.MONGODB_COLLECTION_COLOR_ANALYSIS)
    # Get the most recent color analysis for this user (sorted by scanDate descending)
    doc = await coll.find_one(
        {"userId": user_id},
        sort=[("scanDate", -1)]  # Most recent first
    )
    return doc
