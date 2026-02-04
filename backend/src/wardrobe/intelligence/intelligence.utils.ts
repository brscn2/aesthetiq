/**
 * Utility functions for calculating individual wardrobe intelligence dimensions
 */

/**
 * Calculate wardrobe variety score (0-100)
 * Based on color diversity and category distribution
 */
export function calculateVarietyScore(items: any[]): number {
  if (items.length === 0) return 0;

  // Count unique colors
  const uniqueColors = new Set<string>();
  items.forEach((item) => {
    if (item.colors && Array.isArray(item.colors)) {
      item.colors.forEach((color: string) => uniqueColors.add(color));
    }
  });

  // Count items per category
  const categoryCount = new Map<string, number>();
  items.forEach((item) => {
    const count = categoryCount.get(item.category) || 0;
    categoryCount.set(item.category, count + 1);
  });

  // Scoring: penalize over-concentration in one category
  const categoryBalance =
    categoryCount.size > 0
      ? 1 - Math.max(...Array.from(categoryCount.values())) / items.length
      : 0;

  // Scoring: reward color diversity
  const colorDiversity = Math.min(uniqueColors.size / (items.length * 0.5), 1);

  // Combine: 60% color diversity, 40% category balance
  const variety = (colorDiversity * 60 + categoryBalance * 100 * 0.4) / 100;
  return Math.round(Math.min(variety, 1) * 100);
}

/**
 * Calculate seasonal compatibility (0-100)
 * % of items that score high for user's seasonal palette
 */
export function calculateSeasonalCompatibility(
  items: any[],
  targetPalette?: string,
): number {
  if (items.length === 0) return 0;

  // Most seasonal palettes should have scores
  const itemsWithScores = items.filter(
    (item) =>
      item.seasonalPaletteScores &&
      typeof item.seasonalPaletteScores === 'object',
  );

  if (itemsWithScores.length === 0) return 50; // No data yet

  if (!targetPalette) {
    return 50; // Unknown user palette
  }

  // Calculate average compatibility for the user's palette
  const avgScore =
    itemsWithScores.reduce((sum, item) => {
      const score = item.seasonalPaletteScores?.[targetPalette] ?? 0;
      return sum + score;
    }, 0) / itemsWithScores.length;

  return Math.round(avgScore * 100);
}

/**
 * Calculate archetype alignment (0-100)
 * How well items match user's style persona from style profile
 */
export function calculateArchetypeAlignment(
  items: any[],
  styleProfile: any,
): number {
  if (!styleProfile || !styleProfile.archetype) {
    return 50; // Neutral if no profile
  }

  // Archetype keywords mapping (can be expanded)
  const archetypeKeywords: Record<string, string[]> = {
    'urban-minimalist': ['neutral', 'black', 'white', 'gray', 'simple'],
    classic: ['timeless', 'structured', 'navy', 'white', 'cream'],
    bohemian: ['colorful', 'pattern', 'flowing', 'earthy', 'artistic'],
    sporty: ['athletic', 'functional', 'color-blocked', 'casual'],
    romantic: ['soft', 'floral', 'pastel', 'feminine', 'delicate'],
  };

  const archetype = styleProfile.archetype.toLowerCase();
  const keywords = archetypeKeywords[archetype] || [];

  if (keywords.length === 0) {
    return 60; // Unknown archetype
  }

  // Simplified: count items with matching keywords in notes/brand
  const matchingItems = items.filter((item) => {
    const text =
      `${item.brand || ''} ${item.notes || ''} ${item.subCategory || ''}`.toLowerCase();
    return keywords.some((keyword) => text.includes(keyword));
  });

  return Math.round((matchingItems.length / Math.max(items.length, 1)) * 100);
}

/**
 * Calculate color harmony score (0-100)
 * How well item colors complement each other
 */
export function calculateColorHarmonyScore(items: any[]): number {
  if (items.length < 2) return 50;

  // Extract all colors from all items
  const allColors = new Set<string>();
  items.forEach((item) => {
    if (item.colors && Array.isArray(item.colors)) {
      item.colors.forEach((color: string) => allColors.add(color));
    }
  });

  const uniqueColors = Array.from(allColors);

  // Penalize if wardrobe is too monochromatic
  if (uniqueColors.length < 3) {
    return 30; // Very limited color palette
  }

  // Reward if colors are distributed well
  const colorDistribution = new Map<string, number>();
  items.forEach((item) => {
    if (item.colors && Array.isArray(item.colors)) {
      item.colors.forEach((color: string) => {
        colorDistribution.set(color, (colorDistribution.get(color) || 0) + 1);
      });
    }
  });

  // Penalize if one color dominates
  const dominantColorCount = Math.max(
    ...Array.from(colorDistribution.values()),
  );
  const overconcentration = dominantColorCount / items.length;
  const diversityPenalty = Math.max(0, 1 - overconcentration);

  return Math.round(
    Math.min(uniqueColors.length / 10, 1) * 70 + diversityPenalty * 30,
  );
}

/**
 * Calculate rotation risk for an individual item (0-1)
 * Higher = more likely needs to be reintroduced to active wardrobe
 */
export function calculateItemRotationRisk(item: any): number {
  if (!item.lastWorn) return 0.9; // Never worn = highest risk

  const daysSince = Math.floor(
    (new Date().getTime() - new Date(item.lastWorn).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  if (daysSince < 30) return 0; // Recently worn
  if (daysSince < 60) return 0.2;
  if (daysSince < 90) return 0.5;
  if (daysSince < 180) return 0.75;
  return 0.95; // Very long time
}
