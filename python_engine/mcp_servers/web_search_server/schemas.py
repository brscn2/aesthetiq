from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, model_validator

from mcp_servers.shared.schemas import Category


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


class RetailerFilters(BaseModel):
    """Filters for querying retailer items."""

    category: Optional[Category] = Field(
        None,
        description="Item category: TOP, BOTTOM, FOOTWEAR, OUTERWEAR, DRESS, or ACCESSORY. Required for filtering.",
    )
    subCategory: Optional[str] = Field(
        None,
        description="Specific item type like 'Bag', 'Jacket', 'Jeans'. Required for filtering.",
    )
    brand: Optional[str] = Field(
        None, description="Brand name filter (optional, case-insensitive)"
    )
    gender: Optional[str] = Field(
        None,
        description="Gender filter (MEN, WOMEN, UNISEX, KIDS). UNISEX should be allowed for all.",
    )
    colors: Optional[List[str]] = Field(
        default=None, description="List of hex color codes to filter by (optional)"
    )
    extra: Dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="before")
    @classmethod
    def normalize_none_values(cls, data: Any) -> Any:
        """Convert None values to be omitted from the model."""
        if isinstance(data, dict):
            # Remove None values from the dict before validation
            # This prevents "None is not of type 'array'" errors
            return {
                k: v
                for k, v in data.items()
                if v is not None or k in ("category", "subCategory")
            }
        return data

    class Config:
        # Allow validation to succeed with None for optional fields
        validate_default = True


class RetailerSearchRequest(BaseModel):
    query: str
    max_results: int = 5
    disliked_item_ids: Optional[List[str]] = None
    filters: Optional[RetailerFilters] = Field(
        None,
        description="Optional filters for category, subCategory, brand, and colors",
    )
