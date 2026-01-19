"""Style DNA MCP tools - fetches from StyleProfile and ColorAnalysis collections."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from mcp_servers.style_dna_server import db
from mcp_servers.style_dna_server.color_mappings import recommended_colors_for_season
from mcp_servers.style_dna_server.schemas import (
    StyleDNA,
    PaletteColor,
    Sizes,
    FitPreferences,
    BudgetRange,
)


def _sanitize(doc: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Remove/stringify ObjectId for JSON serialization."""
    if not doc:
        return {}
    doc = dict(doc)
    _id = doc.pop("_id", None)
    if _id is not None:
        doc["_id"] = str(_id)
    return doc


def _parse_sizes(doc: Dict[str, Any]) -> Optional[Sizes]:
    """Parse sizes from style profile document."""
    sizes_data = doc.get("sizes")
    if not sizes_data or not isinstance(sizes_data, dict):
        return None
    return Sizes(
        top=sizes_data.get("top"),
        bottom=sizes_data.get("bottom"),
        shoe=sizes_data.get("shoe"),
    )


def _parse_fit_preferences(doc: Dict[str, Any]) -> Optional[FitPreferences]:
    """Parse fit preferences from style profile document."""
    fit_data = doc.get("fitPreferences")
    if not fit_data or not isinstance(fit_data, dict):
        return None
    return FitPreferences(
        top=fit_data.get("top"),
        bottom=fit_data.get("bottom"),
        outerwear=fit_data.get("outerwear"),
    )


def _parse_budget_range(doc: Dict[str, Any]) -> Optional[BudgetRange]:
    """Parse budget range from style profile document."""
    budget = doc.get("budgetRange")
    if not budget:
        return None
    try:
        return BudgetRange(budget)
    except ValueError:
        return None


def _parse_palette(doc: Dict[str, Any]) -> List[PaletteColor]:
    """Parse palette from color analysis document."""
    palette_data = doc.get("palette", [])
    result = []
    for item in palette_data:
        if isinstance(item, dict) and "name" in item and "hex" in item:
            result.append(PaletteColor(name=item["name"], hex=item["hex"]))
    return result


async def get_style_dna(user_id: str) -> Optional[StyleDNA]:
    """
    Get complete style DNA by combining data from StyleProfile and ColorAnalysis.
    
    Returns None only if both collections have no data for this user.
    """
    # Fetch from both collections in parallel would be nice, but for simplicity:
    style_profile = await db.get_style_profile(user_id)
    color_analysis = await db.get_color_analysis(user_id)
    
    if not style_profile and not color_analysis:
        return None
    
    style_doc = style_profile or {}
    color_doc = color_analysis or {}
    
    return StyleDNA(
        user_id=user_id,
        # From ColorAnalysis
        color_season=color_doc.get("season"),
        contrast_level=color_doc.get("contrastLevel"),
        undertone=color_doc.get("undertone"),
        palette=_parse_palette(color_doc),
        face_shape=color_doc.get("faceShape"),
        # From StyleProfile
        archetype=style_doc.get("archetype"),
        sliders=style_doc.get("sliders", {}),
        inspiration_image_urls=style_doc.get("inspirationImageUrls", []),
        negative_constraints=style_doc.get("negativeConstraints", []),
        favorite_brands=style_doc.get("favoriteBrands", []),
        sizes=_parse_sizes(style_doc),
        fit_preferences=_parse_fit_preferences(style_doc),
        budget_range=_parse_budget_range(style_doc),
        max_price_per_item=style_doc.get("maxPricePerItem"),
        # Raw documents
        raw_style_profile=_sanitize(style_profile),
        raw_color_analysis=_sanitize(color_analysis),
    )


async def get_color_season(user_id: str) -> Optional[str]:
    """Get color season from the user's most recent color analysis."""
    color_analysis = await db.get_color_analysis(user_id)
    if color_analysis:
        return color_analysis.get("season")
    return None


async def get_contrast_level(user_id: str) -> Optional[str]:
    """Get contrast level from the user's color analysis."""
    color_analysis = await db.get_color_analysis(user_id)
    if color_analysis:
        return color_analysis.get("contrastLevel")
    return None


async def get_undertone(user_id: str) -> Optional[str]:
    """Get undertone from the user's color analysis."""
    color_analysis = await db.get_color_analysis(user_id)
    if color_analysis:
        return color_analysis.get("undertone")
    return None


async def get_style_archetype(user_id: str) -> Optional[str]:
    """Get style archetype from the user's style profile."""
    style_profile = await db.get_style_profile(user_id)
    if style_profile:
        return style_profile.get("archetype")
    return None


async def get_style_sliders(user_id: str) -> Dict[str, float]:
    """Get style sliders from the user's style profile."""
    style_profile = await db.get_style_profile(user_id)
    if style_profile:
        return style_profile.get("sliders", {})
    return {}


async def get_recommended_colors(user_id: str) -> List[str]:
    """
    Get recommended colors based on the user's color season.
    
    Returns hex color codes from the seasonal palette.
    """
    season = await get_color_season(user_id)
    return recommended_colors_for_season(season)


async def get_user_palette(user_id: str) -> List[PaletteColor]:
    """
    Get the user's personalized color palette from their color analysis.
    
    This is the specific palette generated during their color analysis scan.
    """
    color_analysis = await db.get_color_analysis(user_id)
    if color_analysis:
        return _parse_palette(color_analysis)
    return []
