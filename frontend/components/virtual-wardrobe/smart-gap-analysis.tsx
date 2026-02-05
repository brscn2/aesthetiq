'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useWardrobeGapAnalysis } from '@/hooks/use-wardrobe-gap-analysis'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Lightbulb, ArrowRight, RefreshCw } from 'lucide-react'
import { useWardrobeRecommendation } from '@/contexts/wardrobe-recommendation-context'
import type { GapRecommendation } from '@/types/wardrobe-intelligence'

interface SmartGapAnalysisProps {
  archetypeAlignment: number
}

/**
 * Smart gap analysis showing recommended items to add
 * AI-powered recommendations based on wardrobe gaps
 */
export function SmartGapAnalysis({
  archetypeAlignment,
}: SmartGapAnalysisProps) {
  const router = useRouter()
  const { setRecommendation } = useWardrobeRecommendation()
  const { data, isLoading, isError, refetch, isFetching } = useWardrobeGapAnalysis(true)
  const recommendations = data?.recommendations || []

  const handleFindItem = (rec: GapRecommendation) => {
    setRecommendation({
      title: rec.title,
      reason: rec.reason,
      category: rec.category,
    })
    router.push('/dashboard')
  }

  return (
    <Card className='border-purple-500/20 bg-gradient-to-br from-purple-950/30 to-transparent'>
      <CardHeader className='pb-5'>
        <div className='flex items-start justify-between gap-3'>
          <div className='flex items-center gap-2'>
            <Lightbulb className='h-5 w-5 text-purple-400' />
            <div>
              <CardTitle className='text-lg'>Smart Gap Analysis</CardTitle>
              <CardDescription className='text-sm'>
                AI-powered recommendations to complete your wardrobe
              </CardDescription>
            </div>
          </div>
          <Button
            variant='outline'
            size='sm'
            className='h-8 gap-2'
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className='space-y-6'>
        {archetypeAlignment < 70 && (
          <div className='rounded-lg bg-amber-500/10 p-4 border border-amber-500/30'>
            <p className='text-sm text-amber-200'>
              💡 Your additions should align more closely with your style archetype for maximum cohesion.
            </p>
          </div>
        )}

        <div className='grid gap-4'>
          {isLoading && (
            <div className='rounded-lg bg-slate-800/50 p-5 border border-slate-700 text-sm text-gray-300'>
              Generating tailored recommendations...
            </div>
          )}

          {isError && !isLoading && (
            <div className='rounded-lg bg-red-500/10 p-5 border border-red-500/20 text-sm text-red-300'>
              Unable to generate recommendations right now.
            </div>
          )}

          {!isLoading && !isError && recommendations.length === 0 && (
            <div className='rounded-lg bg-slate-800/50 p-5 border border-slate-700 text-sm text-gray-300'>
              Add more items to your wardrobe to unlock gap insights.
            </div>
          )}

          {recommendations.map((rec, index) => (
            <div
              key={`${rec.title}-${index}`}
              className='rounded-lg bg-slate-800/50 p-5 border border-slate-700 hover:bg-slate-800/70 transition-colors'
            >
              <div className='flex items-start justify-between gap-3 mb-3'>
                <div className='flex items-start gap-3'>
                  <span className='text-3xl'>✨</span>
                  <div>
                    <p className='font-semibold text-white'>{rec.title}</p>
                    <p className='text-sm text-gray-300'>{rec.reason}</p>
                    {rec.category && (
                      <p className='text-xs text-gray-400 mt-1'>{rec.category}</p>
                    )}
                  </div>
                </div>
                {typeof rec.alignmentScore === 'number' && (
                  <Badge variant='secondary' className='text-xs'>
                    {rec.alignmentScore}%
                  </Badge>
                )}
              </div>
              <div className='flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between'>
                {rec.priceRange && (
                  <span className='text-sm text-gray-300'>Estimated: {rec.priceRange}</span>
                )}
                <Button
                  size='sm'
                  variant='ghost'
                  className='gap-2 text-purple-400 hover:text-purple-300'
                  onClick={() => handleFindItem(rec)}
                >
                  Find Item
                  <ArrowRight className='h-4 w-4' />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className='rounded-lg bg-slate-800/30 p-4 border border-slate-700'>
          <p className='text-xs text-gray-300 leading-relaxed'>
            ✨ These recommendations are based on your wardrobe gaps, style archetype alignment, and budget range. Click "Find Item" to search your favorite retailers.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
