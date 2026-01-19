"""Database access for User Data server."""
from __future__ import annotations

from typing import Any, Dict, Optional

from mcp_servers.core.config import get_settings
from mcp_servers.shared.mongo import get_collection


async def get_user_by_clerk_id(clerk_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch user from 'users' collection by clerkId.
    
    Matches backend/src/users/schemas/user.schema.ts
    """
    settings = get_settings()
    coll = get_collection(settings.MONGODB_DB_USERS, settings.MONGODB_COLLECTION_USERS)
    # Backend User schema uses `clerkId` as the unique identifier
    doc = await coll.find_one({"clerkId": clerk_id})
    return doc
