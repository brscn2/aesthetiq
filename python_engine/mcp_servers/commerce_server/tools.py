"""Commerce MCP tools - fetches commerce items from commerceitems collection."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

import numpy as np
from bson import ObjectId

from mcp_servers.shared.embeddings_client import embed_text
from mcp_servers.commerce_server import db
from mcp_servers.commerce_server.schemas import (
    CommerceFilters,
    CommerceItem,
    Category,
    SeasonalPaletteScores,
)
from mcp_servers.commerce_server.style_ranking import (
    score_from_palette_scores,
    combine_scores,
)


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


def _doc_to_item(doc: Dict[str, Any]) -> CommerceItem:
    """Convert MongoDB document to CommerceItem model.
    
    Handles both commerceitems and retailitems schema formats:
    - commerceitems: nested price object, primaryImageUrl, sourceUrl
    - retailitems: flat price, imageUrl, productUrl
    """
    # Normalize fields to handle commerceitems schema
    normalized_doc = _normalize_item_fields(doc)
    
    raw = _sanitize_mongo_doc(normalized_doc)
    item_id = str(normalized_doc.get("_id") or normalized_doc.get("id") or "")
    
    return CommerceItem(
        id=item_id,
        name=normalized_doc.get("name", ""),
        description=normalized_doc.get("description"),
        imageUrl=normalized_doc.get("imageUrl", ""),
        category=_parse_category(normalized_doc),
        subCategory=normalized_doc.get("subCategory"),
        brand=normalized_doc.get("brand"),
        brandId=str(normalized_doc["brandId"]) if normalized_doc.get("brandId") else None,
        retailerId=str(normalized_doc.get("retailerId", "")),
        colors=list(normalized_doc.get("colors") or []),
        price=normalized_doc.get("price"),
        currency=normalized_doc.get("currency", "USD"),
        productUrl=normalized_doc.get("productUrl", ""),
        sku=normalized_doc.get("sku"),
        tags=list(normalized_doc.get("tags") or []),
        inStock=normalized_doc.get("inStock", True),
        seasonalPaletteScores=_parse_seasonal_scores(normalized_doc),
        embedding=normalized_doc.get("embedding"),
        metadata=normalized_doc.get("metadata", {}),
        raw=raw,
    )


def _normalize_item_fields(item: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize commerceitems schema fields to flat structure expected by CommerceItem model.
    
    Converts:
    - price.amount/100 → price (float, handles None gracefully → 0.0)
    - price.currency → currency (default "USD")
    - primaryImageUrl or imageUrls[0] → imageUrl
    - sourceUrl → productUrl
    
    Args:
        item: Raw item document from MongoDB (commerceitems or retailitems)
    
    Returns:
        Normalized item dict with flat field structure
    """
    normalized = item.copy()
    
    # Handle nested price structure (commerceitems) vs flat price (retailitems)
    if "price" in item and isinstance(item["price"], dict):
        # commerceitems: {amount: 2995, currency: "EUR", formatted: "29.95 €"}
        price_obj = item["price"]
        normalized["price"] = price_obj.get("amount", 0) / 100.0 if price_obj.get("amount") is not None else 0.0
        normalized["currency"] = price_obj.get("currency", "USD")
    elif "price" not in item or item.get("price") is None:
        # Handle missing price
        normalized["price"] = 0.0
        normalized.setdefault("currency", "USD")
    
    # Handle image URL mapping: primaryImageUrl or imageUrls[0] → imageUrl
    if "primaryImageUrl" in item:
        normalized["imageUrl"] = item["primaryImageUrl"]
    elif "imageUrls" in item and isinstance(item["imageUrls"], list) and len(item["imageUrls"]) > 0:
        normalized["imageUrl"] = item["imageUrls"][0]
    elif "imageUrl" not in item:
        normalized["imageUrl"] = ""
    
    # Handle product URL mapping: sourceUrl → productUrl
    if "sourceUrl" in item:
        normalized["productUrl"] = item["sourceUrl"]
    elif "productUrl" not in item:
        normalized["productUrl"] = ""
    
    return normalized


def _item_to_text(item: CommerceItem) -> str:
    """Convert commerce item to text for embedding."""
    parts: List[str] = []
    
    # Name is primary
    if item.name:
        parts.append(item.name)
    
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
    
    # Tags
    if item.tags:
        parts.append(" ".join(item.tags))
    
    # Description (truncated)
    if item.description:
        desc = item.description[:200]  # Limit description length
        parts.append(desc)
    
    return " | ".join(parts) if parts else f"commerce item {item.id}"


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    """Compute cosine similarity between two vectors."""
    va = np.asarray(a, dtype=np.float32)
    vb = np.asarray(b, dtype=np.float32)
    denom = (np.linalg.norm(va) * np.linalg.norm(vb)) + 1e-12
    return float(np.dot(va, vb) / denom)


async def filter_commerce_items(
    filters: Optional[CommerceFilters] = None,
    *,
    limit: int = 100
) -> List[CommerceItem]:
    """
    Filter items by criteria (searches commerceitems collection).
    
    Args:
        filters: Optional filters (category, brand, price range, etc.)
        limit: Maximum number of items to return
    
    Returns:
        List of items matching the filters
    """
    filter_dict = filters.model_dump(exclude_none=True) if filters else None
    docs = await db.find_commerce_items(filters=filter_dict, limit=limit, use_retail_collection=False)
    return [_doc_to_item(d) for d in docs]


async def get_commerce_item(item_id: str) -> Optional[CommerceItem]:
    """
    Get a single item by ID (searches commerceitems collection).
    
    Args:
        item_id: The item's _id
    
    Returns:
        CommerceItem or None if not found
    """
    doc = await db.get_commerce_item(item_id=item_id, use_retail_collection=False)
    if not doc:
        return None
    return _doc_to_item(doc)


async def search_commerce_items(
    query: str,
    style_dna: Optional[str] = None,
    filters: Optional[CommerceFilters] = None,
    *,
    limit: int = 20,
    candidate_pool: int = 200,
) -> List[Dict[str, Any]]:
    """
    Search commerce items using semantic similarity + style DNA ranking.
    
    Uses CLIP embeddings for similarity search. If items have pre-computed
    embeddings, uses those; otherwise falls back to on-the-fly embedding.
    
    Style DNA ranking uses pre-computed seasonalPaletteScores for accurate
    color season matching.
    
    Implements commerceitems-first strategy with optional retailitems fallback:
    1. Check commerceitems collection for items with embeddings
    2. If empty and ENABLE_RETAILITEMS_FALLBACK=True, check retailitems collection
    3. Perform semantic search and ranking
    
    Args:
        query: Search query text
        style_dna: User's color season (e.g., "WARM_AUTUMN" or "warm_autumn")
        filters: Optional filters to narrow down candidates
        limit: Maximum number of results to return
        candidate_pool: Maximum candidates to consider for ranking
    
    Returns:
        List of {"item": CommerceItem, "score": float, "breakdown": dict}
        sorted by relevance
    """
    from mcp_servers.core.config import get_settings
    settings = get_settings()
    
    filter_dict = filters.model_dump(exclude_none=True) if filters else None
    
    # First, try to get items with pre-computed embeddings from commerceitems collection
    docs = await db.find_items_with_embeddings(
        filters=filter_dict,
        limit=candidate_pool,
        use_retail_collection=False  # Use commerceitems collection
    )
    
    # If no items with embeddings in commerceitems, fall back to all commerceitems
    if not docs:
        docs = await db.find_commerce_items(
            filters=filter_dict,
            limit=candidate_pool,
            use_retail_collection=False  # Use commerceitems collection
        )
    
    # If still no items and retailitems fallback is enabled, try retailitems collection
    if not docs and settings.ENABLE_RETAILITEMS_FALLBACK:
        # Try retailitems with embeddings first
        docs = await db.find_items_with_embeddings(
            filters=filter_dict,
            limit=candidate_pool,
            use_retail_collection=True  # Use retailitems collection
        )
        
        # If still no items with embeddings, fall back to all retailitems
        if not docs:
            docs = await db.find_commerce_items(
                filters=filter_dict,
                limit=candidate_pool,
                use_retail_collection=True  # Use retailitems collection
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
        
        semantic_score = _cosine_similarity(query_emb, item_emb)
        
        # Use pre-computed seasonalPaletteScores for style DNA ranking
        palette_scores_dict = None
        if item.seasonalPaletteScores:
            palette_scores_dict = item.seasonalPaletteScores.model_dump(exclude_none=True)
        
        season_score = score_from_palette_scores(palette_scores_dict, style_dna)
        total, breakdown = combine_scores(semantic_score, season_score)
        
        results.append({"item": item, "score": total, "breakdown": breakdown})
    
    # Sort by score descending
    results.sort(key=lambda r: r["score"], reverse=True)
    return results[:max(1, limit)]
