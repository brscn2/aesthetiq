"""Database access for Commerce server."""
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


def _build_filter_query(filters: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Build MongoDB query from filters."""
    query: Dict[str, Any] = {}
    
    if not filters:
        return query

    # Text search (uses MongoDB text index)
    if filters.get("search"):
        query["$text"] = {"$search": filters["search"]}
    
    # Category filter (exact match, expects enum value like "TOP")
    if filters.get("category"):
        query["category"] = filters["category"]
    
    # SubCategory filter
    if filters.get("subCategory"):
        query["subCategory"] = filters["subCategory"]
    
    # Brand filter (case-insensitive partial match)
    if filters.get("brand"):
        query["brand"] = {"$regex": filters["brand"], "$options": "i"}
    
    # BrandId filter (exact match)
    if filters.get("brandId"):
        query["brandId"] = _maybe_object_id(filters["brandId"])
    
    # RetailerId filter (exact match)
    if filters.get("retailerId"):
        query["retailerId"] = _maybe_object_id(filters["retailerId"])
    
    # Color filter (match any of the item's colors)
    if filters.get("color"):
        query["colors"] = filters["color"]
    
    # Price range filter
    if filters.get("priceMin") is not None or filters.get("priceMax") is not None:
        price_query: Dict[str, Any] = {}
        if filters.get("priceMin") is not None:
            price_query["$gte"] = filters["priceMin"]
        if filters.get("priceMax") is not None:
            price_query["$lte"] = filters["priceMax"]
        query["price"] = price_query
    
    # Tags filter (match any tag)
    tags = filters.get("tags")
    if tags and isinstance(tags, list):
        query["tags"] = {"$in": tags}
    
    # InStock filter
    if filters.get("inStock") is not None:
        query["inStock"] = filters["inStock"]
    
    # Seasonal palette filter (filter by minimum score for a specific palette)
    seasonal_palette = filters.get("seasonalPalette")
    if seasonal_palette:
        # Normalize palette name (e.g., "warm_autumn" -> "WARM_AUTUMN")
        palette_key = seasonal_palette.strip().upper().replace(" ", "_")
        min_score = filters.get("minPaletteScore", 0.6)
        query[f"seasonalPaletteScores.{palette_key}"] = {"$gte": min_score}
    
    # Extra filters (escape hatch)
    extra = filters.get("extra") or {}
    for k, v in extra.items():
        query[k] = v
    
    return query


async def find_commerce_items(
    filters: Optional[Dict[str, Any]] = None,
    *,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """
    Find commerce items with optional filters.
    
    Args:
        filters: Optional filters (category, brand, price range, etc.)
        limit: Maximum number of items to return
    
    Returns:
        List of commerce item documents
    """
    settings = get_settings()
    coll = get_collection(settings.MONGODB_DB_COMMERCE, settings.MONGODB_COLLECTION_COMMERCE)
    query = _build_filter_query(filters)
    cursor = coll.find(query).limit(limit)
    return await cursor.to_list(length=limit)


async def get_commerce_item(item_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a single commerce item by ID.
    
    Args:
        item_id: The item's _id (as string)
    
    Returns:
        Commerce item document or None if not found
    """
    settings = get_settings()
    coll = get_collection(settings.MONGODB_DB_COMMERCE, settings.MONGODB_COLLECTION_COMMERCE)
    
    # Try ObjectId first
    doc = await coll.find_one({"_id": _maybe_object_id(item_id)})
    
    return doc


async def find_items_with_embeddings(
    filters: Optional[Dict[str, Any]] = None,
    *,
    limit: int = 200
) -> List[Dict[str, Any]]:
    """
    Find commerce items that have CLIP embeddings.
    
    Used for semantic search - only returns items with pre-computed embeddings.
    
    Args:
        filters: Optional filters
        limit: Maximum number of items to return
    
    Returns:
        List of commerce item documents with embeddings
    """
    settings = get_settings()
    coll = get_collection(settings.MONGODB_DB_COMMERCE, settings.MONGODB_COLLECTION_COMMERCE)
    query = _build_filter_query(filters)
    # Only get items with embeddings
    query["embedding"] = {"$ne": None}
    cursor = coll.find(query).limit(limit)
    return await cursor.to_list(length=limit)


async def find_items_for_palette(
    seasonal_palette: str,
    min_score: float = 0.6,
    filters: Optional[Dict[str, Any]] = None,
    *,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """
    Find commerce items that match a specific seasonal palette.
    
    Args:
        seasonal_palette: The palette to match (e.g., "WARM_AUTUMN")
        min_score: Minimum score threshold (0-1)
        filters: Additional filters
        limit: Maximum number of items to return
    
    Returns:
        List of commerce item documents sorted by palette score
    """
    settings = get_settings()
    coll = get_collection(settings.MONGODB_DB_COMMERCE, settings.MONGODB_COLLECTION_COMMERCE)
    
    # Build base query
    query = _build_filter_query(filters)
    
    # Normalize palette name
    palette_key = seasonal_palette.strip().upper().replace(" ", "_")
    score_field = f"seasonalPaletteScores.{palette_key}"
    
    # Filter by minimum score
    query[score_field] = {"$gte": min_score}
    
    # Sort by palette score descending
    cursor = coll.find(query).sort(score_field, -1).limit(limit)
    return await cursor.to_list(length=limit)
