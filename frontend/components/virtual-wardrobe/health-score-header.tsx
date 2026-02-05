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
  // Circular progress: red ring fills from 0 to score% (e.g. 50 = half, 75 = 3/4)
  const size = 144
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(100, Math.max(0, score))
  const strokeDashoffset = circumference * (1 - progress / 100)

  return (
    <Card className='overflow-hidden border-0 bg-gradient-to-r from-slate-800 to-slate-900'>
      <CardContent className='p-7 lg:p-9'>
        <div className='grid grid-cols-1 gap-9 lg:grid-cols-[1fr_2fr]'>
          {/* Score Circle - ring fills red up to score % */}
          <div className='flex flex-col items-center justify-center gap-4'>
            <div className='relative' style={{ width: size, height: size }}>
              <svg
                className='-rotate-90'
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
              >
                {/* Background ring */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill='none'
                  stroke='rgba(71, 85, 105, 0.5)'
                  strokeWidth={strokeWidth}
                />
                {/* Red progress ring */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill='none'
                  stroke='#ef4444'
                  strokeWidth={strokeWidth}
                  strokeLinecap='round'
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className='transition-all duration-700 ease-out'
                />
              </svg>
              <div className='absolute inset-0 flex flex-col items-center justify-center'>
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
