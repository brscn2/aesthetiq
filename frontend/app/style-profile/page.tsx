"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ArchetypeHero } from "@/components/style-profile/archetype-hero"
import { InspirationBoard } from "@/components/style-profile/inspiration-board"
import { PreferencesPanel } from "@/components/style-profile/preferences-panel"
import { BrandSizing } from "@/components/style-profile/brand-sizing"
import { CreateStyleProfile } from "@/components/style-profile/create-style-profile"
import { useApi } from "@/lib/api"
import { StyleProfile } from "@/types/api"

export default function StyleProfilePage() {
  const { styleProfileApi } = useApi()
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadStyleProfile = async () => {
    setIsLoading(true)
    try {
      const profile = await styleProfileApi.getByUserId()
      setStyleProfile(profile)
    } catch (error) {
      console.error("Failed to load style profile:", error)
      setStyleProfile(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStyleProfile()
  }, [])

  const handleProfileCreated = () => {
    loadStyleProfile()
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (!styleProfile) {
    return (
      <DashboardLayout>
        <div className="flex h-full flex-col overflow-y-auto bg-background">
          <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 pb-6 sm:pb-8">
            <div className="space-y-2 mb-8">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground md:text-4xl">Style Profile</h1>
              <p className="text-muted-foreground">
                Your living fashion document. AesthetIQ adapts to your evolving tastes.
              </p>
            </div>
            <CreateStyleProfile onCreated={handleProfileCreated} />
          </div>
        </div>
      </DashboardLayout>
    )
  }

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

          <ArchetypeHero styleProfile={styleProfile} />
          <InspirationBoard styleProfile={styleProfile} onProfileUpdate={loadStyleProfile} />
          <PreferencesPanel styleProfile={styleProfile} onProfileUpdate={loadStyleProfile} />
          <BrandSizing styleProfile={styleProfile} onProfileUpdate={loadStyleProfile} />
        </div>
      </div>
    </DashboardLayout>
  )
}
