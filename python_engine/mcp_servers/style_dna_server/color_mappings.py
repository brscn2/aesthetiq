from __future__ import annotations

from typing import Dict, List


"""
COLOR_SEASON_TO_COLORS mirrors the seasonal palette definitions used in the backend
(`backend/src/common/seasonal-colors.ts`) and frontend (`frontend/lib/seasonal-colors.ts`).

Each key is a normalized season name (lowercase, underscore separated) and the values are
hex color codes taken from the corresponding SeasonalPalette's primary and secondary
colors. This keeps Style DNA recommendations aligned across Python, backend, and frontend.
"""

COLOR_SEASON_TO_COLORS: Dict[str, List[str]] = {
    # DARK_AUTUMN
    "dark_autumn": [
        # primary
        "#8B4513",
        "#A0522D",
        "#6B4423",
        "#8B0000",
        "#556B2F",
        "#2F4F4F",
        "#800000",
        "#D2691E",
        "#CD853F",
        "#B8860B",
        # secondary
        "#DAA520",
        "#BC8F8F",
        "#F4A460",
        "#DEB887",
        "#D2B48C",
        "#808000",
        "#6B8E23",
        "#228B22",
    ],
    # DARK_WINTER
    "dark_winter": [
        # primary
        "#000000",
        "#FFFFFF",
        "#191970",
        "#4B0082",
        "#800080",
        "#8B0000",
        "#006400",
        "#00008B",
        "#2F4F4F",
        "#483D8B",
        # secondary
        "#DC143C",
        "#C71585",
        "#4169E1",
        "#008B8B",
        "#556B2F",
        "#696969",
    ],
    # LIGHT_SPRING
    "light_spring": [
        # primary
        "#FFB6C1",
        "#FFDAB9",
        "#98FB98",
        "#87CEEB",
        "#F0E68C",
        "#FFFACD",
        "#E0FFFF",
        "#FFF0F5",
        "#FAFAD2",
        "#F5F5DC",
        # secondary
        "#FFD700",
        "#FF6347",
        "#40E0D0",
        "#00CED1",
        "#FF7F50",
        "#FFA07A",
    ],
    # LIGHT_SUMMER
    "light_summer": [
        # primary
        "#E6E6FA",
        "#D8BFD8",
        "#DDA0DD",
        "#B0C4DE",
        "#ADD8E6",
        "#F0F8FF",
        "#FFF0F5",
        "#FFE4E1",
        "#E0FFFF",
        "#F5F5F5",
        # secondary
        "#778899",
        "#BC8F8F",
        "#C0C0C0",
        "#A9A9A9",
        "#D3D3D3",
        "#87CEFA",
    ],
    # MUTED_AUTUMN
    "muted_autumn": [
        # primary
        "#BC8F8F",
        "#D2B48C",
        "#DEB887",
        "#F5DEB3",
        "#8FBC8F",
        "#9ACD32",
        "#BDB76B",
        "#DAA520",
        "#CD853F",
        "#D2691E",
        # secondary
        "#808000",
        "#6B8E23",
        "#556B2F",
        "#A0522D",
        "#8B4513",
        "#B8860B",
    ],
    # MUTED_SUMMER
    "muted_summer": [
        # primary
        "#778899",
        "#708090",
        "#B0C4DE",
        "#C0C0C0",
        "#A9A9A9",
        "#D3D3D3",
        "#E6E6FA",
        "#D8BFD8",
        "#BC8F8F",
        "#DDA0DD",
        # secondary
        "#6A5ACD",
        "#9370DB",
        "#8B008B",
        "#4682B4",
        "#5F9EA0",
        "#20B2AA",
    ],
    # BRIGHT_SPRING
    "bright_spring": [
        # primary
        "#FF6347",
        "#FF7F50",
        "#FFA500",
        "#FFD700",
        "#ADFF2F",
        "#00FF7F",
        "#40E0D0",
        "#00CED1",
        "#FF69B4",
        "#FF1493",
        # secondary
        "#7FFF00",
        "#00FF00",
        "#00FFFF",
        "#1E90FF",
        "#FF4500",
        "#DC143C",
    ],
    # BRIGHT_WINTER
    "bright_winter": [
        # primary
        "#FFFFFF",
        "#000000",
        "#FF0000",
        "#0000FF",
        "#FF00FF",
        "#00FFFF",
        "#FF1493",
        "#4169E1",
        "#9400D3",
        "#00FF00",
        # secondary
        "#DC143C",
        "#8A2BE2",
        "#7B68EE",
        "#6A5ACD",
        "#1E90FF",
        "#00CED1",
    ],
    # WARM_AUTUMN
    "warm_autumn": [
        # primary
        "#FF8C00",
        "#FF7F50",
        "#CD853F",
        "#D2691E",
        "#8B4513",
        "#A0522D",
        "#B8860B",
        "#DAA520",
        "#808000",
        "#6B8E23",
        # secondary
        "#FF6347",
        "#FFA500",
        "#FFD700",
        "#F4A460",
        "#DEB887",
        "#228B22",
    ],
    # WARM_SPRING
    "warm_spring": [
        # primary
        "#FFD700",
        "#FFA500",
        "#FF7F50",
        "#FF6347",
        "#FFDAB9",
        "#F0E68C",
        "#98FB98",
        "#00FA9A",
        "#40E0D0",
        "#FFB6C1",
        # secondary
        "#ADFF2F",
        "#7FFF00",
        "#00FF7F",
        "#FF69B4",
        "#FFA07A",
        "#F5DEB3",
    ],
    # COOL_WINTER
    "cool_winter": [
        # primary
        "#000000",
        "#FFFFFF",
        "#191970",
        "#000080",
        "#4B0082",
        "#800080",
        "#C71585",
        "#DC143C",
        "#008B8B",
        "#2F4F4F",
        # secondary
        "#4169E1",
        "#6A5ACD",
        "#8A2BE2",
        "#9400D3",
        "#FF00FF",
        "#00CED1",
    ],
    # COOL_SUMMER
    "cool_summer": [
        # primary
        "#E6E6FA",
        "#D8BFD8",
        "#DDA0DD",
        "#B0C4DE",
        "#778899",
        "#708090",
        "#6A5ACD",
        "#9370DB",
        "#BC8F8F",
        "#C0C0C0",
        # secondary
        "#ADD8E6",
        "#87CEEB",
        "#87CEFA",
        "#4682B4",
        "#5F9EA0",
        "#20B2AA",
    ],
}


def normalize_season(season: str) -> str:
    return season.strip().lower().replace(" ", "_")


def recommended_colors_for_season(season: str | None) -> List[str]:
    if not season:
        return []
    return COLOR_SEASON_TO_COLORS.get(normalize_season(season), [])

