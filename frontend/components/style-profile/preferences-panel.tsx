"use client"

import { useState, useEffect } from "react"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, X, Ban } from "lucide-react"
import { StyleProfile } from "@/types/api"
import { useApi } from "@/lib/api"

interface PreferencesPanelProps {
  styleProfile: StyleProfile
}

const SLIDER_CONFIGS = [
  { key: "formal", label: "Formal", left: "Casual", right: "Formal" },
  { key: "colorful", label: "Color Preference", left: "Neutral", right: "Colorful" },
  { key: "casual", label: "Casual Style", left: "Dressy", right: "Casual" },
  { key: "trendy", label: "Trendiness", left: "Classic", right: "Trendy" },
  { key: "comfort", label: "Comfort", left: "Style", right: "Comfort" },
  { key: "bold", label: "Boldness", left: "Subtle", right: "Bold" },
  { key: "professional", label: "Professional", left: "Relaxed", right: "Professional" },
]

export function PreferencesPanel({ styleProfile }: PreferencesPanelProps) {
  const { styleProfileApi } = useApi()
  const [noGoItem, setNoGoItem] = useState("")
  const [noGos, setNoGos] = useState<string[]>(styleProfile.negativeConstraints || [])
  const [sliders, setSliders] = useState<Record<string, number>>(styleProfile.sliders || {})

  useEffect(() => {
    setNoGos(styleProfile.negativeConstraints || [])
    setSliders(styleProfile.sliders || {})
  }, [styleProfile])

  const addNoGo = async () => {
    if (noGoItem.trim() && !noGos.includes(noGoItem.trim())) {
      const updatedNoGos = [...noGos, noGoItem.trim()]
      setNoGos(updatedNoGos)
      setNoGoItem("")

      // Update in backend
      try {
        await styleProfileApi.updateByUserId({
          negativeConstraints: updatedNoGos,
        })
      } catch (error) {
        console.error("Failed to update negative constraints:", error)
        // Revert on error
        setNoGos(noGos)
      }
    }
  }

  const removeNoGo = async (index: number) => {
    const updatedNoGos = noGos.filter((_, i) => i !== index)
    setNoGos(updatedNoGos)

    // Update in backend
    try {
      await styleProfileApi.updateByUserId({
        negativeConstraints: updatedNoGos,
      })
    } catch (error) {
      console.error("Failed to update negative constraints:", error)
      // Revert on error
      setNoGos(noGos)
    }
  }

  const handleSliderChange = async (key: string, value: number[]) => {
    const updatedSliders = { ...sliders, [key]: value[0] }
    setSliders(updatedSliders)

    // Update in backend
    try {
      await styleProfileApi.updateByUserId({
        sliders: updatedSliders,
      })
    } catch (error) {
      console.error("Failed to update sliders:", error)
      // Revert on error
      setSliders(sliders)
    }
  }

  const getSliderLabel = (key: string) => {
    const config = SLIDER_CONFIGS.find(c => c.key === key)
    if (!config) return "Unknown"

    const value = sliders[key] ?? 50
    if (value < 33) return config.left
    if (value > 66) return config.right
    return "Balanced"
  }

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      {/* Fit & Style Sliders */}
      <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Fit & Budget Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {SLIDER_CONFIGS.map((config) => {
            const value = sliders[config.key] ?? 50
            return (
              <div key={config.key} className="space-y-4">
                <div className="flex justify-between text-sm font-medium">
                  <span>{config.label}</span>
                  <span className="text-muted-foreground">{getSliderLabel(config.key)}</span>
                </div>
                <Slider
                  value={[value]}
                  onValueChange={(val) => handleSliderChange(config.key, val)}
                  max={100}
                  step={1}
                  className="[&>.relative>.absolute]:bg-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{config.left}</span>
                  <span>{config.right}</span>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* No-Go List */}
      <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-serif text-xl">The "No-Go" List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Ban className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="e.g. No Polyester"
                className="pl-9"
                value={noGoItem}
                onChange={(e) => setNoGoItem(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNoGo()}
              />
            </div>
            <Button onClick={addNoGo} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {noGos.map((item, index) => (
              <Badge
                key={index}
                variant="outline"
                className="gap-1 border-destructive/40 bg-destructive/10 px-3 py-1.5 text-destructive hover:bg-destructive/20"
              >
                {item}
                <button onClick={() => removeNoGo(index)} className="ml-1 hover:text-foreground">
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove {item}</span>
                </button>
              </Badge>
            ))}
            {noGos.length === 0 && <p className="text-sm text-muted-foreground italic">No constraints added yet.</p>}
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            AesthetIQ will automatically filter out recommendations containing these attributes.
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
