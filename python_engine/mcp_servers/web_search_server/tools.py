from __future__ import annotations

from typing import Any, Dict, List

from mcp_servers.web_search_server.schemas import WebSearchResult
from mcp_servers.web_search_server.tavily_client import TavilyClient


def _to_result(raw: Dict[str, Any]) -> WebSearchResult:
    return WebSearchResult(
        title=raw.get("title") or raw.get("name") or "",
        url=raw.get("url") or raw.get("link") or "",
        content=raw.get("content") or raw.get("snippet"),
        score=raw.get("score"),
        raw=raw,
    )


async def web_search(query: str, max_results: int = 5) -> List[WebSearchResult]:
    client = TavilyClient()
    results = await client.search(query, max_results=max_results)
    return [_to_result(r) for r in results]


async def search_trends(topic: str, max_results: int = 5) -> List[WebSearchResult]:
    q = f"fashion trends {topic} 2026"
    return await web_search(q, max_results=max_results)


async def search_blogs(query: str, max_results: int = 5) -> List[WebSearchResult]:
    q = f"{query} site:fashion blog OR site:blog"
    return await web_search(q, max_results=max_results)

