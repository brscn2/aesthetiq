"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, Sparkles, Eye, History, Share2, CheckCircle2, Circle, Loader2 } from "lucide-react"
import { useSettings } from "@/contexts/settings-context"
import { useUser } from "@/contexts/user-context"
import { Currency, ShoppingRegion, Units } from "@/types/api"

export function SettingsPanel() {
  const { user, isLoading: userLoading } = useUser()
  const { settings, isLoading: settingsLoading, updateSettings } = useSettings()

  const isLoading = userLoading || settingsLoading

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl flex items-center justify-center p-8">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading settings...</span>
        </div>
      </div>
    )
  }
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="font-playfair text-2xl sm:text-3xl font-medium tracking-tight text-foreground">Account & Privacy</h1>
        <p className="text-sm text-muted-foreground">Manage your subscription, privacy settings, and global preferences.</p>
      </div>

      {/* Zone A: Membership & Status */}
      <Card className="relative overflow-hidden border-none bg-gradient-to-br from-[#2D1B36] to-[#1A1025]">
        {/* Decorative background glow */}
        <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl" />

        <CardContent className="relative flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center sm:p-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-rose-300">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Current Plan</span>
            </div>
            <h3 className="font-playfair text-xl sm:text-2xl text-white">
              AesthetIQ {user?.subscriptionStatus === 'PRO' ? 'Pro' : 'Free'}
            </h3>
            <p className="text-xs sm:text-sm text-purple-200/80">
              {user?.subscriptionStatus === 'PRO' ? 'Next billing: Nov 24, 2025' : 'Upgrade to unlock premium features'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white w-full sm:w-auto"
          >
            Manage Subscription
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Zone B: Biometric & Data Privacy */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-playfair text-xl sm:text-2xl font-medium">Data & Privacy</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Control how your biometric data and preferences are used.</p>
        </div>

        <div className="grid gap-4">
          <div 
            className="flex items-center justify-between space-x-3 rounded-lg border border-border bg-card/50 p-3 sm:p-4 cursor-pointer hover:bg-card/70 transition-colors"
            onClick={() => updateSettings({ allowFacialAnalysis: !settings?.allowFacialAnalysis })}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5 rounded-full bg-primary/10 p-1.5 sm:p-2 flex-shrink-0">
                <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <Label className="text-sm sm:text-base cursor-pointer">Allow Facial Feature Analysis</Label>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Enables AI to analyze your face shape and skin tone for personalized recommendations.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">
              {settings?.allowFacialAnalysis ? (
                <CheckCircle2 className="h-6 w-6 text-primary" />
              ) : (
                <Circle className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
          </div>

          <div 
            className="flex items-center justify-between space-x-3 rounded-lg border border-border bg-card/50 p-3 sm:p-4 cursor-pointer hover:bg-card/70 transition-colors"
            onClick={() => updateSettings({ storeColorHistory: !settings?.storeColorHistory })}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5 rounded-full bg-primary/10 p-1.5 sm:p-2 flex-shrink-0">
                <History className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <Label className="text-sm sm:text-base cursor-pointer">Store Color Palette History</Label>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Keep a record of your seasonal color analysis results over time.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">
              {settings?.storeColorHistory ? (
                <CheckCircle2 className="h-6 w-6 text-primary" />
              ) : (
                <Circle className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
          </div>

          <div 
            className="flex items-center justify-between space-x-3 rounded-lg border border-border bg-card/50 p-3 sm:p-4 cursor-pointer hover:bg-card/70 transition-colors"
            onClick={() => updateSettings({ contributeToTrendLearning: !settings?.contributeToTrendLearning })}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5 rounded-full bg-primary/10 p-1.5 sm:p-2 flex-shrink-0">
                <Share2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <Label className="text-sm sm:text-base cursor-pointer">Contribute to Trend Learning</Label>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Anonymously share style preferences to help improve trend forecasting.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">
              {settings?.contributeToTrendLearning ? (
                <CheckCircle2 className="h-6 w-6 text-primary" />
              ) : (
                <Circle className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-4 rounded-lg border border-red-900/30 bg-red-950/10 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <h3 className="text-sm sm:text-base font-medium">Delete Biometric Data</h3>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Permanently remove all facial scans and color analysis data. This action cannot be undone.
              </p>
            </div>
            <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-950/30 hover:text-red-300 w-full sm:w-auto">
              Delete All Data
            </Button>
          </div>
        </div>
      </section>

      <Separator />

      {/* Zone C: Global Preferences */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-playfair text-xl sm:text-2xl font-medium">Global Preferences</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Customize your regional and measurement settings.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
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
    </div>
  )
}
