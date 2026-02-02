import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WardrobeItemDocument } from '../schemas/wardrobe-item.schema';
import { StyleProfileDocument } from '../../style-profile/schemas/style-profile.schema';
import { ColorAnalysisDocument } from '../../analysis/schemas/color-analysis.schema';
import { SeasonalPalette } from '../../common/seasonal-colors';
import {
  WardrobeIntelligence,
  WardrobeHealthScore,
  DimensionalMetrics,
  SmartGapAnalysis,
} from './intelligence.types';
import { AiService } from '../../ai/ai.service';
import {
  calculateVarietyScore,
  calculateSeasonalCompatibility,
  calculateArchetypeAlignment,
  calculateColorHarmonyScore,
} from './intelligence.utils';

@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);

  constructor(
    @InjectModel('WardrobeItem')
    private wardrobeItemModel: Model<WardrobeItemDocument>,
    @InjectModel('StyleProfile')
    private styleProfileModel: Model<StyleProfileDocument>,
    @InjectModel('ColorAnalysis')
    private colorAnalysisModel: Model<ColorAnalysisDocument>,
    private aiService: AiService,
  ) {}

  /**
   * Calculate comprehensive wardrobe intelligence for a user
   * Aggregates multiple dimensions into a holistic health score and insights
   */
  async calculateIntelligence(userId: string): Promise<WardrobeIntelligence> {
    this.logger.log(`Calculating wardrobe intelligence for user: ${userId}`);

    // Fetch user data in parallel
    const [items, styleProfile, latestColorAnalysis] = await Promise.all([
      this.wardrobeItemModel
        .find({ userId })
        .lean()
        .exec(),
      this.styleProfileModel
        .findOne({ userId })
        .lean()
        .exec(),
      this.colorAnalysisModel
        .findOne({ userId })
        .sort({ scanDate: -1, createdAt: -1 })
        .lean()
        .exec(),
    ]);

    // Early return for empty wardrobe
    if (!items || items.length === 0) {
      return this.getEmptyWardrobeIntelligence();
    }

    // Calculate all dimensions
    const userPalette = this.normalizeSeasonToPalette(latestColorAnalysis?.season);
    const dimensions: DimensionalMetrics = {
      variety: calculateVarietyScore(items),
      seasonalCompatibility: calculateSeasonalCompatibility(items, userPalette),
      archetypeAlignment: styleProfile
        ? calculateArchetypeAlignment(items, styleProfile)
        : 0,
      colorHarmony: calculateColorHarmonyScore(items),
    };

    // Aggregate into overall health score (0-100)
    const overallScore = this.aggregateHealthScore(dimensions);
    const healthTier = this.getHealthTier(overallScore);

    // Identify primary strengths and opportunities
    const dimensionEntries = Object.entries(dimensions);
    const strongest = dimensionEntries.reduce((max, [key, val]) =>
      val > max[1] ? [key, val] : max
    )[0];
    const weakest = dimensionEntries.reduce((min, [key, val]) =>
      val < min[1] ? [key, val] : min
    )[0];

    // Calculate item rotation risk for underused pieces
    // Calculate styling depth (combo potential)
    const comboPotential = this.calculateComboPotential(items);

    return {
      overall: {
        score: overallScore,
        tier: healthTier,
        lastCalculated: new Date(),
      },
      dimensions,
      insights: {
        primaryStrength: strongest as string,
        primaryOpportunity: weakest as string,
        comboPotential,
      },
    } as WardrobeIntelligence;
  }

  /**
   * Calculate usage patterns based on last-worn dates
   */
  private normalizeSeasonToPalette(season?: string | null): SeasonalPalette | undefined {
    if (!season) return undefined;
    const normalized = season
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_');
    return (Object.values(SeasonalPalette) as string[]).includes(normalized)
      ? (normalized as SeasonalPalette)
      : undefined;
  }

  /**
   * Calculate how many unique outfits can be created from wardrobe
   * (simplified: category-based combo calculation)
   */
  private calculateComboPotential(items: any[]): number {
    const topCount = items.filter((i) => i.category === 'TOP').length || 1;
    const bottomCount = items.filter((i) => i.category === 'BOTTOM').length || 1;
    const shoeCount = items.filter((i) => i.category === 'SHOE').length || 1;

    // Conservative estimate: cap at reasonable number to avoid inflated metrics
    const combos = Math.min(topCount * bottomCount * shoeCount, 999);
    return combos;
  }


  async getSmartGapAnalysis(userId: string): Promise<SmartGapAnalysis> {
    const [items, styleProfile] = await Promise.all([
      this.wardrobeItemModel.find({ userId }).lean().exec(),
      this.styleProfileModel.findOne({ userId }).lean().exec(),
    ]);

    return this.aiService.generateWardrobeGapAnalysis({
      userId,
      styleProfile,
      wardrobeItems: items,
    });
  }

  /**
   * Aggregate individual dimension scores into overall health score
   */
  private aggregateHealthScore(dimensions: DimensionalMetrics): number {
    const weights = {
      variety: 0.35,
      seasonalCompatibility: 0.3,
      archetypeAlignment: 0.2,
      colorHarmony: 0.15,
    };

    const score =
      (dimensions.variety as number) * weights.variety +
      (dimensions.seasonalCompatibility as number) * weights.seasonalCompatibility +
      (dimensions.archetypeAlignment as number) * weights.archetypeAlignment +
      (dimensions.colorHarmony as number) * weights.colorHarmony;

    return Math.round(score);
  }

  /**
   * Map numeric score to health tier
   */
  private getHealthTier(score: number): WardrobeHealthScore {
    if (score >= 80) return 'EXPERT';
    if (score >= 65) return 'DIVERSE';
    if (score >= 50) return 'BALANCED';
    return 'MINIMAL';
  }

  /**
   * Empty wardrobe placeholder intelligence
   */
  private getEmptyWardrobeIntelligence(): WardrobeIntelligence {
    return {
      overall: {
        score: 0,
        tier: 'MINIMAL',
        lastCalculated: new Date(),
      },
      dimensions: {
        variety: 0,
        seasonalCompatibility: 0,
        archetypeAlignment: 0,
        colorHarmony: 0,
      },
      insights: {
        primaryStrength: 'Start adding items',
        primaryOpportunity: 'Build foundational wardrobe',
        comboPotential: 0,
      },
    };
  }
}
