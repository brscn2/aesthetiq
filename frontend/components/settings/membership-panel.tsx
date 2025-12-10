"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Crown, 
  Sparkles, 
  Check, 
  Zap, 
  Palette, 
  Camera, 
  ShoppingBag, 
  TrendingUp,
  Loader2
} from "lucide-react"
import { useUser } from "@/contexts/user-context"

const freeFeatures = [
  "Basic wardrobe management",
  "Color analysis (limited)",
  "5 outfit recommendations per month",
  "Standard support"
]

const proFeatures = [
  "Unlimited wardrobe items",
  "Advanced AI color analysis",
  "Unlimited outfit recommendations",
  "Seasonal trend forecasting",
  "Priority customer support",
  "Early access to new features",
  "Personal style consultant sessions",
  "Shopping integration with 50+ brands"
]

export function MembershipPanel() {
  const { user, isLoading } = useUser()

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl flex items-center justify-center p-8">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading membership...</span>
        </div>
      </div>
    )
  }

  const isPro = user?.subscriptionStatus === 'PRO'

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6 lg:p-10">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-playfair text-3xl font-medium tracking-tight text-foreground">Membership</h1>
        <p className="text-muted-foreground">Manage your subscription and explore premium features.</p>
      </div>

      {/* Current Plan */}
      <Card className={`relative overflow-hidden border-none ${
        isPro 
          ? 'bg-gradient-to-br from-[#2D1B36] to-[#1A1025]' 
          : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900'
      }`}>
        {isPro && <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl" />}
        
        <CardContent className="relative flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {isPro ? (
                <Crown className="h-5 w-5 text-yellow-400" />
              ) : (
                <Sparkles className="h-5 w-5 text-gray-500" />
              )}
              <Badge variant={isPro ? "default" : "secondary"} className={
                isPro ? "bg-gradient-to-r from-purple-500 to-rose-500 text-white" : ""
              }>
                {isPro ? 'PRO MEMBER' : 'FREE MEMBER'}
              </Badge>
            </div>
            <h3 className={`font-playfair text-2xl ${isPro ? 'text-white' : 'text-foreground'}`}>
              AesthetIQ {isPro ? 'Pro' : 'Free'}
            </h3>
            <p className={`text-sm ${isPro ? 'text-purple-200/80' : 'text-muted-foreground'}`}>
              {isPro 
                ? 'Next billing: November 24, 2025 • $9.99/month' 
                : 'Upgrade to unlock premium AI-powered features'
              }
            </p>
          </div>
          <Button
            variant={isPro ? "outline" : "default"}
            className={isPro 
              ? "border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" 
              : "bg-gradient-to-r from-purple-500 to-rose-500 hover:from-purple-600 hover:to-rose-600"
            }
          >
            {isPro ? 'Manage Subscription' : 'Upgrade to Pro'}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Feature Comparison */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="font-playfair text-2xl font-medium">Feature Comparison</h2>
          <p className="text-sm text-muted-foreground">See what's included in each plan.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Free Plan */}
          <Card className="relative">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-playfair text-xl font-medium">Free Plan</h3>
                  <p className="text-2xl font-bold">$0<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                </div>
                
                <ul className="space-y-3">
                  {freeFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {!isPro && (
                  <Badge variant="secondary" className="w-fit">
                    Current Plan
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="relative border-purple-500/20 bg-gradient-to-br from-purple-50/50 to-rose-50/50 dark:from-purple-950/20 dark:to-rose-950/20">
            {isPro && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-purple-500 to-rose-500 text-white">
                  Current Plan
                </Badge>
              </div>
            )}
            
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    <h3 className="font-playfair text-xl font-medium">Pro Plan</h3>
                  </div>
                  <p className="text-2xl font-bold">$9.99<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                </div>
                
                <ul className="space-y-3">
                  {proFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {!isPro && (
                  <Button className="w-full bg-gradient-to-r from-purple-500 to-rose-500 hover:from-purple-600 hover:to-rose-600">
                    Upgrade to Pro
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Pro Features Highlight */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="font-playfair text-2xl font-medium">Why Go Pro?</h2>
          <p className="text-sm text-muted-foreground">Unlock the full potential of AI-powered fashion intelligence.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col items-center text-center space-y-3 p-4 rounded-lg border border-border bg-card/50">
            <div className="rounded-full bg-purple-100 dark:bg-purple-900/20 p-3">
              <Zap className="h-6 w-6 text-purple-600" />
            </div>
            <div className="space-y-1">
              <h4 className="font-medium">AI-Powered</h4>
              <p className="text-xs text-muted-foreground">Advanced algorithms for personalized recommendations</p>
            </div>
          </div>

          <div className="flex flex-col items-center text-center space-y-3 p-4 rounded-lg border border-border bg-card/50">
            <div className="rounded-full bg-rose-100 dark:bg-rose-900/20 p-3">
              <Palette className="h-6 w-6 text-rose-600" />
            </div>
            <div className="space-y-1">
              <h4 className="font-medium">Color Analysis</h4>
              <p className="text-xs text-muted-foreground">Professional-grade seasonal color analysis</p>
            </div>
          </div>

          <div className="flex flex-col items-center text-center space-y-3 p-4 rounded-lg border border-border bg-card/50">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/20 p-3">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="space-y-1">
              <h4 className="font-medium">Trend Forecasting</h4>
              <p className="text-xs text-muted-foreground">Stay ahead with seasonal trend predictions</p>
            </div>
          </div>

          <div className="flex flex-col items-center text-center space-y-3 p-4 rounded-lg border border-border bg-card/50">
            <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
              <ShoppingBag className="h-6 w-6 text-green-600" />
            </div>
            <div className="space-y-1">
              <h4 className="font-medium">Shopping Integration</h4>
              <p className="text-xs text-muted-foreground">Direct access to 50+ partner brands</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}