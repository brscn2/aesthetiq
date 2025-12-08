"use client"

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Sparkles } from "lucide-react"
import { StyleProfile } from "@/types/api"

interface ArchetypeHeroProps {
  styleProfile: StyleProfile
}

export function ArchetypeHero({ styleProfile }: ArchetypeHeroProps) {
  const chartData = useMemo(() => {
    const sliders = styleProfile.sliders || {}
    const defaultData = [
      { subject: "Trendy", A: 60, fullMark: 100 },
      { subject: "Classic", A: 70, fullMark: 100 },
      { subject: "Comfort", A: 75, fullMark: 100 },
      { subject: "Bold", A: 40, fullMark: 100 },
      { subject: "Professional", A: 65, fullMark: 100 },
    ]

    // Map slider values to chart data
    const sliderMap: Record<string, string> = {
      trendy: "Trendy",
      classic: "Classic",
      comfort: "Comfort",
      bold: "Bold",
      professional: "Professional",
    }

    return Object.entries(sliderMap).map(([key, subject]) => ({
      subject,
      A: sliders[key] ?? defaultData.find(d => d.subject === subject)?.A ?? 50,
      fullMark: 100,
    }))
  }, [styleProfile.sliders])

  const archetypeDescription = useMemo(() => {
    const descriptions: Record<string, string> = {
      "Urban Minimalist": "You prefer clean lines, monochromatic tones, and functional fabrics. Your aesthetic prioritizes silhouette over pattern, favoring architectural shapes that bridge the gap between office sophistication and street-style edge.",
      "Classic Elegance": "You value timeless pieces and refined sophistication. Your style is built on quality basics and elegant silhouettes that never go out of fashion.",
      "Bold Innovator": "You're not afraid to experiment with color, pattern, and shape. Your wardrobe reflects your creative spirit and willingness to push boundaries.",
      "Casual Comfort": "Comfort and ease are your priorities. You favor relaxed fits and versatile pieces that work for any occasion.",
    }
    return descriptions[styleProfile.archetype] || "Your unique style profile is being developed based on your preferences and wardrobe."
  }, [styleProfile.archetype])

  return (
    <section className="grid gap-8 lg:grid-cols-2 lg:items-center">
      <div className="space-y-6">
        <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          <Sparkles className="mr-2 h-3.5 w-3.5" />
          AI Analysis
        </div>
        <div className="space-y-2">
          <h2 className="font-serif text-4xl font-bold leading-tight md:text-5xl">
            Your Style Persona: <br />
            <span className="text-gradient-ai">{styleProfile.archetype}</span>
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            {archetypeDescription}
          </p>
        </div>
      </div>

      <Card className="overflow-hidden border-primary/20 bg-card/30 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="relative aspect-square w-full max-w-md mx-auto">
            {/* Glow Effect Background */}
            <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full" />

            <ChartContainer
              config={{
                value: {
                  label: "Score",
                  color: "var(--chart-1)",
                },
              }}
              className="h-full w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                  <PolarGrid stroke="var(--muted-foreground)" strokeOpacity={0.3} />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{
                      fill: "var(--card-foreground)",
                      fontSize: 12,
                      fontWeight: 500
                    }}
                  />
                  <Radar
                    name="Style Score"
                    dataKey="A"
                    stroke="var(--chart-1)"
                    strokeWidth={3}
                    fill="var(--chart-1)"
                    fillOpacity={0.25}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
