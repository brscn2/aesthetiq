/**
 * Frontend type definitions for Wardrobe Intelligence
 * These mirror the backend types for type safety
 */

export type WardrobeHealthScore = "MINIMAL" | "BALANCED" | "DIVERSE" | "EXPERT";

export interface DimensionalMetrics {
  variety: number;
  seasonalCompatibility: number;
  archetypeAlignment: number;
  colorHarmony: number;
}

export interface WardrobeInsights {
  primaryStrength: string;
  primaryOpportunity: string;
  comboPotential: number;
}

export interface GapRecommendation {
  title: string;
  category?: string;
  reason: string;
  alignmentScore?: number;
  priceRange?: string;
}

export interface SmartGapAnalysis {
  recommendations: GapRecommendation[];
  generatedAt: string;
}

export interface WardrobeIntelligence {
  overall: {
    score: number;
    tier: WardrobeHealthScore;
    lastCalculated: Date;
  };
  dimensions: DimensionalMetrics;
  insights: WardrobeInsights;
}

export interface IntelligenceApiResponse {
  success: boolean;
  data?: WardrobeIntelligence;
  error?: string;
}

// Dimension display metadata
export interface DimensionMetadata {
  key: keyof DimensionalMetrics;
  label: string;
  description: string;
  icon: string;
  color: string;
}

export const DIMENSION_METADATA: DimensionMetadata[] = [
  {
    key: "variety",
    label: "Variety",
    description: "Color & category diversity",
    icon: "Palette",
    color: "#8B5CF6", // purple
  },
  {
    key: "seasonalCompatibility",
    label: "Seasonal Fit",
    description: "Items matching your seasonal palette",
    icon: "Sun",
    color: "#EC4899", // pink
  },
  {
    key: "archetypeAlignment",
    label: "Style Alignment",
    description: "Items matching your archetype",
    icon: "Sparkles",
    color: "#3B82F6", // blue
  },
  {
    key: "colorHarmony",
    label: "Color Harmony",
    description: "How well colors coordinate",
    icon: "Zap",
    color: "#F59E0B", // amber
  },
];
