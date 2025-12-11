"use client"

import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Bell, Mail, Smartphone, Sparkles, TrendingUp, ShoppingBag, CheckCircle2, Circle } from "lucide-react"
import { useState } from "react"

interface NotificationSettings {
  emailNotifications: boolean
  pushNotifications: boolean
  styleUpdates: boolean
  trendAlerts: boolean
  shoppingDeals: boolean
  weeklyDigest: boolean
}

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: false,
    styleUpdates: true,
    trendAlerts: false,
    shoppingDeals: true,
    weeklyDigest: true,
  })

  const updateNotification = (key: keyof NotificationSettings) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6 lg:p-10">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-playfair text-3xl font-medium tracking-tight text-foreground">Notifications</h1>
        <p className="text-muted-foreground">Manage how and when you receive updates from AesthetIQ.</p>
      </div>

      {/* Communication Preferences */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="font-playfair text-2xl font-medium">Communication Preferences</h2>
          <p className="text-sm text-muted-foreground">Choose how you want to receive notifications.</p>
        </div>

        <div className="grid gap-4">
          <div 
            className="flex items-center justify-between space-x-3 rounded-lg border border-border bg-card/50 p-4 cursor-pointer hover:bg-card/70 transition-colors"
            onClick={() => updateNotification('emailNotifications')}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5 rounded-full bg-primary/10 p-2 flex-shrink-0">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <Label className="text-base cursor-pointer">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive style recommendations and updates via email.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">
              {notifications.emailNotifications ? (
                <CheckCircle2 className="h-6 w-6 text-primary" />
              ) : (
                <Circle className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
          </div>

          <div 
            className="flex items-center justify-between space-x-3 rounded-lg border border-border bg-card/50 p-4 cursor-pointer hover:bg-card/70 transition-colors"
            onClick={() => updateNotification('pushNotifications')}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5 rounded-full bg-primary/10 p-2 flex-shrink-0">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <Label className="text-base cursor-pointer">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Get instant alerts on your device for important updates.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">
              {notifications.pushNotifications ? (
                <CheckCircle2 className="h-6 w-6 text-primary" />
              ) : (
                <Circle className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
      </section>

      <Separator />

      {/* Content Preferences */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="font-playfair text-2xl font-medium">Content Preferences</h2>
          <p className="text-sm text-muted-foreground">Customize what type of content you want to receive.</p>
        </div>

        <div className="grid gap-4">
          <div 
            className="flex items-center justify-between space-x-3 rounded-lg border border-border bg-card/50 p-4 cursor-pointer hover:bg-card/70 transition-colors"
            onClick={() => updateNotification('styleUpdates')}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5 rounded-full bg-primary/10 p-2 flex-shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <Label className="text-base cursor-pointer">Style Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Personalized style recommendations based on your preferences.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">
              {notifications.styleUpdates ? (
                <CheckCircle2 className="h-6 w-6 text-primary" />
              ) : (
                <Circle className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
          </div>

          <div 
            className="flex items-center justify-between space-x-3 rounded-lg border border-border bg-card/50 p-4 cursor-pointer hover:bg-card/70 transition-colors"
            onClick={() => updateNotification('trendAlerts')}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5 rounded-full bg-primary/10 p-2 flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <Label className="text-base cursor-pointer">Trend Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Be the first to know about emerging fashion trends.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">
              {notifications.trendAlerts ? (
                <CheckCircle2 className="h-6 w-6 text-primary" />
              ) : (
                <Circle className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
          </div>

          <div 
            className="flex items-center justify-between space-x-3 rounded-lg border border-border bg-card/50 p-4 cursor-pointer hover:bg-card/70 transition-colors"
            onClick={() => updateNotification('shoppingDeals')}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5 rounded-full bg-primary/10 p-2 flex-shrink-0">
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <Label className="text-base cursor-pointer">Shopping Deals</Label>
                <p className="text-sm text-muted-foreground">
                  Exclusive discounts and deals from partner brands.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">
              {notifications.shoppingDeals ? (
                <CheckCircle2 className="h-6 w-6 text-primary" />
              ) : (
                <Circle className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
          </div>

          <div 
            className="flex items-center justify-between space-x-3 rounded-lg border border-border bg-card/50 p-4 cursor-pointer hover:bg-card/70 transition-colors"
            onClick={() => updateNotification('weeklyDigest')}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5 rounded-full bg-primary/10 p-2 flex-shrink-0">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <Label className="text-base cursor-pointer">Weekly Digest</Label>
                <p className="text-sm text-muted-foreground">
                  A weekly summary of your style journey and new recommendations.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">
              {notifications.weeklyDigest ? (
                <CheckCircle2 className="h-6 w-6 text-primary" />
              ) : (
                <Circle className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}