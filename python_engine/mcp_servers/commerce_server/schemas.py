"""Commerce server schemas - aligned with backend CommerceItem schema."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from mcp_servers.shared.schemas import Category, SeasonalPaletteScores


# -----------------------------------------------------------------------------
# CommerceItem model (matching backend/src/commerce/schemas/commerce-item.schema.ts)
# Collection: commerceitems
# -----------------------------------------------------------------------------

class CommerceItem(BaseModel):
    """Commerce item as stored in MongoDB 'commerceitems' collection."""
    id: str = Field(..., description="Commerce item id (stringified ObjectId)")
    name: str
    description: Optional[str] = None
    imageUrl: str
    category: Category
    subCategory: Optional[str] = None
    brand: Optional[str] = None
    brandId: Optional[str] = None
    retailerId: str
    colors: List[str] = Field(default_factory=list, description="Hex color codes")
    price: Optional[float] = None
    currency: str = "USD"
    productUrl: str
    sku: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    inStock: bool = True
    seasonalPaletteScores: Optional[SeasonalPaletteScores] = None
    embedding: Optional[List[float]] = Field(None, description="512-dim CLIP embedding")
    metadata: Dict[str, Any] = Field(default_factory=dict)
    # Raw document for advanced use
    raw: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        extra = "ignore"


# -----------------------------------------------------------------------------
# Filter models (matching backend/src/commerce/dto/search-commerce-items.dto.ts)
# -----------------------------------------------------------------------------

class CommerceFilters(BaseModel):
    """Filters for querying commerce items."""
    search: Optional[str] = None  # Text search in name, description, tags
    category: Optional[Category] = None
    subCategory: Optional[str] = None  # Specific type: Jacket, Dress, Sneakers, etc.
    brand: Optional[str] = None  # Brand name (partial match)
    brandId: Optional[str] = None  # Brand ID (exact match)
    retailerId: Optional[str] = None
    color: Optional[str] = None  # Filter by color hex code
    priceMin: Optional[float] = None  # Minimum price
    priceMax: Optional[float] = None  # Maximum price
    tags: Optional[List[str]] = None
    inStock: Optional[bool] = None
    seasonalPalette: Optional[str] = None  # e.g., "WARM_AUTUMN"
    minPaletteScore: Optional[float] = 0.6  # Minimum score threshold
    # Generic escape hatch for additional filters
    extra: Dict[str, Any] = Field(default_factory=dict)


# -----------------------------------------------------------------------------
# Request/Response models for MCP tool endpoints
# -----------------------------------------------------------------------------

class SearchCommerceItemsRequest(BaseModel):
    query: str
    style_dna: Optional[str] = None  # e.g., "WARM_AUTUMN" or "warm_autumn"
    filters: Optional[CommerceFilters] = None
    limit: int = 20


class SearchCommerceItemsResult(BaseModel):
    item: CommerceItem
    score: float
    breakdown: Dict[str, float] = Field(default_factory=dict)


class SearchCommerceItemsResponse(BaseModel):
    query: str
    style_dna: Optional[str] = None
    results: List[SearchCommerceItemsResult]


class GetCommerceItemRequest(BaseModel):
    item_id: str


class GetCommerceItemResponse(BaseModel):
    item: CommerceItem


class FilterCommerceItemsRequest(BaseModel):
    filters: Optional[CommerceFilters] = None
    limit: int = 100


class FilterCommerceItemsResponse(BaseModel):
    items: List[CommerceItem]
