"""Wardrobe server schemas - aligned with backend WardrobeItem schema."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from mcp_servers.shared.schemas import Category, SeasonalPaletteScores


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


# -----------------------------------------------------------------------------
# Feedback request/response models
# -----------------------------------------------------------------------------

class SaveItemFeedbackRequest(BaseModel):
    user_id: str
    item_id: str
    feedback: str
    reason: Optional[str] = None
    reason_text: Optional[str] = None
    session_id: Optional[str] = None


class SaveItemFeedbackResponse(BaseModel):
    success: bool


class GetDislikedItemsForSearchRequest(BaseModel):
    user_id: str
    limit: int = 500
    decay_days: Optional[int] = None


class GetDislikedItemsForSearchResponse(BaseModel):
    item_ids: List[str]


class ItemFeedbackMetadata(BaseModel):
    item_id: str
    feedback: str
    reason: Optional[str] = None
    reason_text: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DislikedWardrobeItemRecord(BaseModel):
    item: WardrobeItem
    feedback: ItemFeedbackMetadata


class ListDislikedWardrobeItemsRequest(BaseModel):
    user_id: str
    limit: int = 20
    offset: int = 0


class ListDislikedWardrobeItemsResponse(BaseModel):
    user_id: str
    items: List[DislikedWardrobeItemRecord]
    limit: int
    offset: int


class DeleteItemFeedbackRequest(BaseModel):
    user_id: str
    item_id: str


class DeleteItemFeedbackResponse(BaseModel):
    success: bool
