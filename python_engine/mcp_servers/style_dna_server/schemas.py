"""Style DNA server schemas - aligned with backend StyleProfile and ColorAnalysis schemas."""
from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# -----------------------------------------------------------------------------
# Enums (matching backend/src/style-profile/schemas/style-profile.schema.ts)
# -----------------------------------------------------------------------------

class FitPreference(str, Enum):
    SLIM = "slim"
    REGULAR = "regular"
    RELAXED = "relaxed"
    OVERSIZED = "oversized"


class BudgetRange(str, Enum):
    BUDGET = "budget"
    MID_RANGE = "mid-range"
    PREMIUM = "premium"
    LUXURY = "luxury"


# -----------------------------------------------------------------------------
# Nested models for StyleProfile
# -----------------------------------------------------------------------------

class Sizes(BaseModel):
    top: Optional[str] = None
    bottom: Optional[str] = None
    footwear: Optional[str] = None


class FitPreferences(BaseModel):
    top: Optional[FitPreference] = None
    bottom: Optional[FitPreference] = None
    outerwear: Optional[FitPreference] = None


# -----------------------------------------------------------------------------
# StyleProfile model (matching backend/src/style-profile/schemas/style-profile.schema.ts)
# Collection: styleprofiles
# -----------------------------------------------------------------------------

class StyleProfile(BaseModel):
    """Style profile as stored in MongoDB 'styleprofiles' collection."""
    userId: str
    archetype: str
    sliders: Dict[str, float] = Field(default_factory=dict)
    inspirationImageUrls: List[str] = Field(default_factory=list)
    negativeConstraints: List[str] = Field(default_factory=list)
    favoriteBrands: List[str] = Field(default_factory=list)
    sizes: Sizes = Field(default_factory=Sizes)
    fitPreferences: FitPreferences = Field(default_factory=FitPreferences)
    budgetRange: BudgetRange = BudgetRange.MID_RANGE
    maxPricePerItem: Optional[float] = None

    class Config:
        # Allow extra fields from Mongo (e.g. _id, timestamps)
        extra = "ignore"


# -----------------------------------------------------------------------------
# PaletteColor model for ColorAnalysis
# -----------------------------------------------------------------------------

class PaletteColor(BaseModel):
    name: str
    hex: str


# -----------------------------------------------------------------------------
# ColorAnalysis model (matching backend/src/analysis/schemas/color-analysis.schema.ts)
# Collection: coloranalyses
# -----------------------------------------------------------------------------

class ColorAnalysis(BaseModel):
    """Color analysis as stored in MongoDB 'coloranalyses' collection."""
    userId: str
    season: str  # This is the color season (e.g., "Dark Autumn", "Cool Winter")
    contrastLevel: str
    undertone: str
    palette: List[PaletteColor] = Field(default_factory=list)
    faceShape: Optional[str] = None
    imageUrl: Optional[str] = None
    scanDate: Optional[str] = None

    class Config:
        extra = "ignore"


# -----------------------------------------------------------------------------
# StyleDNA - Combined view of StyleProfile + ColorAnalysis for agents
# -----------------------------------------------------------------------------

class StyleDNA(BaseModel):
    """
    Combined style DNA view for MCP tools.
    Merges data from StyleProfile and ColorAnalysis collections.
    """
    user_id: str

    # From ColorAnalysis
    color_season: Optional[str] = None
    contrast_level: Optional[str] = None
    undertone: Optional[str] = None
    palette: List[PaletteColor] = Field(default_factory=list)
    face_shape: Optional[str] = None

    # From StyleProfile
    archetype: Optional[str] = None
    sliders: Dict[str, float] = Field(default_factory=dict)
    inspiration_image_urls: List[str] = Field(default_factory=list)
    negative_constraints: List[str] = Field(default_factory=list)
    favorite_brands: List[str] = Field(default_factory=list)
    sizes: Optional[Sizes] = None
    fit_preferences: Optional[FitPreferences] = None
    budget_range: Optional[BudgetRange] = None
    max_price_per_item: Optional[float] = None

    # Raw documents for advanced use
    raw_style_profile: Dict[str, Any] = Field(default_factory=dict)
    raw_color_analysis: Dict[str, Any] = Field(default_factory=dict)


# -----------------------------------------------------------------------------
# Request/Response models for MCP tool endpoints
# -----------------------------------------------------------------------------

class GetStyleDNARequest(BaseModel):
    user_id: str


class GetStyleDNAResponse(BaseModel):
    style_dna: StyleDNA


class GetColorSeasonRequest(BaseModel):
    user_id: str


class GetColorSeasonResponse(BaseModel):
    user_id: str
    color_season: Optional[str] = None
    contrast_level: Optional[str] = None
    undertone: Optional[str] = None


class GetStyleArchetypeRequest(BaseModel):
    user_id: str


class GetStyleArchetypeResponse(BaseModel):
    user_id: str
    archetype: Optional[str] = None
    sliders: Dict[str, float] = Field(default_factory=dict)


class GetRecommendedColorsRequest(BaseModel):
    user_id: str


class GetRecommendedColorsResponse(BaseModel):
    user_id: str
    colors: List[str] = Field(default_factory=list)
    palette: List[PaletteColor] = Field(default_factory=list)
