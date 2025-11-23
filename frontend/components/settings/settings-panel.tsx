"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, Sparkles, Eye, History, Share2 } from "lucide-react"

export function SettingsPanel() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6 lg:p-10">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-playfair text-3xl font-medium tracking-tight text-foreground">Account & Privacy</h1>
        <p className="text-muted-foreground">Manage your subscription, privacy settings, and global preferences.</p>
      </div>

      {/* Zone A: Membership & Status */}
      <Card className="relative overflow-hidden border-none bg-gradient-to-br from-[#2D1B36] to-[#1A1025]">
        {/* Decorative background glow */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />

        <CardContent className="relative flex flex-col justify-between gap-6 p-8 sm:flex-row sm:items-center">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-rose-300">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-medium uppercase tracking-wider">Current Plan</span>
            </div>
            <h3 className="font-playfair text-3xl text-white">AesthetIQ Pro</h3>
            <p className="text-purple-200/80">Your next billing date is Nov 24, 2025</p>
          </div>
          <Button
            variant="outline"
            className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
          >
            Manage Subscription
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Zone B: Biometric & Data Privacy */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="font-playfair text-2xl font-medium">Data & Privacy</h2>
          <p className="text-sm text-muted-foreground">Control how your biometric data and preferences are used.</p>
        </div>

        <div className="grid gap-6">
          <div className="flex items-center justify-between space-x-4 rounded-lg border border-border bg-card/50 p-4">
            <div className="flex items-start gap-4">
              <div className="mt-1 rounded-full bg-primary/10 p-2">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <Label className="text-base">Allow Facial Feature Analysis</Label>
                <p className="text-sm text-muted-foreground">
                  Enables AI to analyze your face shape and skin tone for personalized recommendations.
                </p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between space-x-4 rounded-lg border border-border bg-card/50 p-4">
            <div className="flex items-start gap-4">
              <div className="mt-1 rounded-full bg-primary/10 p-2">
                <History className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <Label className="text-base">Store Color Palette History</Label>
                <p className="text-sm text-muted-foreground">
                  Keep a record of your seasonal color analysis results over time.
                </p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between space-x-4 rounded-lg border border-border bg-card/50 p-4">
            <div className="flex items-start gap-4">
              <div className="mt-1 rounded-full bg-primary/10 p-2">
                <Share2 className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <Label className="text-base">Contribute to Trend Learning</Label>
                <p className="text-sm text-muted-foreground">
                  Anonymously share style preferences to help improve trend forecasting.
                </p>
              </div>
            </div>
            <Switch />
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-6 rounded-lg border border-red-900/30 bg-red-950/10 p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <h3 className="font-medium">Delete Biometric Data</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Permanently remove all facial scans and color analysis data. This action cannot be undone.
              </p>
            </div>
            <Button variant="ghost" className="text-red-400 hover:bg-red-950/30 hover:text-red-300">
              Delete All Data
            </Button>
          </div>
        </div>
      </section>

      <Separator />

      {/* Zone C: Global Preferences */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="font-playfair text-2xl font-medium">Global Preferences</h2>
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
