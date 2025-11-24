"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { ArchetypeHero } from "@/components/style-profile/archetype-hero"
import { InspirationBoard } from "@/components/style-profile/inspiration-board"
import { PreferencesPanel } from "@/components/style-profile/preferences-panel"
import { BrandSizing } from "@/components/style-profile/brand-sizing"

export default function StyleProfilePage() {
  return (
    <DashboardLayout>
      <div className="flex h-full flex-col overflow-y-auto bg-background">
        <div className="mx-auto w-full max-w-5xl space-y-8 sm:space-y-12 p-4 sm:p-6 pb-6 sm:pb-8">
          <div className="space-y-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground md:text-4xl">Style Profile</h1>
            <p className="text-muted-foreground">
              Your living fashion document. AesthetIQ adapts to your evolving tastes.
            </p>
          </div>

          <ArchetypeHero />
          <InspirationBoard />
          <PreferencesPanel />
          <BrandSizing />
        </div>
      </div>
    </DashboardLayout>
  )
}
