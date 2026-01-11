export interface ColorOption {
  name: string
  hex: string
}

// Extended CSS color names with hex values (+ custom fashion colors)
export const COLOR_MAP: Record<string, string> = {
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
  "yellowgreen": "#9acd32"
}

// Reverse map: hex to name (for display)
export const HEX_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(COLOR_MAP).map(([name, hex]) => [hex.toLowerCase(), name])
)

// Get all color names (for AI prompt)
export const ALL_COLOR_NAMES = Object.keys(COLOR_MAP)

// Common wardrobe colors for the color picker UI (subset for better UX)
export const WARDROBE_COLORS: ColorOption[] = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Gray', hex: '#808080' },
  { name: 'Silver', hex: '#c0c0c0' },
  { name: 'Navy', hex: '#000080' },
  { name: 'Blue', hex: '#0000ff' },
  { name: 'Royalblue', hex: '#4169e1' },
  { name: 'Skyblue', hex: '#87ceeb' },
  { name: 'Teal', hex: '#008080' },
  { name: 'Turquoise', hex: '#40e0d0' },
  { name: 'Green', hex: '#008000' },
  { name: 'Olive', hex: '#808000' },
  { name: 'Khaki', hex: '#f0e68c' },
  { name: 'Yellow', hex: '#ffff00' },
  { name: 'Gold', hex: '#ffd700' },
  { name: 'Orange', hex: '#ffa500' },
  { name: 'Coral', hex: '#ff7f50' },
  { name: 'Red', hex: '#ff0000' },
  { name: 'Crimson', hex: '#dc143c' },
  { name: 'Pink', hex: '#ffc0cb' },
  { name: 'Hotpink', hex: '#ff69b4' },
  { name: 'Purple', hex: '#800080' },
  { name: 'Violet', hex: '#ee82ee' },
  { name: 'Indigo', hex: '#4b0082' },
  { name: 'Brown', hex: '#a52a2a' },
  { name: 'Chocolate', hex: '#d2691e' },
  { name: 'Tan', hex: '#d2b48c' },
  { name: 'Beige', hex: '#f5f5dc' },
  { name: 'Ivory', hex: '#fffff0' },
]

// Convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace('#', '').toLowerCase()
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

// Calculate color distance using weighted Euclidean distance
// Weights account for human perception of color differences
function colorDistance(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1)
  const rgb2 = hexToRgb(hex2)
  if (!rgb1 || !rgb2) return Infinity
  
  // Weighted distance (human eye is more sensitive to green, less to blue)
  const rMean = (rgb1.r + rgb2.r) / 2
  const dR = rgb1.r - rgb2.r
  const dG = rgb1.g - rgb2.g
  const dB = rgb1.b - rgb2.b
  
  return Math.sqrt(
    (2 + rMean / 256) * dR * dR +
    4 * dG * dG +
    (2 + (255 - rMean) / 256) * dB * dB
  )
}

// Check if a color matches a target color within a threshold
export function colorMatchesFilter(itemHex: string, filterHex: string, threshold = 80): boolean {
  if (!itemHex || !filterHex) return false
  return colorDistance(itemHex, filterHex) <= threshold
}

// Get color name from hex - exact match first, then closest
export function getColorName(hex: string): string {
  if (!hex) return 'Unknown'
  
  const normalizedHex = hex.toLowerCase()
  
  // Check for exact match first
  if (HEX_TO_NAME[normalizedHex]) {
    return capitalizeFirst(HEX_TO_NAME[normalizedHex])
  }
  
  // Find closest color
  let closestName = 'Unknown'
  let minDistance = Infinity
  
  for (const [name, colorHex] of Object.entries(COLOR_MAP)) {
    const distance = colorDistance(hex, colorHex)
    if (distance < minDistance) {
      minDistance = distance
      closestName = name
    }
  }
  
  return capitalizeFirst(closestName)
}

// Capitalize first letter
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Convert color name to hex
export function getHexFromName(name: string): string | null {
  const normalizedName = name.toLowerCase().trim()
  return COLOR_MAP[normalizedName] || null
}

// Legacy alias for backwards compatibility
export const getClosestColorName = getColorName
