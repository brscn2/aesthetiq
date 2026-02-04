'use client'

import React from 'react'

/**
 * Placeholder timeline heatmap component
 * Shows last-worn dates as a calendar heatmap
 */
export function TimelineHeatmap() {
  // Generate last 12 weeks of data
  const weeks = Array.from({ length: 12 }, (_, i) => ({
    week: i,
    items: Math.floor(Math.random() * 8),
  }))

  return (
    <div className='space-y-3'>
      <div className='flex gap-2'>
        {weeks.map((week) => {
          const intensity = Math.min(week.items / 5, 1)
          const opacity = 0.2 + intensity * 0.8

          return (
            <div
              key={week.week}
              className='h-7 w-5 rounded border border-slate-600'
              style={{
                backgroundColor: `rgba(139, 92, 246, ${opacity})`,
              }}
              title={`Week ${week.week + 1}: ${week.items} items worn`}
            />
          )
        })}
      </div>
      <p className='text-xs text-gray-400'>Last 12 weeks of wear activity</p>
    </div>
  )
}
