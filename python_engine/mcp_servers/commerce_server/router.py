"""Commerce MCP server router."""
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from mcp_servers.commerce_server.schemas import (
    Category,
    FilterCommerceItemsRequest,
    FilterCommerceItemsResponse,
    GetCommerceItemResponse,
    GetCommerceItemRequest,
    SearchCommerceItemsRequest,
    SearchCommerceItemsResponse,
    SearchCommerceItemsResult,
    CommerceFilters,
)
from mcp_servers.commerce_server import tools

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "healthy", "domain": "commerce"}


@router.post("/tools/search_commerce_items", response_model=SearchCommerceItemsResponse, operation_id="search_commerce_items")
async def search_commerce_items(req: SearchCommerceItemsRequest):
    """
    Search commerce items using semantic similarity + style DNA ranking.
    
    Uses CLIP embeddings for semantic search and pre-computed seasonalPaletteScores
    for color season matching.
    """
    results = await tools.search_commerce_items(
        query=req.query,
        style_dna=req.style_dna,
        filters=req.filters,
        limit=req.limit,
    )
    return SearchCommerceItemsResponse(
        query=req.query,
        style_dna=req.style_dna,
        results=[
            SearchCommerceItemsResult(
                item=r["item"],
                score=r["score"],
                breakdown=r.get("breakdown") or {}
            )
            for r in results
        ],
    )


@router.post("/tools/get_commerce_item", response_model=GetCommerceItemResponse, operation_id="get_commerce_item")
async def get_commerce_item(req: GetCommerceItemRequest):
    """Get a single commerce item by ID."""
    item = await tools.get_commerce_item(item_id=req.item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Commerce item not found")
    return GetCommerceItemResponse(item=item)


@router.post("/tools/filter_commerce_items", response_model=FilterCommerceItemsResponse, operation_id="filter_commerce_items")
async def filter_commerce_items(req: FilterCommerceItemsRequest):
    """Filter commerce items by category, brand, price range, etc."""
    items = await tools.filter_commerce_items(filters=req.filters, limit=req.limit)
    return FilterCommerceItemsResponse(items=items)


@router.get("/test/search")
async def test_search(
    query: str = Query(..., description="Search query"),
    style_dna: Optional[str] = Query(None, description="User's color season (e.g., WARM_AUTUMN)"),
    category: Optional[str] = Query(None, description="Category filter (TOP, BOTTOM, SHOE, ACCESSORY)"),
    brand: Optional[str] = Query(None, description="Brand filter (partial match)"),
    price_min: Optional[float] = Query(None, description="Minimum price"),
    price_max: Optional[float] = Query(None, description="Maximum price"),
    in_stock: Optional[bool] = Query(None, description="Filter by stock availability"),
):
    """Test endpoint for commerce semantic search with style DNA ranking."""
    # Build filters
    filters = None
    if category or brand or price_min is not None or price_max is not None or in_stock is not None:
        cat_enum = None
        if category:
            try:
                cat_enum = Category(category)
            except ValueError:
                pass
        filters = CommerceFilters(
            category=cat_enum,
            brand=brand,
            priceMin=price_min,
            priceMax=price_max,
            inStock=in_stock,
        )
    
    results = await tools.search_commerce_items(
        query=query,
        style_dna=style_dna,
        filters=filters,
        limit=10
    )
    
    return {
        "query": query,
        "style_dna": style_dna,
        "count": len(results),
        "results": [
            {
                "id": r["item"].id,
                "name": r["item"].name,
                "score": round(r["score"], 4),
                "breakdown": r["breakdown"],
                "category": r["item"].category.value,
                "subCategory": r["item"].subCategory,
                "brand": r["item"].brand,
                "price": r["item"].price,
                "currency": r["item"].currency,
                "colors": r["item"].colors,
                "imageUrl": r["item"].imageUrl,
                "productUrl": r["item"].productUrl,
                "inStock": r["item"].inStock,
            }
            for r in results
        ],
    }
