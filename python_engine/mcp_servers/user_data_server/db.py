"""Database access for User Data server."""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from mcp_servers.core.config import get_settings
from mcp_servers.shared.mongo import get_collection

logger = logging.getLogger(__name__)


async def get_user_by_clerk_id(clerk_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch user from 'users' collection by clerkId.
    
    Matches backend/src/users/schemas/user.schema.ts
    
    Raises:
        Exception: If there's an error connecting to MongoDB or querying the database
    """
    settings = get_settings()
    db_name = settings.MONGODB_DB_USERS
    collection_name = settings.MONGODB_COLLECTION_USERS
    
    try:
        logger.debug(f"Querying user: db={db_name}, collection={collection_name}, clerkId={clerk_id}")
        
        coll = get_collection(db_name, collection_name)
        # Backend User schema uses `clerkId` as the unique identifier
        doc = await coll.find_one({"clerkId": clerk_id})
        
        if doc:
            logger.debug(f"Found user document for clerkId: {clerk_id}")
        else:
            logger.debug(f"No user document found for clerkId: {clerk_id}")
        
        return doc
    except Exception as e:
        logger.error(
            f"Error fetching user by clerkId={clerk_id} from db={db_name}, "
            f"collection={collection_name}: {e}",
            exc_info=True
        )
        raise
