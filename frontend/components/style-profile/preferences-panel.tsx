"use client"

import { useState, useEffect } from "react"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Plus, X, Ban, DollarSign } from "lucide-react"
import { StyleProfile, FitPreference, BudgetRange } from "@/types/api"
import { useApi } from "@/lib/api"
import { toast } from "sonner"

interface PreferencesPanelProps {
  styleProfile: StyleProfile
  onProfileUpdate?: () => void
}

const SLIDER_CONFIGS = [
  { key: "formal", label: "Formal", left: "Casual", right: "Formal" },
  { key: "colorful", label: "Color Preference", left: "Neutral", right: "Colorful" },
  { key: "trendy", label: "Trendiness", left: "Classic", right: "Trendy" },
  { key: "comfort", label: "Comfort", left: "Style", right: "Comfort" },
  { key: "bold", label: "Boldness", left: "Subtle", right: "Bold" },
]

const FIT_OPTIONS: { value: FitPreference; label: string }[] = [
  { value: "slim", label: "Slim" },
  { value: "regular", label: "Regular" },
  { value: "relaxed", label: "Relaxed" },
  { value: "oversized", label: "Oversized" },
]

const BUDGET_OPTIONS: { value: BudgetRange; label: string; description: string }[] = [
  { value: "budget", label: "Budget", description: "Under €50/item" },
  { value: "mid-range", label: "Mid-Range", description: "€50-150/item" },
  { value: "premium", label: "Premium", description: "€150-400/item" },
  { value: "luxury", label: "Luxury", description: "€400+/item" },
]

export function PreferencesPanel({ styleProfile, onProfileUpdate }: PreferencesPanelProps) {
  const { styleProfileApi } = useApi()
  const [noGoItem, setNoGoItem] = useState("")
  const [noGos, setNoGos] = useState<string[]>(styleProfile.negativeConstraints || [])
  const [sliders, setSliders] = useState<Record<string, number>>(styleProfile.sliders || {})
  const [fitPreferences, setFitPreferences] = useState(styleProfile.fitPreferences || {})
  const [budgetRange, setBudgetRange] = useState<BudgetRange>(styleProfile.budgetRange || "mid-range")
  const [maxPrice, setMaxPrice] = useState<string>(styleProfile.maxPricePerItem?.toString() || "")

  useEffect(() => {
    setNoGos(styleProfile.negativeConstraints || [])
    setSliders(styleProfile.sliders || {})
    setFitPreferences(styleProfile.fitPreferences || {})
    setBudgetRange(styleProfile.budgetRange || "mid-range")
    setMaxPrice(styleProfile.maxPricePerItem?.toString() || "")
  }, [styleProfile])

  const addNoGo = async () => {
    if (noGoItem.trim() && !noGos.includes(noGoItem.trim())) {
      const updatedNoGos = [...noGos, noGoItem.trim()]
      setNoGos(updatedNoGos)
      setNoGoItem("")

      try {
        await styleProfileApi.updateByUserId({
          negativeConstraints: updatedNoGos,
        })
      } catch (error) {
        console.error("Failed to update negative constraints:", error)
        setNoGos(noGos)
      }
    }
  }

  const removeNoGo = async (index: number) => {
    const updatedNoGos = noGos.filter((_, i) => i !== index)
    setNoGos(updatedNoGos)

    try {
      await styleProfileApi.updateByUserId({
        negativeConstraints: updatedNoGos,
      })
    } catch (error) {
      console.error("Failed to update negative constraints:", error)
      setNoGos(noGos)
    }
  }

  const handleSliderChange = async (key: string, value: number[]) => {
    const updatedSliders = { ...sliders, [key]: value[0] }
    setSliders(updatedSliders)

    try {
      await styleProfileApi.updateByUserId({
        sliders: updatedSliders,
      })
    } catch (error) {
      console.error("Failed to update sliders:", error)
      setSliders(sliders)
    }
  }

  const handleFitChange = async (category: 'top' | 'bottom' | 'outerwear', fit: FitPreference) => {
    const updatedFit = { ...fitPreferences, [category]: fit }
    setFitPreferences(updatedFit)

    try {
      await styleProfileApi.updateByUserId({
        fitPreferences: updatedFit,
      })
      toast.success("Fit preference updated")
    } catch (error) {
      console.error("Failed to update fit preferences:", error)
      setFitPreferences(fitPreferences)
      toast.error("Failed to update fit preference")
    }
  }

  const handleBudgetChange = async (budget: BudgetRange) => {
    setBudgetRange(budget)

    try {
      await styleProfileApi.updateByUserId({
        budgetRange: budget,
      })
      toast.success("Budget preference updated")
    } catch (error) {
      console.error("Failed to update budget:", error)
      setBudgetRange(budgetRange)
      toast.error("Failed to update budget preference")
    }
  }

  const handleMaxPriceChange = async () => {
    const newPrice = maxPrice ? parseInt(maxPrice, 10) : undefined
    const currentPrice = styleProfile.maxPricePerItem
    
    // Only save if value actually changed
    if (newPrice === currentPrice) return
    
    if (maxPrice && isNaN(newPrice!)) {
      toast.error("Please enter a valid number")
      return
    }

    try {
      await styleProfileApi.updateByUserId({
        maxPricePerItem: newPrice,
      })
      toast.success("Max price updated")
      onProfileUpdate?.()
    } catch (error) {
      console.error("Failed to update max price:", error)
      toast.error("Failed to update max price")
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
    <section className="space-y-6">
      <h3 className="font-serif text-2xl font-bold">Fit & Budget Preferences</h3>
      
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Fit Preferences */}
        <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-serif text-xl">Fit Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {(['top', 'bottom', 'outerwear'] as const).map((category) => (
              <div key={category} className="space-y-2">
                <Label className="text-sm font-medium capitalize">{category}</Label>
                <div className="flex flex-wrap gap-2">
                  {FIT_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      variant={fitPreferences[category] === option.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleFitChange(category, option.value)}
                      className={fitPreferences[category] === option.value 
                        ? "bg-primary text-primary-foreground" 
                        : ""}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Budget Preferences */}
        <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-serif text-xl">Budget Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Budget Range</Label>
              <div className="grid grid-cols-2 gap-2">
                {BUDGET_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={budgetRange === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleBudgetChange(option.value)}
                    className={`flex flex-col h-auto py-3 ${
                      budgetRange === option.value 
                        ? "bg-primary text-primary-foreground" 
                        : ""
                    }`}
                  >
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs opacity-70">{option.description}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Max Price Per Item (€)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="e.g., 200"
                    className="pl-9"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    onBlur={handleMaxPriceChange}
                    onKeyDown={(e) => e.key === "Enter" && handleMaxPriceChange()}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty for no limit. AesthetIQ will filter recommendations accordingly.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Style Sliders */}
        <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-serif text-xl">Style Preferences</CardTitle>
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
      </div>
    </section>
  )
}
