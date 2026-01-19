from __future__ import annotations

from typing import Any, Dict, List

import httpx

from mcp_servers.core.config import get_settings


class TavilyClient:
    def __init__(self):
        settings = get_settings()
        if not settings.TAVILY_API_KEY:
            raise RuntimeError("TAVILY_API_KEY is not configured")
        self.api_key = settings.TAVILY_API_KEY
        self.base_url = settings.TAVILY_BASE_URL.rstrip("/")

    async def search(self, query: str, *, max_results: int = 5) -> List[Dict[str, Any]]:
        """Call Tavily search API.

        Tavily API generally expects POST /search with JSON:
          { api_key, query, max_results }
        """
        url = f"{self.base_url}/search"
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json={"api_key": self.api_key, "query": query, "max_results": max_results})
            resp.raise_for_status()
            data = resp.json()
            # Tavily commonly returns {"results": [...]}
            return data.get("results", [])

