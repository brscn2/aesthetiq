"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ArchetypeHero } from "@/components/style-profile/archetype-hero"
import { InspirationBoard } from "@/components/style-profile/inspiration-board"
import { PreferencesPanel } from "@/components/style-profile/preferences-panel"
import { BrandSizing } from "@/components/style-profile/brand-sizing"
import { CreateStyleProfile } from "@/components/style-profile/create-style-profile"
import { PersonaAnalysisTrigger } from "@/components/style-profile/persona-analysis-trigger"
import { PersonaAnalysisLoader } from "@/components/style-profile/persona-analysis-loader"
import { useApi } from "@/lib/api"
import { StyleProfile, PersonaAnalysisStatus } from "@/types/api"

export default function StyleProfilePage() {
  const { styleProfileApi } = useApi()
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showRevealAnimation, setShowRevealAnimation] = useState(false)
  const [analysisStatus, setAnalysisStatus] = useState<PersonaAnalysisStatus | null>(null)

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

  const loadAnalysisStatus = async () => {
    try {
      const status = await styleProfileApi.getPersonaAnalysisStatus()
      setAnalysisStatus(status)

      // Show reveal animation if analysis just completed and user hasn't seen it yet
      if (status?.status === 'completed' && !showRevealAnimation) {
        // Check if user has already seen this specific analysis (using jobId)
        const seenKey = `persona-seen-${status.jobId}`
        const hasSeen = localStorage.getItem(seenKey) === 'true'

        if (!hasSeen) {
          // Check if this is a recent completion (within last 10 minutes)
          const completedAt = status.completedAt ? new Date(status.completedAt) : null
          if (completedAt) {
            const minutesSinceCompletion = (Date.now() - completedAt.getTime()) / (1000 * 60)
            if (minutesSinceCompletion < 10) {
              setShowRevealAnimation(true)
            }
          }
        }
      }
    } catch (error) {
      // Status not found is okay
      setAnalysisStatus(null)
    }
  }

  useEffect(() => {
    loadStyleProfile()
  }, [])

  useEffect(() => {
    if (styleProfile) {
      loadAnalysisStatus()
    }
  }, [styleProfile])

  // Poll for status updates while analysis is in progress
  useEffect(() => {
    if (analysisStatus?.status !== 'pending' && analysisStatus?.status !== 'processing') return

    const pollInterval = setInterval(() => {
      loadAnalysisStatus()
    }, 2500)

    return () => clearInterval(pollInterval)
  }, [analysisStatus?.status])

  const handleProfileCreated = () => {
    loadStyleProfile()
  }

  const handleAnalysisStart = () => {
    // Immediately set status to pending to show the loader
    setAnalysisStatus(prev => prev 
      ? { ...prev, status: 'pending' as const } 
      : { _id: '', userId: '', jobId: '', status: 'pending' as const, startedAt: new Date().toISOString() }
    )
    // Then reload to get the actual status
    loadAnalysisStatus()
  }

  const handleAnalysisComplete = () => {
    loadStyleProfile()
    loadAnalysisStatus()
    setShowRevealAnimation(true)
  }

  const handleRevealComplete = () => {
    setShowRevealAnimation(false)
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
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground md:text-4xl">Style Profile</h1>
              <p className="text-muted-foreground">
                Your living fashion document. AesthetIQ adapts to your evolving tastes.
              </p>
            </div>
            {styleProfile && (
              <PersonaAnalysisTrigger
                onAnalysisStart={handleAnalysisStart}
                onAnalysisComplete={handleAnalysisComplete}
                disabled={analysisStatus?.status === 'processing' || analysisStatus?.status === 'pending'}
              />
            )}
          </div>

          {/* Show loader when analysis is in progress, otherwise show archetype hero */}
          {(analysisStatus?.status === 'pending' || analysisStatus?.status === 'processing') ? (
            <PersonaAnalysisLoader status={analysisStatus.status} />
          ) : (
            <ArchetypeHero
              styleProfile={styleProfile}
              showRevealAnimation={showRevealAnimation}
              analysisJobId={analysisStatus?.jobId}
              onRevealComplete={handleRevealComplete}
            />
          )}
          <InspirationBoard styleProfile={styleProfile} onProfileUpdate={loadStyleProfile} />
          <PreferencesPanel styleProfile={styleProfile} onProfileUpdate={loadStyleProfile} />
          <BrandSizing styleProfile={styleProfile} onProfileUpdate={loadStyleProfile} />
        </div>
      </div>
    </DashboardLayout>
  )
}
