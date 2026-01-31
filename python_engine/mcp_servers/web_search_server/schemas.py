from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class WebSearchResult(BaseModel):
    title: str
    url: str
    content: Optional[str] = None
    score: Optional[float] = None
    raw: Dict[str, Any] = Field(default_factory=dict)
    # Open Graph metadata
    og_image: Optional[str] = None
    og_title: Optional[str] = None
    og_description: Optional[str] = None


class WebSearchRequest(BaseModel):
    query: str
    max_results: int = 5
    filter_retailers_only: bool = False
    scrape_og_tags: bool = True


class WebSearchResponse(BaseModel):
    query: str
    results: List[WebSearchResult]


class TrendsRequest(BaseModel):
    topic: str
    max_results: int = 5


class BlogsRequest(BaseModel):
    query: str
    max_results: int = 5


class RetailerSearchRequest(BaseModel):
    query: str
    max_results: int = 5

