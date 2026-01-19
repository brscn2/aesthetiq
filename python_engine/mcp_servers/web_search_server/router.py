from fastapi import APIRouter, Query

from mcp_servers.web_search_server.schemas import (
    BlogsRequest,
    TrendsRequest,
    WebSearchRequest,
    WebSearchResponse,
)
from mcp_servers.web_search_server import tools

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "healthy", "domain": "web-search"}


@router.post("/tools/web_search", response_model=WebSearchResponse, operation_id="web_search")
async def web_search(req: WebSearchRequest):
    results = await tools.web_search(req.query, max_results=req.max_results)
    return WebSearchResponse(query=req.query, results=results)


@router.post("/tools/search_trends", response_model=WebSearchResponse, operation_id="search_trends")
async def search_trends(req: TrendsRequest):
    results = await tools.search_trends(req.topic, max_results=req.max_results)
    return WebSearchResponse(query=req.topic, results=results)


@router.post("/tools/search_blogs", response_model=WebSearchResponse, operation_id="search_blogs")
async def search_blogs(req: BlogsRequest):
    results = await tools.search_blogs(req.query, max_results=req.max_results)
    return WebSearchResponse(query=req.query, results=results)


@router.get("/test/search")
async def test_search(query: str = Query(...)):
    results = await tools.web_search(query, max_results=5)
    return {"query": query, "results": [r.model_dump(exclude={"raw"}) for r in results]}

