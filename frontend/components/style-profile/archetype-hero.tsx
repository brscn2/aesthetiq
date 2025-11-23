"use client"

import { Card, CardContent } from "@/components/ui/card"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Sparkles } from "lucide-react"

const data = [
  { subject: "Trendy", A: 120, fullMark: 150 },
  { subject: "Classic", A: 98, fullMark: 150 },
  { subject: "Comfort", A: 86, fullMark: 150 },
  { subject: "Bold", A: 65, fullMark: 150 },
  { subject: "Professional", A: 110, fullMark: 150 },
]

export function ArchetypeHero() {
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
            <span className="text-gradient-ai">Urban Minimalist</span>
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            You prefer clean lines, monochromatic tones, and functional fabrics. Your aesthetic prioritizes silhouette
            over pattern, favoring architectural shapes that bridge the gap between office sophistication and
            street-style edge.
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
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-full w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                  <PolarGrid stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Radar
                    name="Style Score"
                    dataKey="A"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
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
