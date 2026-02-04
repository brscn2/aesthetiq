/**
 * Seasonal Color Analysis - Color Palette Definitions
 * Based on the 12-season color analysis system
 * 
 * Each palette has characteristic colors that complement specific skin tones
 * and eye colors.
 */

export enum SeasonalPalette {
  DARK_AUTUMN = 'DARK_AUTUMN',
  DARK_WINTER = 'DARK_WINTER',
  LIGHT_SPRING = 'LIGHT_SPRING',
  LIGHT_SUMMER = 'LIGHT_SUMMER',
  MUTED_AUTUMN = 'MUTED_AUTUMN',
  MUTED_SUMMER = 'MUTED_SUMMER',
  BRIGHT_SPRING = 'BRIGHT_SPRING',
  BRIGHT_WINTER = 'BRIGHT_WINTER',
  WARM_AUTUMN = 'WARM_AUTUMN',
  WARM_SPRING = 'WARM_SPRING',
  COOL_WINTER = 'COOL_WINTER',
  COOL_SUMMER = 'COOL_SUMMER',
}

export const ALL_SEASONAL_PALETTES = Object.values(SeasonalPalette);

// RGB color type
interface RGB {
  r: number;
  g: number;
  b: number;
}

// Palette color definition with hex values
interface PaletteColors {
  primary: string[];    // Best colors for this palette
  secondary: string[];  // Good colors for this palette
  avoid: string[];      // Colors to avoid
}

/**
 * Color definitions for each seasonal palette
 * Based on color theory and seasonal color analysis principles
 */
export const SEASONAL_PALETTE_COLORS: Record<SeasonalPalette, PaletteColors> = {
  [SeasonalPalette.DARK_AUTUMN]: {
    primary: [
      '#8B4513', // Saddle brown
      '#A0522D', // Sienna
      '#6B4423', // Dark brown
      '#8B0000', // Dark red
      '#556B2F', // Dark olive green
      '#2F4F4F', // Dark slate gray
      '#800000', // Maroon
      '#D2691E', // Chocolate
      '#CD853F', // Peru
      '#B8860B', // Dark goldenrod
    ],
    secondary: [
      '#DAA520', // Goldenrod
      '#BC8F8F', // Rosy brown
      '#F4A460', // Sandy brown
      '#DEB887', // Burlywood
      '#D2B48C', // Tan
      '#808000', // Olive
      '#6B8E23', // Olive drab
      '#228B22', // Forest green
    ],
    avoid: ['#FF69B4', '#00FFFF', '#FF00FF', '#87CEEB', '#E6E6FA'],
  },

  [SeasonalPalette.DARK_WINTER]: {
    primary: [
      '#000000', // Black
      '#FFFFFF', // White
      '#191970', // Midnight blue
      '#4B0082', // Indigo
      '#800080', // Purple
      '#8B0000', // Dark red
      '#006400', // Dark green
      '#00008B', // Dark blue
      '#2F4F4F', // Dark slate gray
      '#483D8B', // Dark slate blue
    ],
    secondary: [
      '#DC143C', // Crimson
      '#C71585', // Medium violet red
      '#4169E1', // Royal blue
      '#008B8B', // Dark cyan
      '#556B2F', // Dark olive green
      '#696969', // Dim gray
    ],
    avoid: ['#FFD700', '#FFA500', '#F5DEB3', '#FAEBD7', '#FFF8DC'],
  },

  [SeasonalPalette.LIGHT_SPRING]: {
    primary: [
      '#FFB6C1', // Light pink
      '#FFDAB9', // Peach puff
      '#98FB98', // Pale green
      '#87CEEB', // Sky blue
      '#F0E68C', // Khaki
      '#FFFACD', // Lemon chiffon
      '#E0FFFF', // Light cyan
      '#FFF0F5', // Lavender blush
      '#FAFAD2', // Light goldenrod
      '#F5F5DC', // Beige
    ],
    secondary: [
      '#FFD700', // Gold
      '#FF6347', // Tomato
      '#40E0D0', // Turquoise
      '#00CED1', // Dark turquoise
      '#FF7F50', // Coral
      '#FFA07A', // Light salmon
    ],
    avoid: ['#000000', '#800000', '#191970', '#2F4F4F', '#4B0082'],
  },

  [SeasonalPalette.LIGHT_SUMMER]: {
    primary: [
      '#E6E6FA', // Lavender
      '#D8BFD8', // Thistle
      '#DDA0DD', // Plum
      '#B0C4DE', // Light steel blue
      '#ADD8E6', // Light blue
      '#F0F8FF', // Alice blue
      '#FFF0F5', // Lavender blush
      '#FFE4E1', // Misty rose
      '#E0FFFF', // Light cyan
      '#F5F5F5', // White smoke
    ],
    secondary: [
      '#778899', // Light slate gray
      '#BC8F8F', // Rosy brown
      '#C0C0C0', // Silver
      '#A9A9A9', // Dark gray
      '#D3D3D3', // Light gray
      '#87CEFA', // Light sky blue
    ],
    avoid: ['#FF4500', '#FF6347', '#FFD700', '#FFA500', '#8B4513'],
  },

  [SeasonalPalette.MUTED_AUTUMN]: {
    primary: [
      '#BC8F8F', // Rosy brown
      '#D2B48C', // Tan
      '#DEB887', // Burlywood
      '#F5DEB3', // Wheat
      '#8FBC8F', // Dark sea green
      '#9ACD32', // Yellow green
      '#BDB76B', // Dark khaki
      '#DAA520', // Goldenrod
      '#CD853F', // Peru
      '#D2691E', // Chocolate
    ],
    secondary: [
      '#808000', // Olive
      '#6B8E23', // Olive drab
      '#556B2F', // Dark olive green
      '#A0522D', // Sienna
      '#8B4513', // Saddle brown
      '#B8860B', // Dark goldenrod
    ],
    avoid: ['#FF00FF', '#00FFFF', '#0000FF', '#FF1493', '#7B68EE'],
  },

  [SeasonalPalette.MUTED_SUMMER]: {
    primary: [
      '#778899', // Light slate gray
      '#708090', // Slate gray
      '#B0C4DE', // Light steel blue
      '#C0C0C0', // Silver
      '#A9A9A9', // Dark gray
      '#D3D3D3', // Light gray
      '#E6E6FA', // Lavender
      '#D8BFD8', // Thistle
      '#BC8F8F', // Rosy brown
      '#DDA0DD', // Plum
    ],
    secondary: [
      '#6A5ACD', // Slate blue
      '#9370DB', // Medium purple
      '#8B008B', // Dark magenta
      '#4682B4', // Steel blue
      '#5F9EA0', // Cadet blue
      '#20B2AA', // Light sea green
    ],
    avoid: ['#FF4500', '#FFD700', '#FF6347', '#FFA500', '#FFFF00'],
  },

  [SeasonalPalette.BRIGHT_SPRING]: {
    primary: [
      '#FF6347', // Tomato
      '#FF7F50', // Coral
      '#FFA500', // Orange
      '#FFD700', // Gold
      '#ADFF2F', // Green yellow
      '#00FF7F', // Spring green
      '#40E0D0', // Turquoise
      '#00CED1', // Dark turquoise
      '#FF69B4', // Hot pink
      '#FF1493', // Deep pink
    ],
    secondary: [
      '#7FFF00', // Chartreuse
      '#00FF00', // Lime
      '#00FFFF', // Cyan
      '#1E90FF', // Dodger blue
      '#FF4500', // Orange red
      '#DC143C', // Crimson
    ],
    avoid: ['#000000', '#2F4F4F', '#191970', '#4B0082', '#800000'],
  },

  [SeasonalPalette.BRIGHT_WINTER]: {
    primary: [
      '#FFFFFF', // White
      '#000000', // Black
      '#FF0000', // Red
      '#0000FF', // Blue
      '#FF00FF', // Magenta
      '#00FFFF', // Cyan
      '#FF1493', // Deep pink
      '#4169E1', // Royal blue
      '#9400D3', // Dark violet
      '#00FF00', // Lime
    ],
    secondary: [
      '#DC143C', // Crimson
      '#8A2BE2', // Blue violet
      '#7B68EE', // Medium slate blue
      '#6A5ACD', // Slate blue
      '#1E90FF', // Dodger blue
      '#00CED1', // Dark turquoise
    ],
    avoid: ['#F5DEB3', '#DEB887', '#D2B48C', '#BC8F8F', '#8B4513'],
  },

  [SeasonalPalette.WARM_AUTUMN]: {
    primary: [
      '#FF8C00', // Dark orange
      '#FF7F50', // Coral
      '#CD853F', // Peru
      '#D2691E', // Chocolate
      '#8B4513', // Saddle brown
      '#A0522D', // Sienna
      '#B8860B', // Dark goldenrod
      '#DAA520', // Goldenrod
      '#808000', // Olive
      '#6B8E23', // Olive drab
    ],
    secondary: [
      '#FF6347', // Tomato
      '#FFA500', // Orange
      '#FFD700', // Gold
      '#F4A460', // Sandy brown
      '#DEB887', // Burlywood
      '#228B22', // Forest green
    ],
    avoid: ['#FF00FF', '#00FFFF', '#0000FF', '#E6E6FA', '#D8BFD8'],
  },

  [SeasonalPalette.WARM_SPRING]: {
    primary: [
      '#FFD700', // Gold
      '#FFA500', // Orange
      '#FF7F50', // Coral
      '#FF6347', // Tomato
      '#FFDAB9', // Peach puff
      '#F0E68C', // Khaki
      '#98FB98', // Pale green
      '#00FA9A', // Medium spring green
      '#40E0D0', // Turquoise
      '#FFB6C1', // Light pink
    ],
    secondary: [
      '#ADFF2F', // Green yellow
      '#7FFF00', // Chartreuse
      '#00FF7F', // Spring green
      '#FF69B4', // Hot pink
      '#FFA07A', // Light salmon
      '#F5DEB3', // Wheat
    ],
    avoid: ['#000000', '#191970', '#4B0082', '#2F4F4F', '#800000'],
  },

  [SeasonalPalette.COOL_WINTER]: {
    primary: [
      '#000000', // Black
      '#FFFFFF', // White
      '#191970', // Midnight blue
      '#000080', // Navy
      '#4B0082', // Indigo
      '#800080', // Purple
      '#C71585', // Medium violet red
      '#DC143C', // Crimson
      '#008B8B', // Dark cyan
      '#2F4F4F', // Dark slate gray
    ],
    secondary: [
      '#4169E1', // Royal blue
      '#6A5ACD', // Slate blue
      '#8A2BE2', // Blue violet
      '#9400D3', // Dark violet
      '#FF00FF', // Magenta
      '#00CED1', // Dark turquoise
    ],
    avoid: ['#FFD700', '#FFA500', '#FF7F50', '#F5DEB3', '#DEB887'],
  },

  [SeasonalPalette.COOL_SUMMER]: {
    primary: [
      '#E6E6FA', // Lavender
      '#D8BFD8', // Thistle
      '#DDA0DD', // Plum
      '#B0C4DE', // Light steel blue
      '#778899', // Light slate gray
      '#708090', // Slate gray
      '#6A5ACD', // Slate blue
      '#9370DB', // Medium purple
      '#BC8F8F', // Rosy brown
      '#C0C0C0', // Silver
    ],
    secondary: [
      '#ADD8E6', // Light blue
      '#87CEEB', // Sky blue
      '#87CEFA', // Light sky blue
      '#4682B4', // Steel blue
      '#5F9EA0', // Cadet blue
      '#20B2AA', // Light sea green
    ],
    avoid: ['#FF4500', '#FF6347', '#FFD700', '#FFA500', '#8B4513'],
  },
};

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): RGB | null {
  const cleanHex = hex.replace('#', '').toLowerCase();
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate color distance using weighted Euclidean distance
 * Weights account for human perception of color differences
 */
function colorDistance(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return Infinity;

  // Weighted distance (human eye is more sensitive to green)
  const rMean = (rgb1.r + rgb2.r) / 2;
  const dR = rgb1.r - rgb2.r;
  const dG = rgb1.g - rgb2.g;
  const dB = rgb1.b - rgb2.b;

  return Math.sqrt(
    (2 + rMean / 256) * dR * dR +
    4 * dG * dG +
    (2 + (255 - rMean) / 256) * dB * dB
  );
}

/**
 * Find the minimum distance from a color to any color in a palette
 */
function minDistanceToPalette(itemColor: string, paletteColors: string[]): number {
  let minDist = Infinity;
  for (const paletteColor of paletteColors) {
    const dist = colorDistance(itemColor, paletteColor);
    if (dist < minDist) {
      minDist = dist;
    }
  }
  return minDist;
}

/**
 * Calculate compatibility score for a single color against a palette
 * Returns a score between 0 and 1
 */
function calculateColorScore(itemColor: string, palette: PaletteColors): number {
  // Distance thresholds
  const PERFECT_MATCH = 30;   // Very close match
  const GOOD_MATCH = 80;      // Acceptable match
  const MAX_DISTANCE = 200;   // Maximum meaningful distance

  // Check if color is in avoid list (penalty)
  const avoidDist = minDistanceToPalette(itemColor, palette.avoid);
  if (avoidDist < PERFECT_MATCH) {
    return 0.1; // Heavy penalty for avoided colors
  }

  // Check primary colors (best match)
  const primaryDist = minDistanceToPalette(itemColor, palette.primary);
  if (primaryDist < PERFECT_MATCH) {
    return 1.0;
  }
  if (primaryDist < GOOD_MATCH) {
    return 0.85 + (0.15 * (1 - primaryDist / GOOD_MATCH));
  }

  // Check secondary colors
  const secondaryDist = minDistanceToPalette(itemColor, palette.secondary);
  if (secondaryDist < PERFECT_MATCH) {
    return 0.8;
  }
  if (secondaryDist < GOOD_MATCH) {
    return 0.6 + (0.2 * (1 - secondaryDist / GOOD_MATCH));
  }

  // Fallback: calculate based on overall distance
  const overallDist = Math.min(primaryDist, secondaryDist);
  if (overallDist > MAX_DISTANCE) {
    return 0.2;
  }

  return 0.2 + (0.4 * (1 - overallDist / MAX_DISTANCE));
}

/**
 * Calculate seasonal palette scores for a clothing item based on its colors
 * @param itemColors Array of hex color codes from the clothing item
 * @returns Object with scores (0-1) for each seasonal palette
 */
export function calculateSeasonalPaletteScores(
  itemColors: string[]
): Record<SeasonalPalette, number> {
  const scores: Record<SeasonalPalette, number> = {} as Record<SeasonalPalette, number>;

  if (!itemColors || itemColors.length === 0) {
    // Return neutral scores if no colors
    for (const palette of ALL_SEASONAL_PALETTES) {
      scores[palette] = 0.5;
    }
    return scores;
  }

  // Normalize colors to uppercase hex
  const normalizedColors = itemColors.map(c => c.toUpperCase());

  for (const palette of ALL_SEASONAL_PALETTES) {
    const paletteColors = SEASONAL_PALETTE_COLORS[palette];
    
    // Calculate score for each item color and average them
    let totalScore = 0;
    for (const color of normalizedColors) {
      totalScore += calculateColorScore(color, paletteColors);
    }
    
    // Average score, rounded to 2 decimal places
    scores[palette] = Math.round((totalScore / normalizedColors.length) * 100) / 100;
  }

  return scores;
}

/**
 * Get the best matching palettes for a clothing item
 * @param scores The palette scores object
 * @param threshold Minimum score to be considered a good match (default 0.7)
 * @returns Array of palette names sorted by score (highest first)
 */
export function getBestMatchingPalettes(
  scores: Record<SeasonalPalette, number>,
  threshold = 0.7
): SeasonalPalette[] {
  return Object.entries(scores)
    .filter(([_, score]) => score >= threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([palette]) => palette as SeasonalPalette);
}

/**
 * Get human-readable palette name
 */
export function getPaletteDisplayName(palette: SeasonalPalette): string {
  return palette.replace('_', ' ').toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
