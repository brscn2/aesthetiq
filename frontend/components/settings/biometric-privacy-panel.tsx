"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { 
  Fingerprint, 
  Eye, 
  Shield, 
  AlertTriangle, 
  Lock, 
  Database, 
  CheckCircle2, 
  Circle,
  Loader2
} from "lucide-react"
import { useSettings } from "@/contexts/settings-context"

export function BiometricPrivacyPanel() {
  const { settings, isLoading, updateSettings } = useSettings()

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl flex items-center justify-center p-8">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading privacy settings...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6 lg:p-10">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-playfair text-3xl font-medium tracking-tight text-foreground">Biometric Privacy</h1>
        <p className="text-muted-foreground">Control how your biometric data is collected, stored, and used.</p>
      </div>

      {/* Privacy Overview */}
      <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-3">
              <Shield className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-emerald-900 dark:text-emerald-100">Your Privacy is Protected</h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-200">
                All biometric data is processed locally on your device when possible. 
                Data that must be stored is encrypted and never shared with third parties.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Biometric Data Collection */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="font-playfair text-2xl font-medium">Data Collection Settings</h2>
          <p className="text-sm text-muted-foreground">Choose what biometric data you're comfortable sharing.</p>
        </div>

        <div className="grid gap-4">
          <div 
            className="flex items-center justify-between space-x-3 rounded-lg border border-border bg-card/50 p-4 cursor-pointer hover:bg-card/70 transition-colors"
            onClick={() => updateSettings({ allowBiometrics: !settings?.allowBiometrics })}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5 rounded-full bg-primary/10 p-2 flex-shrink-0">
                <Fingerprint className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <Label className="text-base cursor-pointer">Allow Biometric Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Use fingerprint or face recognition for secure app access.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">
              {settings?.allowBiometrics ? (
                <CheckCircle2 className="h-6 w-6 text-primary" />
              ) : (
                <Circle className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
          </div>

          <div 
            className="flex items-center justify-between space-x-3 rounded-lg border border-border bg-card/50 p-4 cursor-pointer hover:bg-card/70 transition-colors"
            onClick={() => updateSettings({ allowFacialAnalysis: !settings?.allowFacialAnalysis })}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5 rounded-full bg-primary/10 p-2 flex-shrink-0">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <Label className="text-base cursor-pointer">Facial Feature Analysis</Label>
                <p className="text-sm text-muted-foreground">
                  Allow AI to analyze facial features for personalized color and style recommendations.
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
        </div>
      </section>

      <Separator />

      {/* Data Storage & Usage */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="font-playfair text-2xl font-medium">Data Storage & Usage</h2>
          <p className="text-sm text-muted-foreground">Control how your data is stored and used for improvements.</p>
        </div>

        <div className="grid gap-4">
          <div 
            className="flex items-center justify-between space-x-3 rounded-lg border border-border bg-card/50 p-4 cursor-pointer hover:bg-card/70 transition-colors"
            onClick={() => updateSettings({ storeColorHistory: !settings?.storeColorHistory })}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5 rounded-full bg-primary/10 p-2 flex-shrink-0">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <Label className="text-base cursor-pointer">Store Color Analysis History</Label>
                <p className="text-sm text-muted-foreground">
                  Keep a record of your color analysis results to track changes over time.
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
            className="flex items-center justify-between space-x-3 rounded-lg border border-border bg-card/50 p-4 cursor-pointer hover:bg-card/70 transition-colors"
            onClick={() => updateSettings({ contributeToTrendLearning: !settings?.contributeToTrendLearning })}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5 rounded-full bg-primary/10 p-2 flex-shrink-0">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <Label className="text-base cursor-pointer">Contribute to AI Learning</Label>
                <p className="text-sm text-muted-foreground">
                  Anonymously contribute your style preferences to improve AI recommendations for everyone.
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
      </section>

      <Separator />

      {/* Data Rights */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="font-playfair text-2xl font-medium">Your Data Rights</h2>
          <p className="text-sm text-muted-foreground">Exercise your rights regarding your biometric data.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  <h4 className="font-medium">Download Your Data</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Request a copy of all biometric data we have stored about you.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  Request Data Export
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h4 className="font-medium">Delete All Data</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Permanently remove all biometric data from our systems.
                </p>
                <Button variant="outline" size="sm" className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20">
                  Delete All Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Legal Information */}
      <Card className="border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20">
        <CardContent className="p-6">
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Shield className="h-5 w-5 text-gray-600" />
              Legal Compliance
            </h4>
            <p className="text-sm text-muted-foreground">
              Our biometric data practices comply with GDPR, CCPA, and other applicable privacy laws. 
              We use industry-standard encryption and never sell your personal data to third parties.
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-xs">
                Privacy Policy
              </Button>
              <Button variant="ghost" size="sm" className="text-xs">
                Terms of Service
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}