"""Color utility functions for converting hex codes to descriptive color names."""
from typing import Optional


# Extended CSS color names with hex values (matching frontend/lib/colors.ts)
COLOR_MAP: dict[str, str] = {
    "aliceblue": "#f0f8ff",
    "antiquewhite": "#faebd7",
    "aqua": "#00ffff",
    "aquamarine": "#7fffd4",
    "azure": "#f0ffff",
    "beige": "#f5f5dc",
    "bisque": "#ffe4c4",
    "black": "#000000",
    "blanchedalmond": "#ffebcd",
    "blue": "#0000ff",
    "blueviolet": "#8a2be2",
    "brown": "#a52a2a",
    "burgundy": "#800020",
    "burlywood": "#deb887",
    "cadetblue": "#5f9ea0",
    "camel": "#c19a6b",
    "caramel": "#ffddaf",
    "charcoal": "#36454f",
    "chartreuse": "#7fff00",
    "chocolate": "#d2691e",
    "cognac": "#9f381d",
    "copper": "#b87333",
    "coral": "#ff7f50",
    "cornflowerblue": "#6495ed",
    "cornsilk": "#fff8dc",
    "cream": "#fffdd0",
    "crimson": "#dc143c",
    "cyan": "#00ffff",
    "darkblue": "#00008b",
    "darkcyan": "#008b8b",
    "darkgoldenrod": "#b8860b",
    "darkgray": "#a9a9a9",
    "darkgreen": "#006400",
    "darkkhaki": "#bdb76b",
    "darkmagenta": "#8b008b",
    "darkolivegreen": "#556b2f",
    "darkorange": "#ff8c00",
    "darkorchid": "#9932cc",
    "darkred": "#8b0000",
    "darksalmon": "#e9967a",
    "darkseagreen": "#8fbc8f",
    "darkslateblue": "#483d8b",
    "darkslategray": "#2f4f4f",
    "darkturquoise": "#00ced1",
    "darkviolet": "#9400d3",
    "deeppink": "#ff1493",
    "deepskyblue": "#00bfff",
    "dimgray": "#696969",
    "dodgerblue": "#1e90ff",
    "firebrick": "#b22222",
    "floralwhite": "#fffaf0",
    "forestgreen": "#228b22",
    "fuchsia": "#ff00ff",
    "gainsboro": "#dcdcdc",
    "ghostwhite": "#f8f8ff",
    "gold": "#ffd700",
    "goldenrod": "#daa520",
    "gray": "#808080",
    "green": "#008000",
    "greenyellow": "#adff2f",
    "honeydew": "#f0fff0",
    "hotpink": "#ff69b4",
    "indianred": "#cd5c5c",
    "indigo": "#4b0082",
    "ivory": "#fffff0",
    "khaki": "#f0e68c",
    "lavender": "#e6e6fa",
    "lavenderblush": "#fff0f5",
    "lawngreen": "#7cfc00",
    "lemonchiffon": "#fffacd",
    "lightblue": "#add8e6",
    "lightcoral": "#f08080",
    "lightcyan": "#e0ffff",
    "lightgoldenrodyellow": "#fafad2",
    "lightgrey": "#d3d3d3",
    "lightgreen": "#90ee90",
    "lightpink": "#ffb6c1",
    "lightsalmon": "#ffa07a",
    "lightseagreen": "#20b2aa",
    "lightskyblue": "#87cefa",
    "lightslategray": "#778899",
    "lightsteelblue": "#b0c4de",
    "lightyellow": "#ffffe0",
    "lime": "#00ff00",
    "limegreen": "#32cd32",
    "linen": "#faf0e6",
    "magenta": "#ff00ff",
    "maroon": "#800000",
    "mediumaquamarine": "#66cdaa",
    "mediumblue": "#0000cd",
    "mediumorchid": "#ba55d3",
    "mediumpurple": "#9370d8",
    "mediumseagreen": "#3cb371",
    "mediumslateblue": "#7b68ee",
    "mediumspringgreen": "#00fa9a",
    "mediumturquoise": "#48d1cc",
    "mediumvioletred": "#c71585",
    "midnightblue": "#191970",
    "mintcream": "#f5fffa",
    "mistyrose": "#ffe4e1",
    "moccasin": "#ffe4b5",
    "mustard": "#ffdb58",
    "navajowhite": "#ffdead",
    "navy": "#000080",
    "nude": "#e3bc9a",
    "offwhite": "#faf9f6",
    "oldlace": "#fdf5e6",
    "olive": "#808000",
    "olivedrab": "#6b8e23",
    "orange": "#ffa500",
    "orangered": "#ff4500",
    "orchid": "#da70d6",
    "palegoldenrod": "#eee8aa",
    "palegreen": "#98fb98",
    "paleturquoise": "#afeeee",
    "palevioletred": "#d87093",
    "papayawhip": "#ffefd5",
    "peach": "#ffcba4",
    "peachpuff": "#ffdab9",
    "peru": "#cd853f",
    "pink": "#ffc0cb",
    "plum": "#dda0dd",
    "powderblue": "#b0e0e6",
    "purple": "#800080",
    "rebeccapurple": "#663399",
    "red": "#ff0000",
    "rosybrown": "#bc8f8f",
    "royalblue": "#4169e1",
    "rust": "#b7410e",
    "saddlebrown": "#8b4513",
    "salmon": "#fa8072",
    "sand": "#c2b280",
    "sandybrown": "#f4a460",
    "seagreen": "#2e8b57",
    "seashell": "#fff5ee",
    "sienna": "#a0522d",
    "silver": "#c0c0c0",
    "skyblue": "#87ceeb",
    "slateblue": "#6a5acd",
    "slategray": "#708090",
    "snow": "#fffafa",
    "springgreen": "#00ff7f",
    "steelblue": "#4682b4",
    "tan": "#d2b48c",
    "taupe": "#483c32",
    "teal": "#008080",
    "terracotta": "#e2725b",
    "thistle": "#d8bfd8",
    "tomato": "#ff6347",
    "turquoise": "#40e0d0",
    "violet": "#ee82ee",
    "wheat": "#f5deb3",
    "white": "#ffffff",
    "whitesmoke": "#f5f5f5",
    "wine": "#722f37",
    "yellow": "#ffff00",
    "yellowgreen": "#9acd32",
}

# Reverse map: hex to name (for display)
HEX_TO_NAME: dict[str, str] = {
    hex_val.lower(): name for name, hex_val in COLOR_MAP.items()
}


def hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip("#")
    if len(hex_color) == 3:
        hex_color = "".join(c * 2 for c in hex_color)
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))


def color_distance(hex1: str, hex2: str) -> float:
    """Calculate Euclidean distance between two colors in RGB space."""
    rgb1 = hex_to_rgb(hex1)
    rgb2 = hex_to_rgb(hex2)
    return sum((a - b) ** 2 for a, b in zip(rgb1, rgb2)) ** 0.5


def get_color_name(hex_code: str) -> str:
    """
    Convert hex color code to descriptive color name.
    
    First tries exact match, then finds closest color by RGB distance.
    Returns capitalized color name (e.g., "Green", "Rich Green").
    
    Args:
        hex_code: Hex color code (e.g., "#008000" or "008000")
        
    Returns:
        Color name (e.g., "Green", "Dark Green")
    """
    if not hex_code:
        return "Unknown"
    
    # Normalize hex code
    hex_code = hex_code.strip()
    if not hex_code.startswith("#"):
        hex_code = "#" + hex_code
    hex_code = hex_code.lower()
    
    # Check for exact match first
    if hex_code in HEX_TO_NAME:
        name = HEX_TO_NAME[hex_code]
        return _capitalize_color_name(name)
    
    # Find closest color by RGB distance
    closest_name = "Unknown"
    min_distance = float("inf")
    
    for name, color_hex in COLOR_MAP.items():
        distance = color_distance(hex_code, color_hex)
        if distance < min_distance:
            min_distance = distance
            closest_name = name
    
    return _capitalize_color_name(closest_name)


def _capitalize_color_name(name: str) -> str:
    """Capitalize color name properly (e.g., 'darkgreen' -> 'Dark Green')."""
    # Handle compound names (e.g., "darkgreen" -> "Dark Green")
    # Split on common patterns
    import re
    
    # Split on word boundaries (lowercase to uppercase transitions)
    words = re.findall(r"[a-z]+|[A-Z][a-z]*", name)
    if not words:
        # Fallback: capitalize first letter
        return name.capitalize()
    
    # Capitalize each word
    capitalized = " ".join(word.capitalize() for word in words)
    return capitalized


def get_color_name_from_hex_list(hex_codes: list[str]) -> Optional[str]:
    """
    Get color name from a list of hex codes (returns first color).
    
    Args:
        hex_codes: List of hex color codes
        
    Returns:
        Color name or None if list is empty
    """
    if not hex_codes or len(hex_codes) == 0:
        return None
    
    first_hex = hex_codes[0]
    return get_color_name(first_hex)
