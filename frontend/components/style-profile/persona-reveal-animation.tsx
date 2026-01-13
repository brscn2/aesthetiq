"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Sparkles } from "lucide-react"
import { StyleProfile } from "@/types/api"
import { cn } from "@/lib/utils"

interface PersonaRevealAnimationProps {
  styleProfile: StyleProfile
  jobId?: string
  onReveal?: () => void
}

export function PersonaRevealAnimation({ styleProfile, jobId, onReveal }: PersonaRevealAnimationProps) {
  const [isRevealed, setIsRevealed] = useState(false)
  const [showAnimation, setShowAnimation] = useState(true)

  const handleReveal = () => {
    setIsRevealed(true)
    // Mark as seen in localStorage using jobId if available, otherwise use profile ID
    if (jobId) {
      const seenKey = `persona-seen-${jobId}`
      localStorage.setItem(seenKey, 'true')
    }

    setTimeout(() => {
      setShowAnimation(false)
      onReveal?.()
    }, 1500) // Give time for reveal animation
  }

  const archetypeDescription: Record<string, string> = {
    "Urban Minimalist": "You prefer clean lines, monochromatic tones, and functional fabrics. Your aesthetic prioritizes silhouette over pattern, favoring architectural shapes that bridge the gap between office sophistication and street-style edge.",
    "Classic Elegance": "You value timeless pieces and refined sophistication. Your style is built on quality basics and elegant silhouettes that never go out of fashion.",
    "Bold Innovator": "You're not afraid to experiment with color, pattern, and shape. Your wardrobe reflects your creative spirit and willingness to push boundaries.",
    "Casual Comfort": "Comfort and ease are your priorities. You favor relaxed fits and versatile pieces that work for any occasion.",
  }

  const description = archetypeDescription[styleProfile.archetype] ||
    "Your unique style profile is being developed based on your preferences and wardrobe."

  if (!showAnimation && isRevealed) {
    return null // Animation complete, let parent handle display
  }

  return (
    <div
      className={cn(
        "relative cursor-pointer transition-all duration-1000",
        isRevealed && "opacity-0 scale-95 pointer-events-none"
      )}
      onClick={!isRevealed ? handleReveal : undefined}
    >
      <Card className="overflow-hidden border-primary/10 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-xl shadow-2xl">
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center min-h-[450px]">
            {/* Luxury Orbital Animation - Only show when not revealed */}
            {!isRevealed && (
              <div className="flex flex-col items-center gap-12">
                {/* Orbital rings container */}
                <div className="relative w-48 h-48 flex items-center justify-center">
                  {/* Ambient glow */}
                  <div className="absolute inset-0 rounded-full bg-primary/5 blur-3xl animate-pulse" />

                  {/* Outer ring */}
                  <div className="absolute inset-0 rounded-full border border-primary/20 animate-[spin_20s_linear_infinite]">
                    {/* Orbiting particles on outer ring */}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gradient-to-r from-primary to-primary/60 shadow-[0_0_12px_rgba(168,85,247,0.6)]" />
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary/40" />
                  </div>

                  {/* Middle ring */}
                  <div className="absolute inset-6 rounded-full border border-primary/30 animate-[spin_15s_linear_infinite_reverse]">
                    <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-primary/80 to-accent shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                    <div className="absolute top-1/2 -right-0.5 -translate-y-1/2 w-1 h-1 rounded-full bg-primary/30" />
                  </div>

                  {/* Inner ring */}
                  <div className="absolute inset-12 rounded-full border border-primary/40 animate-[spin_10s_linear_infinite]">
                    <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary shadow-[0_0_6px_rgba(168,85,247,0.7)]" />
                  </div>

                  {/* Center diamond */}
                  <div className="relative w-6 h-6 animate-pulse">
                    <div className="absolute inset-0 rotate-45 bg-gradient-to-br from-primary via-primary/80 to-accent rounded-sm shadow-[0_0_20px_rgba(168,85,247,0.4)]" />
                    <div className="absolute inset-1 rotate-45 bg-card rounded-sm" />
                    <div className="absolute inset-2 rotate-45 bg-gradient-to-br from-primary/60 to-accent/60 rounded-sm" />
                  </div>

                  {/* Floating accent particles */}
                  <div className="absolute top-4 right-8 w-1 h-1 rounded-full bg-primary/50 animate-[float_4s_ease-in-out_infinite]" />
                  <div className="absolute bottom-8 left-4 w-0.5 h-0.5 rounded-full bg-accent/50 animate-[float_5s_ease-in-out_infinite_0.5s]" />
                  <div className="absolute top-12 left-2 w-0.5 h-0.5 rounded-full bg-primary/30 animate-[float_6s_ease-in-out_infinite_1s]" />
                </div>

                {/* Text content - completely separate from animation */}
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 backdrop-blur-sm px-5 py-2 text-sm font-medium tracking-wide text-primary shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                    <Sparkles className="mr-2.5 h-4 w-4" />
                    Your Style DNA is Ready
                  </div>
                  <p className="text-sm text-muted-foreground/80 tracking-wide">
                    Click anywhere to reveal your persona
                  </p>
                </div>
              </div>
            )}

            {/* Revealed content - Only show after click */}
            {isRevealed && (
              <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 w-full">
                <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 backdrop-blur-sm px-4 py-1.5 text-sm font-medium tracking-wide text-primary">
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                  AI Analysis
                </div>
                <h2 className="font-serif text-4xl font-bold leading-tight md:text-5xl tracking-tight">
                  Your Style Persona: <br />
                  <span className="text-gradient-ai">{styleProfile.archetype}</span>
                </h2>
                <p className="text-lg leading-relaxed text-muted-foreground max-w-2xl mx-auto">
                  {description}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
