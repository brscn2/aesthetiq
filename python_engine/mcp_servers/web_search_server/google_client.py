"""Google Custom Search API client."""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import httpx

from mcp_servers.core.config import get_settings

logger = logging.getLogger(__name__)


class GoogleCustomSearchClient:
    """Client for Google Custom Search JSON API (v1)."""
    
    def __init__(self):
        settings = get_settings()
        if not settings.GOOGLE_API_KEY:
            raise RuntimeError("GOOGLE_API_KEY is not configured")
        if not settings.GOOGLE_CX:
            raise RuntimeError("GOOGLE_CX (Custom Search Engine ID) is not configured")
        
        self.api_key = settings.GOOGLE_API_KEY
        self.cx = settings.GOOGLE_CX
        self.base_url = "https://www.googleapis.com/customsearch/v1"
    
    async def search(
        self,
        query: str,
        *,
        max_results: int = 10,
        site_restrict: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """Call Google Custom Search API.
        
        Args:
            query: Search query string
            max_results: Maximum number of results to return (Google allows up to 10 per request)
            site_restrict: Optional list of domains to restrict search to (e.g., ["uniqlo.com", "zalando.com"])
        
        Returns:
            List of search result dictionaries with keys: title, link, snippet, etc.
        """
        # Build query with site restrictions if provided
        search_query = query
        if site_restrict:
            # Format: "query site:domain1.com OR site:domain2.com"
            site_filters = " OR ".join([f"site:{domain}" for domain in site_restrict])
            search_query = f"{query} ({site_filters})"
        
        # Google Custom Search API allows max 10 results per request
        num_results = min(max_results, 10)
        
        url = self.base_url
        params: Dict[str, Any] = {
            "key": self.api_key,
            "cx": self.cx,
            "q": search_query,
            "num": num_results,
        }
        
        results: List[Dict[str, Any]] = []
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()
                
                # Google returns results in "items" array
                items = data.get("items", [])
                
                for item in items:
                    # Convert Google result format to our format
                    result = {
                        "title": item.get("title", ""),
                        "url": item.get("link", ""),
                        "content": item.get("snippet", ""),
                        "score": None,  # Google doesn't provide scores
                        "raw": item,
                    }
                    results.append(result)
                
                logger.info(f"Google Custom Search returned {len(results)} results for query: {query[:50]}")
                
        except httpx.HTTPStatusError as e:
            logger.error(f"Google Custom Search API error: {e.response.status_code} - {e.response.text}")
            # Return empty results on API error
            return []
        except Exception as e:
            logger.error(f"Google Custom Search error: {e}")
            return []
        
        return results
