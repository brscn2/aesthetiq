'use client'

import React from 'react'
import { DimensionalMetrics } from '@/types/wardrobe-intelligence'
import { Card, CardContent } from '@/components/ui/card'
import { RefreshCw, Zap, Target } from 'lucide-react'

interface QuickStatsProps {
  dimensions: DimensionalMetrics
  comboPotential: number
}

/**
 * Quick stats footer showing key metrics at a glance
 * Compact summary for taking action
 */
export function QuickStats({
  dimensions,
  comboPotential,
}: QuickStatsProps) {
  const stats = [
    {
      icon: Target,
      label: 'Combo Potential',
      value: comboPotential,
      color: 'text-purple-400 bg-purple-500/10',
      description: 'Possible outfits',
    },
    {
      icon: Zap,
      label: 'Seasonal Fit',
      value: `${dimensions.seasonalCompatibility}%`,
      color: 'text-pink-400 bg-pink-500/10',
      description: 'Matches your palette',
    },
    {
      icon: RefreshCw,
      label: 'Color Harmony',
      value: `${dimensions.colorHarmony}%`,
      color: 'text-amber-400 bg-amber-500/10',
      description: 'Palette cohesion',
    },
  ]

  return (
    <Card className='border-slate-700'>
      <CardContent className='p-7'>
        <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className={`rounded-lg p-5 ${stat.color} border border-current/20 min-w-0`}
              >
                <div className='flex items-start justify-between gap-3 mb-3'>
                  <Icon className='h-5 w-5' />
                </div>
                <p className='text-2xl font-bold text-white mb-2 leading-tight'>{stat.value}</p>
                <p className='text-xs text-gray-300 leading-relaxed break-words'>{stat.label}</p>
                <p className='text-xs text-gray-500 mt-1 leading-relaxed break-words'>{stat.description}</p>
              </div>
            )
          })}
        </div>

        {/* Action suggestions */}
        <div className='mt-5 space-y-3 pt-4 border-t border-slate-700'>
          {comboPotential > 500 && (
            <div className='flex items-center gap-2 text-sm text-purple-300'>
              <Zap className='h-4 w-4' />
              <span>
                With {comboPotential}+ possible combinations, you have excellent outfit variety!
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
