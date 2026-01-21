"""Wardrobe server schemas - aligned with backend WardrobeItem schema."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# -----------------------------------------------------------------------------
# Enums (matching backend/src/wardrobe/schemas/wardrobe-item.schema.ts)
# -----------------------------------------------------------------------------

class Category(str, Enum):
    TOP = "TOP"
    BOTTOM = "BOTTOM"
    SHOE = "SHOE"
    ACCESSORY = "ACCESSORY"


# -----------------------------------------------------------------------------
# SeasonalPaletteScores type (matching backend)
# -----------------------------------------------------------------------------

class SeasonalPaletteScores(BaseModel):
    """Seasonal color palette compatibility scores (0-1)."""
    DARK_AUTUMN: Optional[float] = None
    DARK_WINTER: Optional[float] = None
    LIGHT_SPRING: Optional[float] = None
    LIGHT_SUMMER: Optional[float] = None
    MUTED_AUTUMN: Optional[float] = None
    MUTED_SUMMER: Optional[float] = None
    BRIGHT_SPRING: Optional[float] = None
    BRIGHT_WINTER: Optional[float] = None
    WARM_AUTUMN: Optional[float] = None
    WARM_SPRING: Optional[float] = None
    COOL_WINTER: Optional[float] = None
    COOL_SUMMER: Optional[float] = None

    class Config:
        extra = "allow"  # Allow extra fields for flexibility


# -----------------------------------------------------------------------------
# WardrobeItem model (matching backend/src/wardrobe/schemas/wardrobe-item.schema.ts)
# Collection: wardrobeitems
# -----------------------------------------------------------------------------

class WardrobeItem(BaseModel):
    """Wardrobe item as stored in MongoDB 'wardrobeitems' collection."""
    id: str = Field(..., description="Wardrobe item id (stringified ObjectId)")
    userId: str
    imageUrl: str
    processedImageUrl: Optional[str] = None
    category: Category
    subCategory: Optional[str] = None
    brand: Optional[str] = None
    retailerId: Optional[str] = None  # References Retailer collection (matches backend schema)
    colors: List[str] = Field(default_factory=list, description="Hex color codes")
    notes: Optional[str] = None
    isFavorite: bool = False
    lastWorn: Optional[datetime] = None
    seasonalPaletteScores: Optional[SeasonalPaletteScores] = None
    embedding: Optional[List[float]] = Field(None, description="512-dim CLIP embedding")
    # Raw document for advanced use
    raw: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        extra = "ignore"


# -----------------------------------------------------------------------------
# Filter models
# -----------------------------------------------------------------------------

class WardrobeFilters(BaseModel):
    """Filters for querying wardrobe items."""
    category: Optional[Category] = None
    subCategory: Optional[str] = None
    brand: Optional[str] = None
    colors: Optional[List[str]] = None  # Filter by colors (any match)
    isFavorite: Optional[bool] = None
    # Generic escape hatch for additional filters
    extra: Dict[str, Any] = Field(default_factory=dict)


# -----------------------------------------------------------------------------
# Request/Response models for MCP tool endpoints
# -----------------------------------------------------------------------------

class SearchWardrobeItemsRequest(BaseModel):
    query: str
    user_id: str
    filters: Optional[WardrobeFilters] = None
    limit: int = 20


class SearchWardrobeItemsResult(BaseModel):
    item: WardrobeItem
    score: float


class SearchWardrobeItemsResponse(BaseModel):
    query: str
    user_id: str
    results: List[SearchWardrobeItemsResult]


class GetWardrobeItemRequest(BaseModel):
    item_id: str
    user_id: str


class GetWardrobeItemResponse(BaseModel):
    item: WardrobeItem


class FilterWardrobeItemsRequest(BaseModel):
    user_id: str
    filters: Optional[WardrobeFilters] = None
    limit: int = 100


class FilterWardrobeItemsResponse(BaseModel):
    user_id: str
    items: List[WardrobeItem]
