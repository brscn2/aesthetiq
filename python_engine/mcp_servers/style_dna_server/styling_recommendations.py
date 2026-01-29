"""
Styling recommendations based on color analysis.

This module provides recommendations for:
- Jewelry metals (gold/brass vs silver/platinum)
- Makeup colors
- Hair colors

Recommendations are derived from the user's color season and undertone.
"""
from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel


class MetalType(str, Enum):
    """Metal types for jewelry recommendations."""
    GOLD = "gold"
    BRASS = "brass"
    ROSE_GOLD = "rose_gold"
    COPPER = "copper"
    SILVER = "silver"
    PLATINUM = "platinum"
    WHITE_GOLD = "white_gold"
    GUNMETAL = "gunmetal"


class JewelryRecommendation(BaseModel):
    """Jewelry recommendation for a user based on their color analysis."""
    recommended_metals: List[MetalType]
    recommendation_reason: str
    undertone: str
    styling_tips: List[str]


# Warm undertone metals (Autumn, Spring seasons)
WARM_METALS = [MetalType.GOLD, MetalType.BRASS, MetalType.ROSE_GOLD, MetalType.COPPER]

# Cool undertone metals (Winter, Summer seasons)
COOL_METALS = [MetalType.SILVER, MetalType.PLATINUM, MetalType.WHITE_GOLD, MetalType.GUNMETAL]


# Season-specific styling tips for jewelry
SEASON_JEWELRY_TIPS = {
    # Warm seasons (Autumn)
    "dark_autumn": [
        "Choose antique gold and burnished brass for a rich, sophisticated look",
        "Copper and bronze pieces complement your deep, warm coloring beautifully",
        "Avoid bright, shiny silver - opt for oxidized silver if needed",
        "Gemstones like amber, topaz, and garnet enhance your palette",
    ],
    "warm_autumn": [
        "Rich gold tones harmonize perfectly with your golden undertones",
        "Brass and copper add warmth that complements your natural coloring",
        "Rose gold is especially flattering for your warm complexion",
        "Look for jewelry with warm gemstones like citrine, coral, and tiger's eye",
    ],
    "muted_autumn": [
        "Soft, matte gold finishes work best with your gentle coloring",
        "Antique brass and weathered copper add depth without overwhelming",
        "Avoid high-shine metals - opt for brushed or satin finishes",
        "Earth-toned gemstones like jasper and agate complement your palette",
    ],
    
    # Warm seasons (Spring)
    "light_spring": [
        "Light gold and delicate rose gold enhance your fresh, bright coloring",
        "Choose polished, shiny finishes that reflect light beautifully",
        "Yellow gold pieces bring out the warmth in your complexion",
        "Gemstones like peridot, aquamarine, and light citrine are ideal",
    ],
    "warm_spring": [
        "Bright, polished gold is your signature metal",
        "Yellow gold and brass complement your sunny, warm undertones",
        "Rose gold adds a playful, romantic touch to your look",
        "Coral, turquoise, and warm pearls are excellent gemstone choices",
    ],
    "bright_spring": [
        "High-shine gold and brass make a bold statement with your vibrant coloring",
        "Choose polished finishes that catch the light",
        "Yellow gold pieces enhance your natural warmth and energy",
        "Bright gemstones like coral, turquoise, and citrine work beautifully",
    ],
    
    # Cool seasons (Winter)
    "dark_winter": [
        "High-contrast silver and platinum complement your dramatic coloring",
        "White gold provides a sophisticated, cool-toned option",
        "Choose bold, statement pieces that match your high-contrast features",
        "Gemstones like sapphire, emerald, and diamond suit you perfectly",
    ],
    "cool_winter": [
        "Bright silver and platinum enhance your cool, crisp coloring",
        "White gold is especially flattering for your complexion",
        "Opt for polished, high-shine finishes for maximum impact",
        "Icy gemstones like diamonds, white topaz, and blue sapphires are ideal",
    ],
    "bright_winter": [
        "Highly polished silver and platinum match your vivid coloring",
        "Choose dramatic, eye-catching pieces in cool metals",
        "White gold and gunmetal add modern sophistication",
        "Bold gemstones like ruby, emerald, and sapphire make stunning accents",
    ],
    
    # Cool seasons (Summer)
    "light_summer": [
        "Soft silver and delicate platinum pieces complement your gentle coloring",
        "Rose gold can work as it has cool pink undertones",
        "Choose pieces with a soft, muted finish rather than high shine",
        "Pastel gemstones like rose quartz, light amethyst, and aquamarine are perfect",
    ],
    "cool_summer": [
        "Cool silver and platinum harmonize with your soft, cool undertones",
        "White gold provides elegant, understated sophistication",
        "Opt for brushed or satin finishes for a refined look",
        "Gemstones like amethyst, blue topaz, and pearls suit you beautifully",
    ],
    "muted_summer": [
        "Soft silver with a matte or brushed finish flatters your muted coloring",
        "Antique silver adds depth without being too bright",
        "Avoid overly shiny metals - choose toned-down finishes",
        "Dusty gemstones like smoky quartz and soft amethyst work well",
    ],
}


def normalize_season(season: str) -> str:
    """Normalize season string to lowercase with underscores."""
    return season.strip().lower().replace(" ", "_")


def is_warm_undertone(undertone: Optional[str], season: Optional[str]) -> Optional[bool]:
    """
    Determine if undertone is warm based on undertone string or season.
    
    Returns:
        True if warm, False if cool, None if cannot determine (neutral or missing data)
    """
    if undertone:
        undertone_lower = undertone.lower()
        if undertone_lower == "warm":
            return True
        elif undertone_lower == "cool":
            return False
        # Neutral - check season for preference
    
    if season:
        season_lower = normalize_season(season)
        # Spring and Autumn are warm seasons
        if "spring" in season_lower or "autumn" in season_lower:
            return True
        # Winter and Summer are cool seasons
        elif "winter" in season_lower or "summer" in season_lower:
            return False
    
    return None


def get_jewelry_recommendation(
    undertone: Optional[str] = None,
    season: Optional[str] = None,
) -> JewelryRecommendation:
    """
    Get jewelry metal recommendations based on undertone and/or season.
    
    In the 12-season color analysis system, every season is either warm or cool:
    - Warm: Spring (Light, Warm, Bright) and Autumn (Dark, Warm, Muted)
    - Cool: Summer (Light, Cool, Muted) and Winter (Dark, Cool, Bright)
    
    Args:
        undertone: The user's skin undertone (Warm or Cool)
        season: The user's color season (e.g., "Dark Autumn", "Cool Winter")
    
    Returns:
        JewelryRecommendation with recommended and alternative metals
    """
    is_warm = is_warm_undertone(undertone, season)
    
    # Get season-specific tips or use defaults
    normalized_season = normalize_season(season) if season else None
    tips = SEASON_JEWELRY_TIPS.get(normalized_season, [])
    
    if is_warm is True:
        return JewelryRecommendation(
            recommended_metals=WARM_METALS,
            recommendation_reason=(
                "Warm metals like gold, brass, rose gold, and copper harmonize beautifully "
                "with your warm undertones. These metals reflect the golden and peachy hues "
                "in your skin, creating a cohesive and flattering look."
            ),
            undertone="Warm",
            styling_tips=tips if tips else [
                "Gold and brass complement your skin's natural warmth",
                "Rose gold adds a romantic, flattering glow",
                "If wearing silver, choose antique or oxidized finishes",
                "Mix metals sparingly - keep gold as your dominant metal",
            ],
        )
    elif is_warm is False:
        return JewelryRecommendation(
            recommended_metals=COOL_METALS,
            recommendation_reason=(
                "Cool metals like silver, platinum, and white gold complement your cool "
                "undertones perfectly. These metals echo the pink and blue hues in your "
                "skin, enhancing your natural coloring."
            ),
            undertone="Cool",
            styling_tips=tips if tips else [
                "Silver and platinum enhance your natural cool undertones",
                "White gold provides a sophisticated, timeless option",
                "If wearing gold, choose rose gold for its cool pink undertones",
                "Avoid yellow gold and brass as primary jewelry metals",
            ],
        )
    else:
        # No color analysis available - return empty recommendation
        # The frontend should prompt the user to complete color analysis
        return JewelryRecommendation(
            recommended_metals=[],
            recommendation_reason=(
                "Complete your color analysis to get personalized jewelry recommendations. "
                "Your undertone will determine whether warm metals (gold, brass) or cool "
                "metals (silver, platinum) will best complement your natural coloring."
            ),
            undertone="Unknown",
            styling_tips=[
                "Complete your color analysis to discover your undertone",
                "Your color season will reveal whether gold or silver suits you best",
            ],
        )
