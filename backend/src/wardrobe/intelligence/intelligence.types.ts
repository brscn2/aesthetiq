/**
 * Type definitions for wardrobe intelligence metrics and insights
 */

export type WardrobeHealthScore = 'MINIMAL' | 'BALANCED' | 'DIVERSE' | 'EXPERT';

export interface DimensionalMetrics {
  variety: number; // 0-100: How diverse the color/style combinations are
  seasonalCompatibility: number; // 0-100: % of items matching user's seasonal palette
  archetypeAlignment: number; // 0-100: How well items match user's style persona
  colorHarmony: number; // 0-100: How well colors coordinate
}

export interface WardrobeInsights {
  primaryStrength: string; // Strongest dimension
  primaryOpportunity: string; // Weakest dimension (area for improvement)
  comboPotential: number; // Estimated number of unique outfit combinations
}

export interface GapRecommendation {
  title: string; // Suggested item name
  category?: string; // Optional category
  reason: string; // Why this fills a gap
  alignmentScore?: number; // 0-100
  priceRange?: string; // Optional price range based on budget
}

export interface SmartGapAnalysis {
  recommendations: GapRecommendation[];
  generatedAt: Date;
}

export interface WardrobeIntelligence {
  overall: {
    score: number; // 0-100 overall health score
    tier: WardrobeHealthScore;
    lastCalculated: Date;
  };
  dimensions: DimensionalMetrics;
  insights: WardrobeInsights;
}

export interface IntelligenceCalculationResult {
  success: boolean;
  data?: WardrobeIntelligence;
  error?: string;
}
