/**
 * Seasonal Color Palette utilities for frontend
 */

import { SeasonalPalette, SeasonalPaletteScores } from '@/types/api'

export const ALL_SEASONAL_PALETTES = Object.values(SeasonalPalette)

// RGB color type
interface RGB {
  r: number
  g: number
  b: number
}

// Palette color definition with hex values
interface PaletteColors {
  primary: string[]
  secondary: string[]
  avoid: string[]
}

/**
 * Color definitions for each seasonal palette
 */
const SEASONAL_PALETTE_COLORS: Record<SeasonalPalette, PaletteColors> = {
  [SeasonalPalette.DARK_AUTUMN]: {
    primary: ['#8B4513', '#A0522D', '#6B4423', '#8B0000', '#556B2F', '#2F4F4F', '#800000', '#D2691E', '#CD853F', '#B8860B'],
    secondary: ['#DAA520', '#BC8F8F', '#F4A460', '#DEB887', '#D2B48C', '#808000', '#6B8E23', '#228B22'],
    avoid: ['#FF69B4', '#00FFFF', '#FF00FF', '#87CEEB', '#E6E6FA'],
  },
  [SeasonalPalette.DARK_WINTER]: {
    primary: ['#000000', '#FFFFFF', '#191970', '#4B0082', '#800080', '#8B0000', '#006400', '#00008B', '#2F4F4F', '#483D8B'],
    secondary: ['#DC143C', '#C71585', '#4169E1', '#008B8B', '#556B2F', '#696969'],
    avoid: ['#FFD700', '#FFA500', '#F5DEB3', '#FAEBD7', '#FFF8DC'],
  },
  [SeasonalPalette.LIGHT_SPRING]: {
    primary: ['#FFB6C1', '#FFDAB9', '#98FB98', '#87CEEB', '#F0E68C', '#FFFACD', '#E0FFFF', '#FFF0F5', '#FAFAD2', '#F5F5DC'],
    secondary: ['#FFD700', '#FF6347', '#40E0D0', '#00CED1', '#FF7F50', '#FFA07A'],
    avoid: ['#000000', '#800000', '#191970', '#2F4F4F', '#4B0082'],
  },
  [SeasonalPalette.LIGHT_SUMMER]: {
    primary: ['#E6E6FA', '#D8BFD8', '#DDA0DD', '#B0C4DE', '#ADD8E6', '#F0F8FF', '#FFF0F5', '#FFE4E1', '#E0FFFF', '#F5F5F5'],
    secondary: ['#778899', '#BC8F8F', '#C0C0C0', '#A9A9A9', '#D3D3D3', '#87CEFA'],
    avoid: ['#FF4500', '#FF6347', '#FFD700', '#FFA500', '#8B4513'],
  },
  [SeasonalPalette.MUTED_AUTUMN]: {
    primary: ['#BC8F8F', '#D2B48C', '#DEB887', '#F5DEB3', '#8FBC8F', '#9ACD32', '#BDB76B', '#DAA520', '#CD853F', '#D2691E'],
    secondary: ['#808000', '#6B8E23', '#556B2F', '#A0522D', '#8B4513', '#B8860B'],
    avoid: ['#FF00FF', '#00FFFF', '#0000FF', '#FF1493', '#7B68EE'],
  },
  [SeasonalPalette.MUTED_SUMMER]: {
    primary: ['#778899', '#708090', '#B0C4DE', '#C0C0C0', '#A9A9A9', '#D3D3D3', '#E6E6FA', '#D8BFD8', '#BC8F8F', '#DDA0DD'],
    secondary: ['#6A5ACD', '#9370DB', '#8B008B', '#4682B4', '#5F9EA0', '#20B2AA'],
    avoid: ['#FF4500', '#FFD700', '#FF6347', '#FFA500', '#FFFF00'],
  },
  [SeasonalPalette.BRIGHT_SPRING]: {
    primary: ['#FF6347', '#FF7F50', '#FFA500', '#FFD700', '#ADFF2F', '#00FF7F', '#40E0D0', '#00CED1', '#FF69B4', '#FF1493'],
    secondary: ['#7FFF00', '#00FF00', '#00FFFF', '#1E90FF', '#FF4500', '#DC143C'],
    avoid: ['#000000', '#2F4F4F', '#191970', '#4B0082', '#800000'],
  },
  [SeasonalPalette.BRIGHT_WINTER]: {
    primary: ['#FFFFFF', '#000000', '#FF0000', '#0000FF', '#FF00FF', '#00FFFF', '#FF1493', '#4169E1', '#9400D3', '#00FF00'],
    secondary: ['#DC143C', '#8A2BE2', '#7B68EE', '#6A5ACD', '#1E90FF', '#00CED1'],
    avoid: ['#F5DEB3', '#DEB887', '#D2B48C', '#BC8F8F', '#8B4513'],
  },
  [SeasonalPalette.WARM_AUTUMN]: {
    primary: ['#FF8C00', '#FF7F50', '#CD853F', '#D2691E', '#8B4513', '#A0522D', '#B8860B', '#DAA520', '#808000', '#6B8E23'],
    secondary: ['#FF6347', '#FFA500', '#FFD700', '#F4A460', '#DEB887', '#228B22'],
    avoid: ['#FF00FF', '#00FFFF', '#0000FF', '#E6E6FA', '#D8BFD8'],
  },
  [SeasonalPalette.WARM_SPRING]: {
    primary: ['#FFD700', '#FFA500', '#FF7F50', '#FF6347', '#FFDAB9', '#F0E68C', '#98FB98', '#00FA9A', '#40E0D0', '#FFB6C1'],
    secondary: ['#ADFF2F', '#7FFF00', '#00FF7F', '#FF69B4', '#FFA07A', '#F5DEB3'],
    avoid: ['#000000', '#191970', '#4B0082', '#2F4F4F', '#800000'],
  },
  [SeasonalPalette.COOL_WINTER]: {
    primary: ['#000000', '#FFFFFF', '#191970', '#000080', '#4B0082', '#800080', '#C71585', '#DC143C', '#008B8B', '#2F4F4F'],
    secondary: ['#4169E1', '#6A5ACD', '#8A2BE2', '#9400D3', '#FF00FF', '#00CED1'],
    avoid: ['#FFD700', '#FFA500', '#FF7F50', '#F5DEB3', '#DEB887'],
  },
  [SeasonalPalette.COOL_SUMMER]: {
    primary: ['#E6E6FA', '#D8BFD8', '#DDA0DD', '#B0C4DE', '#778899', '#708090', '#6A5ACD', '#9370DB', '#BC8F8F', '#C0C0C0'],
    secondary: ['#ADD8E6', '#87CEEB', '#87CEFA', '#4682B4', '#5F9EA0', '#20B2AA'],
    avoid: ['#FF4500', '#FF6347', '#FFD700', '#FFA500', '#8B4513'],
  },
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): RGB | null {
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

/**
 * Calculate color distance using weighted Euclidean distance
 */
function colorDistance(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1)
  const rgb2 = hexToRgb(hex2)
  if (!rgb1 || !rgb2) return Infinity

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

/**
 * Find the minimum distance from a color to any color in a palette
 */
function minDistanceToPalette(itemColor: string, paletteColors: string[]): number {
  let minDist = Infinity
  for (const paletteColor of paletteColors) {
    const dist = colorDistance(itemColor, paletteColor)
    if (dist < minDist) {
      minDist = dist
    }
  }
  return minDist
}

/**
 * Calculate compatibility score for a single color against a palette
 */
function calculateColorScore(itemColor: string, palette: PaletteColors): number {
  const PERFECT_MATCH = 30
  const GOOD_MATCH = 80
  const MAX_DISTANCE = 200

  const avoidDist = minDistanceToPalette(itemColor, palette.avoid)
  if (avoidDist < PERFECT_MATCH) {
    return 0.1
  }

  const primaryDist = minDistanceToPalette(itemColor, palette.primary)
  if (primaryDist < PERFECT_MATCH) {
    return 1.0
  }
  if (primaryDist < GOOD_MATCH) {
    return 0.85 + (0.15 * (1 - primaryDist / GOOD_MATCH))
  }

  const secondaryDist = minDistanceToPalette(itemColor, palette.secondary)
  if (secondaryDist < PERFECT_MATCH) {
    return 0.8
  }
  if (secondaryDist < GOOD_MATCH) {
    return 0.6 + (0.2 * (1 - secondaryDist / GOOD_MATCH))
  }

  const overallDist = Math.min(primaryDist, secondaryDist)
  if (overallDist > MAX_DISTANCE) {
    return 0.2
  }

  return 0.2 + (0.4 * (1 - overallDist / MAX_DISTANCE))
}

/**
 * Calculate seasonal palette scores for a clothing item based on its colors
 * @param itemColors Array of hex color codes from the clothing item
 * @returns Object with scores (0-1) for each seasonal palette
 */
export function calculateSeasonalPaletteScores(
  itemColors: string[]
): SeasonalPaletteScores {
  const scores = {} as SeasonalPaletteScores

  if (!itemColors || itemColors.length === 0) {
    for (const palette of ALL_SEASONAL_PALETTES) {
      scores[palette] = 0.5
    }
    return scores
  }

  const normalizedColors = itemColors.map(c => c.toUpperCase())

  for (const palette of ALL_SEASONAL_PALETTES) {
    const paletteColors = SEASONAL_PALETTE_COLORS[palette]
    
    let totalScore = 0
    for (const color of normalizedColors) {
      totalScore += calculateColorScore(color, paletteColors)
    }
    
    scores[palette] = Math.round((totalScore / normalizedColors.length) * 100) / 100
  }

  return scores
}

/**
 * Get human-readable palette name
 */
export function getPaletteDisplayName(palette: SeasonalPalette | string): string {
  return palette.replace(/_/g, ' ').toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Get the best matching palettes for a clothing item
 * @param scores The palette scores object
 * @param threshold Minimum score to be considered a good match (default 0.7)
 * @returns Array of palette names sorted by score (highest first)
 */
export function getBestMatchingPalettes(
  scores: SeasonalPaletteScores | undefined,
  threshold = 0.7
): { palette: SeasonalPalette; score: number }[] {
  if (!scores) return []
  
  return Object.entries(scores)
    .filter(([_, score]) => score >= threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([palette, score]) => ({ 
      palette: palette as SeasonalPalette, 
      score 
    }))
}

/**
 * Get score for a specific palette
 */
export function getPaletteScore(
  scores: SeasonalPaletteScores | undefined,
  palette: SeasonalPalette
): number {
  if (!scores) return 0
  return scores[palette] || 0
}

/**
 * Get color for score display (green = good, yellow = okay, red = bad)
 */
export function getScoreColor(score: number): string {
  if (score >= 0.8) return 'text-green-500'
  if (score >= 0.6) return 'text-yellow-500'
  if (score >= 0.4) return 'text-orange-500'
  return 'text-red-500'
}

/**
 * Get background color for score badge
 */
export function getScoreBgColor(score: number): string {
  if (score >= 0.8) return 'bg-green-500/10 border-green-500/30'
  if (score >= 0.6) return 'bg-yellow-500/10 border-yellow-500/30'
  if (score >= 0.4) return 'bg-orange-500/10 border-orange-500/30'
  return 'bg-red-500/10 border-red-500/30'
}

/**
 * Format score as percentage
 */
export function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`
}
