"""Shared schemas used across multiple MCP servers."""
from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel


# -----------------------------------------------------------------------------
# Enums (matching backend schemas)
# -----------------------------------------------------------------------------

class Category(str, Enum):
    """Item category enum - used across wardrobe, commerce, and web search."""
    TOP = "TOP"
    BOTTOM = "BOTTOM"
    OUTERWEAR = "OUTERWEAR"
    FOOTWEAR = "FOOTWEAR"
    ACCESSORY = "ACCESSORY"
    DRESS = "DRESS"


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
