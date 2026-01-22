"""Shared MongoDB helpers for MCP servers."""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorCollection

from mcp_servers.core.config import get_settings

logger = logging.getLogger(__name__)


@lru_cache()
def get_mongo_client() -> AsyncIOMotorClient:
    """Get a cached Motor client."""
    settings = get_settings()
    if not settings.MONGODB_URI:
        raise RuntimeError("MONGODB_URI is not configured")
    # Add tlsAllowInvalidCertificates for development with MongoDB Atlas
    logger.debug(f"Creating MongoDB client with URI: {settings.MONGODB_URI[:50]}...")
    return AsyncIOMotorClient(
        settings.MONGODB_URI,
        tlsAllowInvalidCertificates=True,
        serverSelectionTimeoutMS=30000,
    )


def get_db(db_name: str) -> AsyncIOMotorDatabase:
    """Get MongoDB database with diagnostic logging."""
    logger.debug(f"Accessing MongoDB database: {db_name}")
    return get_mongo_client()[db_name]


def get_collection(db_name: str, collection_name: str) -> AsyncIOMotorCollection:
    """Get MongoDB collection with diagnostic logging."""
    logger.debug(f"Accessing MongoDB collection: db={db_name}, collection={collection_name}")
    return get_db(db_name)[collection_name]

