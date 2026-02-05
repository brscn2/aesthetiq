"use client"

import React, { createContext, useContext, useMemo, useState } from "react"

export interface WardrobeRecommendationPayload {
  title: string
  reason: string
  category?: string
}

interface WardrobeRecommendationContextType {
  recommendation: WardrobeRecommendationPayload | null
  setRecommendation: (recommendation: WardrobeRecommendationPayload) => void
  clearRecommendation: () => void
}

const WardrobeRecommendationContext = createContext<WardrobeRecommendationContextType | undefined>(undefined)

export function WardrobeRecommendationProvider({ children }: { children: React.ReactNode }) {
  const [recommendation, setRecommendationState] = useState<WardrobeRecommendationPayload | null>(null)

  const setRecommendation = (nextRecommendation: WardrobeRecommendationPayload) => {
    setRecommendationState(nextRecommendation)
  }

  const clearRecommendation = () => setRecommendationState(null)

  const value = useMemo(
    () => ({
      recommendation,
      setRecommendation,
      clearRecommendation,
    }),
    [recommendation]
  )

  return (
    <WardrobeRecommendationContext.Provider value={value}>
      {children}
    </WardrobeRecommendationContext.Provider>
  )
}

export function useWardrobeRecommendation() {
  const context = useContext(WardrobeRecommendationContext)
  if (!context) {
    throw new Error("useWardrobeRecommendation must be used within a WardrobeRecommendationProvider")
  }
  return context
}
