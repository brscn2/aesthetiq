"""Style DNA ranking for commerce items.

Uses pre-computed seasonalPaletteScores from the backend for accurate
color season matching.
"""
from __future__ import annotations

from typing import Dict, Optional, Tuple


def normalize_palette_key(color_season: str) -> str:
    """
    Normalize color season name to match the seasonalPaletteScores keys.
    
    Examples:
        "warm_autumn" -> "WARM_AUTUMN"
        "Warm Autumn" -> "WARM_AUTUMN"
        "WARM_AUTUMN" -> "WARM_AUTUMN"
    """
    return color_season.strip().upper().replace(" ", "_")


def score_from_palette_scores(
    seasonal_scores: Optional[Dict[str, float]],
    color_season: Optional[str]
) -> float:
    """
    Get style DNA score from pre-computed seasonalPaletteScores.
    
    This uses the backend's pre-computed color compatibility scores
    rather than doing color name matching.
    
    Args:
        seasonal_scores: The item's seasonalPaletteScores dict
                        (e.g., {"WARM_AUTUMN": 0.85, "COOL_WINTER": 0.2, ...})
        color_season: The user's color season (e.g., "warm_autumn" or "WARM_AUTUMN")
    
    Returns:
        Score between 0.0 and 1.0, or 0.0 if no match possible
    """
    if not seasonal_scores or not color_season:
        return 0.0
    
    palette_key = normalize_palette_key(color_season)
    return seasonal_scores.get(palette_key, 0.0)


def combine_scores(
    semantic: float,
    season_match: float
) -> Tuple[float, Dict[str, float]]:
    """
    Combine semantic similarity and color season match into a single score.
    
    The weighting prioritizes semantic relevance while still giving
    meaningful boost to items that match the user's color season.
    
    Args:
        semantic: Semantic similarity score (0-1)
        season_match: Color season match score (0-1)
    
    Returns:
        Tuple of (total_score, breakdown_dict)
    """
    # Weights can be tuned based on user feedback
    semantic_weight = 0.70
    season_weight = 0.30
    
    total = (semantic_weight * semantic) + (season_weight * season_match)
    
    breakdown = {
        "semantic": round(semantic, 4),
        "color_season": round(season_match, 4),
        "semantic_weighted": round(semantic_weight * semantic, 4),
        "season_weighted": round(season_weight * season_match, 4),
    }
    
    return total, breakdown


def get_best_palettes(
    seasonal_scores: Optional[Dict[str, float]],
    threshold: float = 0.7,
    limit: int = 3
) -> list[tuple[str, float]]:
    """
    Get the best matching palettes for an item.
    
    Args:
        seasonal_scores: The item's seasonalPaletteScores dict
        threshold: Minimum score to be considered a good match
        limit: Maximum number of palettes to return
    
    Returns:
        List of (palette_name, score) tuples sorted by score descending
    """
    if not seasonal_scores:
        return []
    
    matches = [
        (palette, score)
        for palette, score in seasonal_scores.items()
        if score >= threshold
    ]
    
    matches.sort(key=lambda x: x[1], reverse=True)
    return matches[:limit]
