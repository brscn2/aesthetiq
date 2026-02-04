"""Wardrobe MCP server router."""
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from mcp_servers.wardrobe_server.schemas import (
    Category,
    FilterWardrobeItemsRequest,
    FilterWardrobeItemsResponse,
    GetWardrobeItemResponse,
    GetWardrobeItemRequest,
    SearchWardrobeItemsRequest,
    SearchWardrobeItemsResponse,
    SearchWardrobeItemsResult,
    SaveItemFeedbackRequest,
    SaveItemFeedbackResponse,
    GetDislikedItemsForSearchRequest,
    GetDislikedItemsForSearchResponse,
    ListDislikedWardrobeItemsRequest,
    ListDislikedWardrobeItemsResponse,
    DeleteItemFeedbackRequest,
    DeleteItemFeedbackResponse,
    WardrobeFilters,
)
from mcp_servers.wardrobe_server import tools

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "healthy", "domain": "wardrobe"}


@router.post("/tools/search_wardrobe_items", response_model=SearchWardrobeItemsResponse, operation_id="search_wardrobe_items")
async def search_wardrobe_items(req: SearchWardrobeItemsRequest):
    """
    Semantic search in user's wardrobe using CLIP embeddings.
    
    Returns items ranked by relevance to the query.
    """
    results = await tools.search_wardrobe_items(
        query=req.query,
        user_id=req.user_id,
        filters=req.filters,
        limit=req.limit,
    )
    return SearchWardrobeItemsResponse(
        query=req.query,
        user_id=req.user_id,
        results=[SearchWardrobeItemsResult(item=r["item"], score=r["score"]) for r in results],
    )


@router.post("/tools/get_wardrobe_item", response_model=GetWardrobeItemResponse, operation_id="get_wardrobe_item")
async def get_wardrobe_item(req: GetWardrobeItemRequest):
    """Get a single wardrobe item by ID."""
    item = await tools.get_wardrobe_item(item_id=req.item_id, user_id=req.user_id)
    if not item:
        raise HTTPException(status_code=404, detail="Wardrobe item not found")
    return GetWardrobeItemResponse(item=item)


@router.post("/tools/filter_wardrobe_items", response_model=FilterWardrobeItemsResponse, operation_id="filter_wardrobe_items")
async def filter_wardrobe_items(req: FilterWardrobeItemsRequest):
    """Filter wardrobe items by category, brand, colors, etc."""
    items = await tools.filter_wardrobe_items(user_id=req.user_id, filters=req.filters, limit=req.limit)
    return FilterWardrobeItemsResponse(user_id=req.user_id, items=items)


@router.post("/tools/save_item_feedback", response_model=SaveItemFeedbackResponse, operation_id="save_item_feedback")
async def save_item_feedback(req: SaveItemFeedbackRequest):
    """Save feedback for an item (like, dislike, irrelevant)."""
    success = await tools.save_item_feedback(
        user_id=req.user_id,
        item_id=req.item_id,
        feedback=req.feedback,
        reason=req.reason,
        reason_text=req.reason_text,
        session_id=req.session_id,
    )
    return SaveItemFeedbackResponse(success=success)


@router.post("/tools/get_disliked_items_for_search", response_model=GetDislikedItemsForSearchResponse, operation_id="get_disliked_items_for_search")
async def get_disliked_items_for_search(req: GetDislikedItemsForSearchRequest):
    """Get disliked item IDs for soft de-ranking in search results."""
    item_ids = await tools.get_disliked_items_for_search(
        user_id=req.user_id,
        limit=req.limit,
        decay_days=req.decay_days,
    )
    return GetDislikedItemsForSearchResponse(item_ids=item_ids)


@router.post("/tools/list_disliked_wardrobe_items", response_model=ListDislikedWardrobeItemsResponse, operation_id="list_disliked_wardrobe_items")
async def list_disliked_wardrobe_items(req: ListDislikedWardrobeItemsRequest):
    """List disliked wardrobe items with basic metadata."""
    result = await tools.list_disliked_wardrobe_items(
        user_id=req.user_id,
        limit=req.limit,
        offset=req.offset,
    )
    return ListDislikedWardrobeItemsResponse(
        user_id=req.user_id,
        items=result.get("items", []),
        limit=result.get("limit", req.limit),
        offset=result.get("offset", req.offset),
    )


@router.post("/tools/delete_item_feedback", response_model=DeleteItemFeedbackResponse, operation_id="delete_item_feedback")
async def delete_item_feedback(req: DeleteItemFeedbackRequest):
    """Delete a feedback record for a user/item pair."""
    success = await tools.delete_item_feedback(user_id=req.user_id, item_id=req.item_id)
    return DeleteItemFeedbackResponse(success=success)


@router.get("/test/search")
async def test_search(
    query: str = Query(..., description="Search query"),
    user_id: str = Query(..., description="User's clerkId"),
    category: Optional[str] = Query(None, description="Category filter (TOP, BOTTOM, FOOTWEAR, OUTERWEAR, DRESS, ACCESSORY)"),
    brand: Optional[str] = Query(None, description="Brand filter (partial match)"),
    is_favorite: Optional[bool] = Query(None, description="Filter by favorites"),
):
    """Test endpoint for wardrobe semantic search."""
    # Build filters
    filters = None
    if category or brand or is_favorite is not None:
        cat_enum = None
        if category:
            try:
                cat_enum = Category(category)
            except ValueError:
                pass
        filters = WardrobeFilters(
            category=cat_enum,
            brand=brand,
            isFavorite=is_favorite,
        )
    
    results = await tools.search_wardrobe_items(
        query=query,
        user_id=user_id,
        filters=filters,
        limit=10
    )
    
    return {
        "query": query,
        "user_id": user_id,
        "count": len(results),
        "results": [
            {
                "id": r["item"].id,
                "score": round(r["score"], 4),
                "category": r["item"].category.value,
                "subCategory": r["item"].subCategory,
                "brand": r["item"].brand,
                "colors": r["item"].colors,
                "imageUrl": r["item"].imageUrl,
            }
            for r in results
        ],
    }
