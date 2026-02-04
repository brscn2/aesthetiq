'use client'

import React from 'react'
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'

interface Dimension {
  name: string
  value: number
  color: string
}

interface HealthRadarChartProps {
  dimensions: Dimension[]
}

/**
 * Radar chart showing 5 dimensions of wardrobe health
 * Visual representation of balance across all metrics
 */
export function HealthRadarChart({ dimensions }: HealthRadarChartProps) {
  return (
    <ResponsiveContainer width='100%' height='100%'>
      <RadarChart data={dimensions} outerRadius='80%'>
        <PolarGrid stroke='#374151' strokeDasharray='3 3' />
        <PolarAngleAxis
          dataKey='name'
          tick={{ fill: '#9CA3AF', fontSize: 12 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: '#6B7280', fontSize: 11 }}
        />
        <Radar
          name='Wardrobe Health'
          dataKey='value'
          stroke='#8B5CF6'
          fill='#8B5CF6'
          fillOpacity={0.25}
          animationDuration={1000}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
