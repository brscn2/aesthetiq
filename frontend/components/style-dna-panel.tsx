"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useApi } from "@/lib/api"
import { ColorAnalysis } from "@/types/api"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"

export function StyleDnaPanel() {
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

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading your style DNA...</div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="h-full space-y-4">
        <Card className="border-border/50 bg-card">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Color Analysis Yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Get started by analyzing your colors to discover your perfect palette.
            </p>
            <Link href="/color-analysis">
              <Button>Start Color Analysis</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const styleStats = [
    { label: "Contrast Level", value: analysis.contrastLevel },
    { label: "Undertone", value: analysis.undertone },
    { label: "Season", value: analysis.season },
    ...(analysis.faceShape ? [{ label: "Face Shape", value: analysis.faceShape }] : []),
  ]

  return (
    <div className="h-full space-y-4">
      {/* User Photo Card */}
      <Card className="overflow-hidden border-border/50 bg-card">
        <div className="relative aspect-[4/3] w-full">
          {analysis.imageUrl ? (
            <img
              src={analysis.imageUrl}
              alt="Color analysis"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to placeholder if image fails to load
                e.currentTarget.style.display = "none"
              }}
            />
          ) : (
            <Image src="/professional-portrait-photo-fashion.jpg" alt="User portrait" fill className="object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 flex gap-2 flex-wrap">
            <Badge className="bg-primary/90 text-primary-foreground backdrop-blur-sm">
              {analysis.season}
            </Badge>
            {analysis.faceShape && (
              <Badge className="bg-accent/90 text-accent-foreground backdrop-blur-sm">
                {analysis.faceShape} Face Shape
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Color Palette */}
      {analysis.palette && analysis.palette.length > 0 && (
        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Your Best Colors</CardTitle>
            <CardDescription>Colors that complement your natural features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-3">
              {analysis.palette.slice(0, 12).map((color, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <div
                    className="h-12 w-12 rounded-full border-2 border-border shadow-lg transition-transform hover:scale-110"
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                  <span className="text-xs text-muted-foreground truncate w-full text-center">
                    {color.name}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Style Stats */}
      <div className="grid grid-cols-2 gap-3">
        {styleStats.map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Link to full analysis */}
      <Link href="/color-analysis">
        <Button variant="outline" className="w-full">
          View Full Analysis
        </Button>
      </Link>
    </div>
  )
}
