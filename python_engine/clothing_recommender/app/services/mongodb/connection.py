"""MongoDB connection management.

This module provides async MongoDB connection using Motor (async driver).
Connection is cached and reused across requests.
"""
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorCollection
from functools import lru_cache

from app.core.config import get_settings
from app.core.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

# Global client instance (created once, reused)
_client: Optional[AsyncIOMotorClient] = None


def get_client() -> AsyncIOMotorClient:
    """
    Get or create MongoDB async client.
    
    Uses a singleton pattern to reuse connections.
    
    Returns:
        AsyncIOMotorClient instance
        
    Raises:
        ValueError: If MONGODB_URL is not configured
    """
    global _client
    
    if _client is None:
        if not settings.MONGODB_URL:
            raise ValueError("MONGODB_URL environment variable is not set")
        
        logger.info("Creating MongoDB client connection")
        _client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            maxPoolSize=10,
            minPoolSize=1,
            serverSelectionTimeoutMS=5000,
        )
        logger.info("MongoDB client created successfully")
    
    return _client


def get_database(db_name: Optional[str] = None) -> AsyncIOMotorDatabase:
    """
    Get MongoDB database instance.
    
    Args:
        db_name: Database name (defaults to MONGODB_DB_NAME from settings)
        
    Returns:
        AsyncIOMotorDatabase instance
    """
    client = get_client()
    name = db_name or settings.MONGODB_DB_NAME
    return client[name]


def get_collection(collection_name: str, db_name: Optional[str] = None) -> AsyncIOMotorCollection:
    """
    Get MongoDB collection instance.
    
    Args:
        collection_name: Name of the collection
        db_name: Database name (defaults to MONGODB_DB_NAME from settings)
        
    Returns:
        AsyncIOMotorCollection instance
    """
    db = get_database(db_name)
    return db[collection_name]


async def close_connection():
    """Close MongoDB connection (call on app shutdown)."""
    global _client
    
    if _client is not None:
        logger.info("Closing MongoDB connection")
        _client.close()
        _client = None


async def ping_database() -> bool:
    """
    Test MongoDB connection.
    
    Returns:
        True if connection is successful
    """
    try:
        client = get_client()
        await client.admin.command("ping")
        logger.info("MongoDB ping successful")
        return True
    except Exception as e:
        logger.error(f"MongoDB ping failed: {e}")
        return False
