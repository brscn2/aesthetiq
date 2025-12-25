"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { useApi } from "@/lib/api"
import { ColorAnalysis } from "@/types/api"

export function StyleDnaSummary() {
  const { analysisApi } = useApi()
  const [analysis, setAnalysis] = useState<ColorAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadLatestAnalysis = async () => {
      try {
        const latest = await analysisApi.getLatest()
        setAnalysis(latest)
      } catch (err: any) {
        // No analysis found is okay - user hasn't done analysis yet
        if (err.response?.status !== 404) {
          console.error("Failed to load latest analysis:", err)
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadLatestAnalysis()
  }, [])

  // Show placeholder if no analysis exists
  if (isLoading) {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 flex-1">
        <div className="text-xs text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 flex-1">
        <Badge variant="outline" className="border-muted/50 text-muted-foreground flex-shrink-0 text-xs">
          No Analysis Yet
        </Badge>
      </div>
    )
  }

  const styleStats = [
    { label: "Contrast", value: analysis.contrastLevel },
    { label: "Undertone", value: analysis.undertone },
    { label: "Season", value: analysis.season },
    ...(analysis.faceShape ? [{ label: "Face Shape", value: analysis.faceShape }] : []),
  ]

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 flex-1">
      {/* Color Palette - Compact */}
      {analysis.palette && analysis.palette.length > 0 && (
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">Colors:</span>
          <div className="flex gap-1.5 sm:gap-2">
            {analysis.palette.slice(0, 6).map((color, idx) => (
              <div
                key={idx}
                className="h-5 w-5 sm:h-6 sm:w-6 rounded-full border border-border/50 shadow-sm"
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
          </div>
        </div>
      )}

      {/* Style Stats - Compact */}
      <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
        {styleStats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">{stat.label}:</span>
            <span className="text-xs text-muted-foreground sm:hidden">{stat.label.split(" ")[0]}:</span>
            <Badge variant="outline" className="text-xs border-border/50">
              {stat.value}
            </Badge>
          </div>
        ))}
      </div>

      <Badge variant="outline" className="border-primary/50 text-primary flex-shrink-0 text-xs">
        Analyzed
      </Badge>
    </div>
  )
}
