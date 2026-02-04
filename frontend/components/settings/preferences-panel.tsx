"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Sparkles, Palette, Loader2 } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useSettings } from "@/contexts/settings-context"
import { Currency, ShoppingRegion, Units } from "@/types/api"

export function PreferencesPanel() {
  const { settings, isLoading, updateSettings } = useSettings()
  const [decayDays, setDecayDays] = useState<number>(7)

  useEffect(() => {
    if (typeof settings?.feedbackDecayDays === "number") {
      setDecayDays(settings.feedbackDecayDays)
    }
  }, [settings?.feedbackDecayDays])

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl flex items-center justify-center p-8">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading preferences...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6 lg:p-10">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-playfair text-3xl font-medium tracking-tight text-foreground">Preferences</h1>
        <p className="text-muted-foreground">Customize your app appearance and regional settings.</p>
      </div>

      {/* Theme Settings */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="font-playfair text-2xl font-medium">Appearance</h2>
          <p className="text-sm text-muted-foreground">Customize how the app looks and feels.</p>
        </div>

        <div className="flex items-center justify-between space-x-4 rounded-lg border border-border bg-card/50 p-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="mt-0.5 rounded-full bg-primary/10 p-1.5 sm:p-2 flex-shrink-0">
              <Palette className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <Label className="text-sm sm:text-base cursor-pointer">Theme</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Switch between light and dark mode.
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </section>

      <Separator />

      {/* Regional Settings */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="font-playfair text-2xl font-medium">Regional Settings</h2>
          <p className="text-sm text-muted-foreground">Customize your regional and measurement settings.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Measurement Units</Label>
            <Select 
              value={settings?.units || Units.IMPERIAL}
              onValueChange={(value) => updateSettings({ units: value as Units })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select units" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={Units.IMPERIAL}>Imperial (in/lbs)</SelectItem>
                <SelectItem value={Units.METRIC}>Metric (cm/kg)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Shopping Region</Label>
            <Select 
              value={settings?.shoppingRegion || ShoppingRegion.USA}
              onValueChange={(value) => updateSettings({ shoppingRegion: value as ShoppingRegion })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ShoppingRegion.USA}>United States</SelectItem>
                <SelectItem value={ShoppingRegion.UK}>United Kingdom</SelectItem>
                <SelectItem value={ShoppingRegion.EU}>Europe</SelectItem>
                <SelectItem value={ShoppingRegion.APAC}>Asia Pacific</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <Select 
              value={settings?.currency || Currency.USD}
              onValueChange={(value) => updateSettings({ currency: value as Currency })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={Currency.USD}>USD ($)</SelectItem>
                <SelectItem value={Currency.GBP}>GBP (£)</SelectItem>
                <SelectItem value={Currency.EUR}>EUR (€)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <Separator />

      {/* Advanced Settings */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="font-playfair text-2xl font-medium">Advanced</h2>
          <p className="text-sm text-muted-foreground">Fine-tune personalization behavior.</p>
        </div>

        <div className="flex items-center justify-between space-x-4 rounded-lg border border-border bg-card/50 p-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="mt-0.5 rounded-full bg-primary/10 p-1.5 sm:p-2 flex-shrink-0">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <Label className="text-sm sm:text-base">Feedback decay (days)</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Disliked items lose influence after this many days.
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <Input
              type="number"
              min={1}
              max={30}
              value={decayDays}
              onChange={(e) => setDecayDays(parseInt(e.target.value || "0", 10))}
              onBlur={() => {
                const clamped = Math.min(Math.max(decayDays || 7, 1), 30)
                setDecayDays(clamped)
                updateSettings({ feedbackDecayDays: clamped })
              }}
              className="w-24"
            />
          </div>
        </div>
      </section>
    </div>
  )
}

