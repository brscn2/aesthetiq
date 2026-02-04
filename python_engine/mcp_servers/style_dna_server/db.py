"""Database access for Style DNA server."""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from mcp_servers.core.config import get_settings
from mcp_servers.shared.mongo import get_collection

logger = logging.getLogger(__name__)


async def get_style_profile(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch style profile from 'styleprofiles' collection.
    
    Matches backend/src/style-profile/schemas/style-profile.schema.ts
    """
    settings = get_settings()
    db_name = settings.MONGODB_DB_STYLE
    collection_name = settings.MONGODB_COLLECTION_STYLE
    
    # Diagnostic logging
    logger.info(f"Querying style profile: db={db_name}, collection={collection_name}, userId={user_id}")
    
    coll = get_collection(db_name, collection_name)
    # Backend style-profile schema uses `userId` (camelCase) as the unique key.
    doc = await coll.find_one({"userId": user_id})
    
    if doc:
        logger.info(f"Found style profile for user {user_id}")
        return doc
    
    logger.warning(f"No style profile found for user {user_id} in db {db_name}, collection {collection_name}")
    # Fallback: some environments may still use `_id` as user identifier.
    fallback_doc = await coll.find_one({"_id": user_id})
    if fallback_doc:
        logger.info(f"Found style profile using _id fallback for user {user_id}")
    return fallback_doc


async def get_color_analysis(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch the most recent color analysis from 'coloranalyses' collection.
    
    Matches backend/src/analysis/schemas/color-analysis.schema.ts
    """
    settings = get_settings()
    db_name = settings.MONGODB_DB_COLOR_ANALYSIS
    collection_name = settings.MONGODB_COLLECTION_COLOR_ANALYSIS
    
    # Diagnostic logging
    logger.info(f"Querying color analysis: db={db_name}, collection={collection_name}, userId={user_id}")
    
    coll = get_collection(db_name, collection_name)
    # Get the most recent color analysis for this user (sorted by scanDate descending)
    doc = await coll.find_one(
        {"userId": user_id},
        sort=[("scanDate", -1)]  # Most recent first
    )
    
    if doc:
        logger.info(f"Found color analysis for user {user_id}")
    else:
        logger.warning(f"No color analysis found for user {user_id} in db {db_name}, collection {collection_name}")
    
    return doc
