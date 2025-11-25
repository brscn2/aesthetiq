"use client"

import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Sparkles, Palette } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function PreferencesPanel() {
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
            <Select defaultValue="imperial">
              <SelectTrigger>
                <SelectValue placeholder="Select units" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="imperial">Imperial (in/lbs)</SelectItem>
                <SelectItem value="metric">Metric (cm/kg)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Shopping Region</Label>
            <Select defaultValue="usa">
              <SelectTrigger>
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="usa">United States</SelectItem>
                <SelectItem value="uk">United Kingdom</SelectItem>
                <SelectItem value="eu">Europe</SelectItem>
                <SelectItem value="apac">Asia Pacific</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <Select defaultValue="usd">
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="usd">USD ($)</SelectItem>
                <SelectItem value="gbp">GBP (£)</SelectItem>
                <SelectItem value="eur">EUR (€)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>
    </div>
  )
}

