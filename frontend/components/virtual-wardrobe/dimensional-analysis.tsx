'use client'

import React from 'react'
import { DimensionalMetrics, WardrobeInsights, DIMENSION_METADATA } from '@/types/wardrobe-intelligence'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { HealthRadarChart } from './charts/health-radar-chart'

interface DimensionalAnalysisProps {
  dimensions: DimensionalMetrics
  insights: WardrobeInsights
}

/**
 * Tabbed dimensional analysis component
 * Shows 5 key dimensions of wardrobe health with visualizations
 */
export function DimensionalAnalysis({
  dimensions,
  insights,
}: DimensionalAnalysisProps) {
  // Filter out usagePattern from dimensions for radar display
  const radarDimensions = Object.entries(dimensions)
    .filter(([key]) => key !== 'usagePattern')
    .map(([key, value]) => ({
      name: DIMENSION_METADATA.find((d) => d.key === key)?.label || key,
      value: value as number,
      color: DIMENSION_METADATA.find((d) => d.key === key)?.color || '#6B7280',
    }))

  return (
    <Card>
      <CardHeader className='pb-5'>
        <CardTitle className='text-lg'>Wardrobe Analysis</CardTitle>
        <CardDescription className='text-sm'>
          5-dimensional view of your wardrobe health
        </CardDescription>
      </CardHeader>
      <CardContent className='pt-3 pb-6'>
        <Tabs defaultValue='overview' className='w-full'>
          <TabsList className='grid w-full grid-cols-3 gap-3 h-auto p-2'>
            <TabsTrigger value='overview'>Overview</TabsTrigger>
            <TabsTrigger value='dimensions'>Dimensions</TabsTrigger>
            <TabsTrigger value='insights'>Insights</TabsTrigger>
          </TabsList>

          {/* Overview Tab - Radar Chart */}
          <TabsContent value='overview' className='space-y-4 pt-4'>
            <div className='h-80 sm:h-96'>
              <HealthRadarChart dimensions={radarDimensions} />
            </div>
            <p className='text-sm text-gray-300 text-center'>
              Larger area = healthier wardrobe across all dimensions
            </p>
          </TabsContent>

          {/* Individual Dimension Scores */}
          <TabsContent value='dimensions' className='space-y-5 pt-4'>
            <div className='space-y-5'>
              {DIMENSION_METADATA.map((metadata) => {
                const value = dimensions[metadata.key] as number
                return (
                  <div key={metadata.key} className='space-y-2'>
                    <div className='flex items-center justify-between gap-3'>
                      <div>
                        <p className='font-medium text-white'>{metadata.label}</p>
                        <p className='text-xs text-gray-300'>{metadata.description}</p>
                      </div>
                      <span className='text-lg font-bold' style={{ color: metadata.color }}>
                        {value}%
                      </span>
                    </div>
                    <Progress value={value} className='h-2.5' />
                  </div>
                )
              })}
            </div>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value='insights' className='space-y-5 pt-4'>
            <div className='space-y-5'>
              <InsightCard
                title='Styling Potential'
                description='Estimated number of unique outfit combinations'
                items={[
                  {
                    label: 'Possible Combos',
                    value: `${insights.comboPotential} outfits`,
                  },
                ]}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

/**
 * Simple stat card for displaying key metrics
 */
/**
 * Insight card for displaying grouped insights
 */
function InsightCard({
  title,
  description,
  items,
}: {
  title: string
  description: string
  items: Array<{ label: string; value: string }>
}) {
  return (
    <div className='rounded-lg bg-slate-800/50 p-5 border border-slate-700'>
      <p className='font-medium text-white mb-1'>{title}</p>
      <p className='text-sm text-gray-300 mb-4'>{description}</p>
      <div className='space-y-2'>
        {items.map((item, idx) => (
          <div key={idx} className='flex justify-between items-center text-sm'>
            <span className='text-gray-200'>{item.label}</span>
            <span className='font-semibold text-gray-100'>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
