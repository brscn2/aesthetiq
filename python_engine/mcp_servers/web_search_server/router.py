from fastapi import APIRouter, Query

from mcp_servers.web_search_server.schemas import (
    BlogsRequest,
    RetailerSearchRequest,
    TrendsRequest,
    WebSearchRequest,
    WebSearchResponse,
)
from mcp_servers.web_search_server import tools

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "healthy", "domain": "web-search"}


@router.post(
    "/tools/web_search", response_model=WebSearchResponse, operation_id="web_search"
)
async def web_search(req: WebSearchRequest):
    results = await tools.web_search(
        req.query,
        max_results=req.max_results,
        filter_retailers_only=req.filter_retailers_only,
        scrape_og_tags=req.scrape_og_tags,
    )
    return WebSearchResponse(query=req.query, results=results)


@router.post(
    "/tools/search_trends",
    response_model=WebSearchResponse,
    operation_id="search_trends",
)
async def search_trends(req: TrendsRequest):
    results = await tools.search_trends(req.topic, max_results=req.max_results)
    return WebSearchResponse(query=req.topic, results=results)


@router.post(
    "/tools/search_blogs", response_model=WebSearchResponse, operation_id="search_blogs"
)
async def search_blogs(req: BlogsRequest):
    results = await tools.search_blogs(req.query, max_results=req.max_results)
    return WebSearchResponse(query=req.query, results=results)


@router.post(
    "/tools/search_retailer_items",
    response_model=WebSearchResponse,
    operation_id="search_retailer_items",
)
async def search_retailer_items(req: RetailerSearchRequest):
    """Search for clothing items from retailer websites only.

    This endpoint filters results to only include allowed retailer domains
    (UNIQLO, Zalando, etc.) and scrapes Open Graph tags for better metadata.

    Supports filtering by category, subCategory, brand, and colors to ensure
    results match the specified criteria (e.g., only return ACCESSORY/Bag items).
    """
    # Convert schema filters to tool filters if provided
    tool_filters = None
    if req.filters:
        from mcp_servers.web_search_server.tools import RetailerFilters

        # Only pass non-None values to avoid validation errors
        filter_kwargs = {}
        if req.filters.category is not None:
            filter_kwargs["category"] = req.filters.category
        if req.filters.subCategory is not None:
            filter_kwargs["subCategory"] = req.filters.subCategory
        if req.filters.brand is not None:
            filter_kwargs["brand"] = req.filters.brand
        if req.filters.colors is not None:
            filter_kwargs["colors"] = req.filters.colors
        if req.filters.extra:
            filter_kwargs["extra"] = req.filters.extra

        # Only create filter object if there are actual filters
        if filter_kwargs:
            tool_filters = RetailerFilters(**filter_kwargs)

    # Only pass disliked_item_ids if not None and not empty
    disliked_ids = req.disliked_item_ids if req.disliked_item_ids else None

    results = await tools.search_retailer_items(
        req.query,
        max_results=req.max_results,
        disliked_item_ids=disliked_ids,
        filters=tool_filters,
    )
    return WebSearchResponse(query=req.query, results=results)


@router.get("/test/search")
async def test_search(query: str = Query(...)):
    results = await tools.web_search(query, max_results=5)
    return {"query": query, "results": [r.model_dump(exclude={"raw"}) for r in results]}
