/**
 * Seasonal Color Palette utilities for frontend
 */

import { SeasonalPalette, SeasonalPaletteScores } from '@/types/api'

export const ALL_SEASONAL_PALETTES = Object.values(SeasonalPalette)

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
