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


@router.get("/test/search")
async def test_search(
    query: str = Query(..., description="Search query"),
    user_id: str = Query(..., description="User's clerkId"),
    category: Optional[str] = Query(None, description="Category filter (TOP, BOTTOM, SHOE, ACCESSORY)"),
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
