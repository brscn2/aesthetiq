'use client'

import React from 'react'
import { 
  WardrobeIntelligence, 
  WardrobeHealthScore, 
  DIMENSION_METADATA 
} from '@/types/wardrobe-intelligence'
import { useWardrobeIntelligence } from '@/hooks/use-wardrobe-intelligence'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Loader, 
  AlertCircle, 
  RefreshCw 
} from 'lucide-react'
import { HealthScoreHeader } from './health-score-header'
import { DimensionalAnalysis } from './dimensional-analysis'
import { SmartGapAnalysis } from './smart-gap-analysis'
import { QuickStats } from './quick-stats'

/**
 * Main Wardrobe Intelligence Component
 * 
 * Displays multi-dimensional analysis of user's wardrobe including:
 * - Overall health score and tier
 * - 5+ dimensional metrics (variety, seasonal fit, style alignment, budget efficiency, color harmony)
 * - Usage patterns and rotation insights
 * - Smart recommendations for gap filling
 * - Quick action stats
 */
export function WardrobeIntelligenceComponent() {
  const { data, isLoading, error, refetch } = useWardrobeIntelligence()

  // Calculate tier description and motivation message
  const tierDescriptions: Record<WardrobeHealthScore, string> = {
    MINIMAL: 'Your wardrobe is just getting started. Build your foundation!',
    BALANCED: 'Good balance. Time to add more depth and dimension.',
    DIVERSE: 'Excellent variety and cohesion. Keep building!',
    EXPERT: 'Outstanding wardrobe quality. You\'re a style master!',
  }

  const tierColors: Record<WardrobeHealthScore, string> = {
    MINIMAL: 'bg-gray-500/20 text-gray-400',
    BALANCED: 'bg-blue-500/20 text-blue-400',
    DIVERSE: 'bg-purple-500/20 text-purple-400',
    EXPERT: 'bg-amber-500/20 text-amber-300',
  }

  if (error) {
    return (
      <Card className='border-red-500/30 bg-red-950/10'>
        <CardContent className='pt-6'>
          <div className='flex items-center gap-3 text-red-400'>
            <AlertCircle className='h-5 w-5' />
            <div>
              <p className='font-semibold'>Failed to load wardrobe intelligence</p>
              <p className='text-sm opacity-75'>{error}</p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className='mt-3 flex items-center gap-2 px-3 py-2 rounded-md hover:bg-red-500/10 transition-colors'
          >
            <RefreshCw className='h-4 w-4' />
            Try Again
          </button>
        </CardContent>
      </Card>
    )
  }

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className='pt-6'>
          <div className='flex items-center justify-center gap-3 py-12'>
            <Loader className='h-5 w-5 animate-spin text-purple-400' />
            <span className='text-gray-400'>Analyzing your wardrobe...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { overall, dimensions, insights } = data

  const formatDimensionLabel = (key: string) => {
    const match = DIMENSION_METADATA.find((d) => d.key === key)
    return match ? match.label : key
  }

  return (
    <div className='space-y-8'>
      {/* Header Section with Overall Score */}
      <HealthScoreHeader
        score={overall.score}
        tier={overall.tier}
        tierDescription={tierDescriptions[overall.tier]}
        tierColor={tierColors[overall.tier]}
        primaryStrength={formatDimensionLabel(insights.primaryStrength)}
        primaryOpportunity={formatDimensionLabel(insights.primaryOpportunity)}
        lastCalculated={overall.lastCalculated}
      />

      {/* Tabbed Analysis Sections */}
      <DimensionalAnalysis dimensions={dimensions} insights={insights} />

      {/* Smart Gap Analysis & Recommendations */}
      <SmartGapAnalysis 
        archetypeAlignment={dimensions.archetypeAlignment}
      />

      {/* Quick Stats Footer */}
      <QuickStats 
        dimensions={dimensions}
        comboPotential={insights.comboPotential}
      />

      {/* Last Updated */}
      <div className='text-xs text-gray-500 text-center'>
        Last calculated: {new Date(overall.lastCalculated).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </div>
  )
}
