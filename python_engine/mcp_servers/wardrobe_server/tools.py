"""Wardrobe MCP tools - fetches wardrobe items from wardrobeitems collection."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import numpy as np
from bson import ObjectId

from mcp_servers.shared.embeddings_client import embed_text
from mcp_servers.shared.mongo import get_collection
from mcp_servers.wardrobe_server import db
from mcp_servers.wardrobe_server.schemas import (
    WardrobeItem,
    WardrobeFilters,
    Category,
    SeasonalPaletteScores,
)
from mcp_servers.core.config import get_settings


def _sanitize_mongo_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively convert all ObjectId values to strings for JSON serialization."""
    if not doc:
        return {}
    return _sanitize_value(doc)


def _sanitize_value(value: Any) -> Any:
    """Recursively sanitize a value, converting ObjectId to string."""
    if isinstance(value, ObjectId):
        return str(value)
    elif isinstance(value, dict):
        return {k: _sanitize_value(v) for k, v in value.items()}
    elif isinstance(value, list):
        return [_sanitize_value(item) for item in value]
    else:
        return value


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
        name=doc.get("name"),
        description=doc.get("description"),
        imageUrl=doc.get("imageUrl", ""),
        processedImageUrl=doc.get("processedImageUrl"),
        category=_parse_category(doc),
        subCategory=doc.get("subCategory"),
        brand=doc.get("brand"),
        brandId=str(doc["brandId"]) if doc.get("brandId") else None,
        color=doc.get("color"),
        colorHex=doc.get("colorHex"),
        colorVariants=list(doc.get("colorVariants") or []),
        retailerId=str(doc["retailerId"]) if doc.get("retailerId") else None,
        colors=list(doc.get("colors") or []),
        price=doc.get("price"),
        productUrl=doc.get("productUrl"),
        sku=doc.get("sku"),
        tags=list(doc.get("tags") or []),
        inStock=doc.get("inStock"),
        imageUrls=list(doc.get("imageUrls") or []),
        primaryImageUrl=doc.get("primaryImageUrl"),
        material=doc.get("material"),
        gender=doc.get("gender"),
        sizes=list(doc.get("sizes") or []),
        notes=doc.get("notes"),
        isFavorite=doc.get("isFavorite", False),
        lastWorn=_parse_datetime(doc.get("lastWorn")),
        seasonalPaletteScores=_parse_seasonal_scores(doc),
        embedding=doc.get("embedding"),
        metadata=doc.get("metadata") or {},
        raw=raw,
    )


def _item_to_text(item: WardrobeItem) -> str:
    """Convert wardrobe item to text for embedding."""
    parts: List[str] = []

    # Category and subcategory
    parts.append(item.category.value)
    if item.subCategory:
        parts.append(item.subCategory)

    # Name/description
    if item.name:
        parts.append(item.name)
    if item.description:
        parts.append(item.description)

    # Brand
    if item.brand:
        parts.append(item.brand)

    # Material, gender, sizes, tags
    if item.material:
        parts.append(item.material)
    if item.gender:
        parts.append(item.gender)
    if item.sizes:
        parts.append(f"sizes: {', '.join(item.sizes)}")
    if item.tags:
        parts.append(f"tags: {', '.join(item.tags)}")

    # Colors (as descriptive text)
    if item.colors:
        parts.append(f"colors: {', '.join(item.colors)}")
    elif item.colorHex:
        parts.append(f"color: {item.colorHex}")
    elif item.color:
        parts.append(f"color: {item.color}")

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
    user_id: str, filters: Optional[WardrobeFilters] = None, *, limit: int = 100
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
    docs = await db.find_wardrobe_items(
        user_id=user_id, filters=filter_dict, limit=limit
    )
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
        user_id=user_id, filters=filter_dict, limit=candidate_pool
    )

    # If no items with embeddings, fall back to all items
    if not docs:
        docs = await db.find_wardrobe_items(
            user_id=user_id, filters=filter_dict, limit=candidate_pool
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
    return results[: max(1, limit)]


async def save_item_feedback(
    user_id: str,
    item_id: str,
    feedback: str,
    reason: Optional[str] = None,
    reason_text: Optional[str] = None,
    session_id: Optional[str] = None,
) -> bool:
    """
    Save user feedback for an item (like, dislike, irrelevant).

    Args:
        user_id: The user's clerkId
        item_id: The item ID being rated
        feedback: Feedback type ('like', 'dislike', 'irrelevant')
        reason: Reason code for dislike (e.g., 'wrong_color', 'not_style')
        reason_text: Free-form reason text
        session_id: Optional session ID for context

    Returns:
        True if saved successfully, False otherwise
    """
    try:
        settings = get_settings()
        coll = get_collection(
            settings.MONGODB_DB_WARDROBE, "item_feedback"  # Feedback collection
        )

        feedback_doc = {
            "user_id": user_id,
            "item_id": item_id,
            "feedback": feedback,  # 'like', 'dislike', 'irrelevant'
            "reason": reason,  # 'wrong_color', 'wrong_size', etc. (optional)
            "reason_text": reason_text,  # Free-form reason (optional)
            "session_id": session_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        # Upsert to update if feedback already exists for this item
        result = await coll.update_one(
            {"user_id": user_id, "item_id": item_id},
            {"$set": feedback_doc},
            upsert=True,
        )

        return result.acknowledged
    except Exception as e:
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"Error saving item feedback: {e}")
        return False


async def get_disliked_items_for_search(
    user_id: str,
    limit: int = 500,
    decay_days: Optional[int] = None,
) -> List[str]:
    """
    Get list of item IDs that user has marked as disliked or irrelevant.

    Used to soft-de-rank these items in search results.

    Args:
        user_id: The user's clerkId
        limit: Maximum number of disliked items to return
        decay_days: Optional number of days before dislikes expire (default: no cutoff)

    Returns:
        List of item IDs to de-rank
    """
    try:
        settings = get_settings()
        coll = get_collection(settings.MONGODB_DB_WARDROBE, "item_feedback")

        query: Dict[str, Any] = {
            "user_id": user_id,
            "feedback": {"$in": ["dislike", "irrelevant"]},
        }
        if decay_days is not None:
            cutoff = datetime.utcnow() - timedelta(days=max(1, decay_days))
            query["updated_at"] = {"$gte": cutoff}

        # Get items marked as 'dislike' or 'irrelevant'
        cursor = coll.find(query, {"item_id": 1}).limit(limit)

        docs = await cursor.to_list(length=limit)
        return [doc["item_id"] for doc in docs if "item_id" in doc]
    except Exception as e:
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"Error getting disliked items: {e}")
        return []


async def list_disliked_wardrobe_items(
    user_id: str,
    limit: int = 20,
    offset: int = 0,
) -> Dict[str, Any]:
    """
    List disliked wardrobe items with basic metadata.

    Returns only items that exist in the user's wardrobe.
    Sorted by most recent feedback.
    """
    try:
        settings = get_settings()
        feedback_coll = get_collection(settings.MONGODB_DB_WARDROBE, "item_feedback")
        wardrobe_coll = get_collection(
            settings.MONGODB_DB_WARDROBE, settings.MONGODB_COLLECTION_WARDROBE
        )

        capped_limit = min(max(limit, 1), 50)
        safe_offset = max(offset, 0)

        cursor = (
            feedback_coll.find(
                {
                    "user_id": user_id,
                    "feedback": {"$in": ["dislike", "irrelevant"]},
                }
            )
            .sort("updated_at", -1)
            .skip(safe_offset)
            .limit(capped_limit)
        )

        feedback_docs = await cursor.to_list(length=capped_limit)
        item_ids = [doc.get("item_id") for doc in feedback_docs if doc.get("item_id")]

        if not item_ids:
            return {"items": [], "limit": capped_limit, "offset": safe_offset}

        # Fetch wardrobe items by _id and userId
        wardrobe_docs = await wardrobe_coll.find(
            {
                "_id": {"$in": [ObjectId(i) for i in item_ids if ObjectId.is_valid(i)]},
                "userId": user_id,
            }
        ).to_list(length=len(item_ids))

        item_map = {str(doc.get("_id")): doc for doc in wardrobe_docs}

        items = []
        for doc in feedback_docs:
            item_id = doc.get("item_id")
            item_doc = item_map.get(item_id)
            if not item_doc:
                continue
            items.append(
                {
                    "item": _doc_to_item(item_doc),
                    "feedback": {
                        "item_id": item_id,
                        "feedback": doc.get("feedback"),
                        "reason": doc.get("reason"),
                        "reason_text": doc.get("reason_text"),
                        "created_at": doc.get("created_at"),
                        "updated_at": doc.get("updated_at"),
                    },
                }
            )

        return {"items": items, "limit": capped_limit, "offset": safe_offset}
    except Exception as e:
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"Error listing disliked wardrobe items: {e}")
        return {"items": [], "limit": limit, "offset": offset}


async def delete_item_feedback(user_id: str, item_id: str) -> bool:
    """
    Delete a feedback record for a user/item pair.
    """
    try:
        settings = get_settings()
        coll = get_collection(settings.MONGODB_DB_WARDROBE, "item_feedback")
        result = await coll.delete_one({"user_id": user_id, "item_id": item_id})
        return result.acknowledged and result.deleted_count > 0
    except Exception as e:
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"Error deleting item feedback: {e}")
        return False


async def get_liked_items_for_user(
    user_id: str,
    limit: int = 100,
) -> List[Dict[str, Any]]:
    """
    Get items that user has marked as liked.

    Useful for preference learning and recommendations.

    Args:
        user_id: The user's clerkId
        limit: Maximum number of liked items to return

    Returns:
        List of liked item feedback records
    """
    try:
        settings = get_settings()
        coll = get_collection(settings.MONGODB_DB_WARDROBE, "item_feedback")

        cursor = (
            coll.find({"user_id": user_id, "feedback": "like"})
            .sort("created_at", -1)
            .limit(limit)
        )

        docs = await cursor.to_list(length=limit)

        # Sanitize ObjectId
        result = []
        for doc in docs:
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])
            result.append(doc)
        return result
    except Exception as e:
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"Error getting liked items: {e}")
        return []


async def clear_item_feedback_for_user(user_id: str) -> bool:
    """
    Clear all feedback records for a user (privacy control).

    Args:
        user_id: The user's clerkId

    Returns:
        True if cleared successfully
    """
    try:
        settings = get_settings()
        coll = get_collection(settings.MONGODB_DB_WARDROBE, "item_feedback")

        result = await coll.delete_many({"user_id": user_id})
        return result.acknowledged
    except Exception as e:
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"Error clearing item feedback: {e}")
        return False
