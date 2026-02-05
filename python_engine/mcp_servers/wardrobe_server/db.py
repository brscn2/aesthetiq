"""Database access for Wardrobe server."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from bson import ObjectId

from mcp_servers.core.config import get_settings
from mcp_servers.shared.mongo import get_collection


def _maybe_object_id(value: str):
    """Try to convert string to ObjectId, return original if invalid."""
    try:
        return ObjectId(value)
    except Exception:
        return value


def _build_filter_query(
    user_id: str, filters: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    """Build MongoDB query from user_id and filters."""
    # Backend uses `userId` (camelCase)
    query: Dict[str, Any] = {"userId": user_id}

    if not filters:
        return query

    # Category filter (exact match)
    if filters.get("category"):
        query["category"] = filters["category"]

    # SubCategory filter (exact match)
    if filters.get("subCategory"):
        query["subCategory"] = filters["subCategory"]

    # Brand filter (case-insensitive partial match)
    if filters.get("brand"):
        query["brand"] = {"$regex": filters["brand"], "$options": "i"}

    # Name/description filters (case-insensitive partial match)
    if filters.get("name"):
        query["name"] = {"$regex": filters["name"], "$options": "i"}
    if filters.get("description"):
        query["description"] = {"$regex": filters["description"], "$options": "i"}

    # Colors filter (match any of the provided colors)
    colors = filters.get("colors")
    if colors and isinstance(colors, list):
        query["colors"] = {"$in": colors}

    # Color hex / variants
    if filters.get("colorHex"):
        query["colorHex"] = filters["colorHex"]
    color_variants = filters.get("colorVariants")
    if color_variants and isinstance(color_variants, list):
        query["colorVariants"] = {"$in": color_variants}

    # Material filter (case-insensitive partial match)
    if filters.get("material"):
        query["material"] = {"$regex": filters["material"], "$options": "i"}

    # Gender filter (exact match)
    if filters.get("gender"):
        query["gender"] = filters["gender"]

    # Sizes filter (match any)
    sizes = filters.get("sizes")
    if sizes and isinstance(sizes, list):
        query["sizes"] = {"$in": sizes}

    # Tags filter (match any)
    tags = filters.get("tags")
    if tags and isinstance(tags, list):
        query["tags"] = {"$in": tags}

    # inStock filter
    if filters.get("inStock") is not None:
        query["inStock"] = filters["inStock"]

    # isFavorite filter
    if filters.get("isFavorite") is not None:
        query["isFavorite"] = filters["isFavorite"]

    # Extra filters (escape hatch)
    extra = filters.get("extra") or {}
    for k, v in extra.items():
        query[k] = v

    return query


async def find_wardrobe_items(
    user_id: str, filters: Optional[Dict[str, Any]] = None, *, limit: int = 100
) -> List[Dict[str, Any]]:
    """
    Find wardrobe items for a user with optional filters.

    Args:
        user_id: The user's clerkId
        filters: Optional filters (category, brand, colors, etc.)
        limit: Maximum number of items to return

    Returns:
        List of wardrobe item documents
    """
    settings = get_settings()
    coll = get_collection(
        settings.MONGODB_DB_WARDROBE, settings.MONGODB_COLLECTION_WARDROBE
    )
    query = _build_filter_query(user_id, filters)
    cursor = coll.find(query).limit(limit)
    return await cursor.to_list(length=limit)


async def get_wardrobe_item(item_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a single wardrobe item by ID.

    Args:
        item_id: The item's _id (as string)
        user_id: The user's clerkId (for authorization)

    Returns:
        Wardrobe item document or None if not found
    """
    settings = get_settings()
    coll = get_collection(
        settings.MONGODB_DB_WARDROBE, settings.MONGODB_COLLECTION_WARDROBE
    )

    # Try ObjectId first
    doc = await coll.find_one({"_id": _maybe_object_id(item_id), "userId": user_id})

    return doc


async def find_items_with_embeddings(
    user_id: str, filters: Optional[Dict[str, Any]] = None, *, limit: int = 200
) -> List[Dict[str, Any]]:
    """
    Find wardrobe items that have CLIP embeddings.

    Used for semantic search - only returns items with pre-computed embeddings.

    Args:
        user_id: The user's clerkId
        filters: Optional filters
        limit: Maximum number of items to return

    Returns:
        List of wardrobe item documents with embeddings
    """
    settings = get_settings()
    coll = get_collection(
        settings.MONGODB_DB_WARDROBE, settings.MONGODB_COLLECTION_WARDROBE
    )
    query = _build_filter_query(user_id, filters)
    # Only get items with embeddings
    query["embedding"] = {"$ne": None}
    cursor = coll.find(query).limit(limit)
    return await cursor.to_list(length=limit)
