'use client'

import React from 'react'
import { WardrobeHealthScore } from '@/types/wardrobe-intelligence'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Target } from 'lucide-react'

interface HealthScoreHeaderProps {
  score: number
  tier: WardrobeHealthScore
  tierDescription: string
  tierColor: string
  primaryStrength: string
  primaryOpportunity: string
  lastCalculated: Date
}

/**
 * Header displaying overall wardrobe health score and tier
 * Shows primary strength and opportunity at a glance
 */
export function HealthScoreHeader({
  score,
  tier,
  tierDescription,
  tierColor,
  primaryStrength,
  primaryOpportunity,
  lastCalculated,
}: HealthScoreHeaderProps) {
  // Determine visual appearance based on score
  const scoreColor =
    score >= 80
      ? 'from-amber-500 to-orange-500'
      : score >= 65
        ? 'from-purple-500 to-pink-500'
        : score >= 50
          ? 'from-blue-500 to-cyan-500'
          : 'from-gray-500 to-slate-500'

  return (
    <Card className='overflow-hidden border-0 bg-gradient-to-r from-slate-800 to-slate-900'>
      <CardContent className='p-7 lg:p-9'>
        <div className='grid grid-cols-1 gap-9 lg:grid-cols-[1fr_2fr]'>
          {/* Score Circle */}
          <div className='flex flex-col items-center justify-center gap-4'>
            <div className={`relative h-36 w-36 rounded-full bg-gradient-to-br ${scoreColor} p-1` }>
              <div className='h-full w-full rounded-full bg-slate-900 flex flex-col items-center justify-center'>
                <span className='text-5xl font-bold text-white'>{score}</span>
                <span className='text-sm text-gray-400'>/ 100</span>
              </div>
            </div>
            <Badge className={`px-3 py-1 text-sm ${tierColor}`}>
              {tier === 'MINIMAL' && '🌱 '}
              {tier === 'BALANCED' && '⚖️ '}
              {tier === 'DIVERSE' && '🎨 '}
              {tier === 'EXPERT' && '👑 '}
              {tier}
            </Badge>
          </div>

          {/* Description and Insights */}
          <div className='flex flex-col justify-center space-y-5'>
            <div>
              <h3 className='text-xl font-semibold text-white mb-2'>
                {tier === 'MINIMAL' && 'Building Your Style Foundation'}
                {tier === 'BALANCED' && 'Developing Your Style Identity'}
                {tier === 'DIVERSE' && 'Mastering Wardrobe Variety'}
                {tier === 'EXPERT' && 'Expert Style Curator'}
              </h3>
              <p className='text-sm text-gray-300 leading-relaxed'>{tierDescription}</p>
            </div>

            <div className='grid grid-cols-1 gap-4'>
              {/* Strength */}
              <div className='rounded-lg bg-green-500/10 p-4 border border-green-500/20 min-w-0'>
                <div className='flex items-start gap-3'>
                  <TrendingUp className='h-4 w-4 text-green-300 flex-shrink-0 mt-0.5' />
                  <div>
                    <p className='text-xs text-gray-300 font-medium'>Strength</p>
                    <p className='text-sm text-green-200 break-words leading-relaxed'>
                      {primaryStrength}
                    </p>
                  </div>
                </div>
              </div>

              {/* Opportunity */}
              <div className='rounded-lg bg-amber-500/10 p-4 border border-amber-500/20 min-w-0'>
                <div className='flex items-start gap-3'>
                  <Target className='h-4 w-4 text-amber-300 flex-shrink-0 mt-0.5' />
                  <div>
                    <p className='text-xs text-gray-300 font-medium'>Opportunity</p>
                    <p className='text-sm text-amber-200 break-words leading-relaxed'>
                      {primaryOpportunity}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
