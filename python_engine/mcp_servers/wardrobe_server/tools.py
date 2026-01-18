"""Wardrobe MCP tools - fetches wardrobe items from wardrobeitems collection."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

import numpy as np

from mcp_servers.shared.embeddings_client import embed_text
from mcp_servers.wardrobe_server import db
from mcp_servers.wardrobe_server.schemas import (
    WardrobeItem,
    WardrobeFilters,
    Category,
    SeasonalPaletteScores,
)


def _sanitize_mongo_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Remove/stringify ObjectId for JSON serialization."""
    doc = dict(doc)
    _id = doc.pop("_id", None)
    if _id is not None:
        doc["_id"] = str(_id)
    # Also handle brandId if it's an ObjectId
    if "brandId" in doc and doc["brandId"] is not None:
        doc["brandId"] = str(doc["brandId"])
    return doc


def _parse_category(doc: Dict[str, Any]) -> Category:
    """Parse category from document."""
    cat = doc.get("category", "TOP")
    try:
        return Category(cat)
    except ValueError:
        return Category.TOP


def _parse_seasonal_scores(doc: Dict[str, Any]) -> Optional[SeasonalPaletteScores]:
    """Parse seasonal palette scores from document."""
    scores = doc.get("seasonalPaletteScores")
    if not scores or not isinstance(scores, dict):
        return None
    return SeasonalPaletteScores(**scores)


def _parse_datetime(value: Any) -> Optional[datetime]:
    """Parse datetime from various formats."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _doc_to_item(doc: Dict[str, Any]) -> WardrobeItem:
    """Convert MongoDB document to WardrobeItem model."""
    raw = _sanitize_mongo_doc(doc)
    item_id = str(doc.get("_id") or doc.get("id") or "")
    
    return WardrobeItem(
        id=item_id,
        userId=doc.get("userId", ""),
        imageUrl=doc.get("imageUrl", ""),
        processedImageUrl=doc.get("processedImageUrl"),
        category=_parse_category(doc),
        subCategory=doc.get("subCategory"),
        brand=doc.get("brand"),
        brandId=str(doc["brandId"]) if doc.get("brandId") else None,
        colors=list(doc.get("colors") or []),
        notes=doc.get("notes"),
        isFavorite=doc.get("isFavorite", False),
        lastWorn=_parse_datetime(doc.get("lastWorn")),
        seasonalPaletteScores=_parse_seasonal_scores(doc),
        embedding=doc.get("embedding"),
        raw=raw,
    )


def _item_to_text(item: WardrobeItem) -> str:
    """Convert wardrobe item to text for embedding."""
    parts: List[str] = []
    
    # Category and subcategory
    parts.append(item.category.value)
    if item.subCategory:
        parts.append(item.subCategory)
    
    # Brand
    if item.brand:
        parts.append(item.brand)
    
    # Colors (as descriptive text)
    if item.colors:
        parts.append(f"colors: {', '.join(item.colors)}")
    
    # Notes
    if item.notes:
        parts.append(item.notes)
    
    return " | ".join(parts) if parts else f"wardrobe item {item.id}"


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    """Compute cosine similarity between two vectors."""
    va = np.asarray(a, dtype=np.float32)
    vb = np.asarray(b, dtype=np.float32)
    denom = (np.linalg.norm(va) * np.linalg.norm(vb)) + 1e-12
    return float(np.dot(va, vb) / denom)


async def filter_wardrobe_items(
    user_id: str,
    filters: Optional[WardrobeFilters] = None,
    *,
    limit: int = 100
) -> List[WardrobeItem]:
    """
    Filter wardrobe items by criteria.
    
    Args:
        user_id: The user's clerkId
        filters: Optional filters (category, brand, colors, etc.)
        limit: Maximum number of items to return
    
    Returns:
        List of wardrobe items matching the filters
    """
    filter_dict = filters.model_dump(exclude_none=True) if filters else None
    docs = await db.find_wardrobe_items(user_id=user_id, filters=filter_dict, limit=limit)
    return [_doc_to_item(d) for d in docs]


async def get_wardrobe_item(item_id: str, user_id: str) -> Optional[WardrobeItem]:
    """
    Get a single wardrobe item by ID.
    
    Args:
        item_id: The item's _id
        user_id: The user's clerkId (for authorization)
    
    Returns:
        WardrobeItem or None if not found
    """
    doc = await db.get_wardrobe_item(item_id=item_id, user_id=user_id)
    if not doc:
        return None
    return _doc_to_item(doc)


async def search_wardrobe_items(
    query: str,
    user_id: str,
    filters: Optional[WardrobeFilters] = None,
    *,
    limit: int = 20,
    candidate_pool: int = 200,
) -> List[Dict[str, Any]]:
    """
    Semantic search in user's wardrobe.
    
    Uses CLIP embeddings for similarity search. If items have pre-computed
    embeddings, uses those; otherwise falls back to on-the-fly embedding.
    
    Args:
        query: Search query text
        user_id: The user's clerkId
        filters: Optional filters to narrow down candidates
        limit: Maximum number of results to return
        candidate_pool: Maximum candidates to consider for ranking
    
    Returns:
        List of {"item": WardrobeItem, "score": float} sorted by relevance
    """
    filter_dict = filters.model_dump(exclude_none=True) if filters else None
    
    # First, try to get items with pre-computed embeddings
    docs = await db.find_items_with_embeddings(
        user_id=user_id,
        filters=filter_dict,
        limit=candidate_pool
    )
    
    # If no items with embeddings, fall back to all items
    if not docs:
        docs = await db.find_wardrobe_items(
            user_id=user_id,
            filters=filter_dict,
            limit=candidate_pool
        )
    
    if not docs:
        return []
    
    # Embed the query
    query_emb = await embed_text(query)
    results: List[Dict[str, Any]] = []
    
    for doc in docs:
        item = _doc_to_item(doc)
        
        # Use pre-computed embedding if available
        if item.embedding:
            item_emb = item.embedding
        else:
            # Fall back to on-the-fly embedding
            item_text = _item_to_text(item)
            item_emb = await embed_text(item_text)
        
        score = _cosine_similarity(query_emb, item_emb)
        results.append({"item": item, "score": score})
    
    # Sort by score descending
    results.sort(key=lambda r: r["score"], reverse=True)
    return results[:max(1, limit)]
