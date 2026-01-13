"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface PersonaAnalysisLoaderProps {
  status?: 'pending' | 'processing' | 'completed' | 'failed'
  className?: string
}

const analysisStages = [
  { label: "Examining your wardrobe", duration: 3000 },
  { label: "Identifying color patterns", duration: 3000 },
  { label: "Analyzing silhouettes", duration: 3000 },
  { label: "Mapping style preferences", duration: 3000 },
  { label: "Crafting your persona", duration: 4000 },
]

export function PersonaAnalysisLoader({ status = 'processing', className }: PersonaAnalysisLoaderProps) {
  const [currentStage, setCurrentStage] = useState(0)
  const [progress, setProgress] = useState(0)

  // Cycle through analysis stages
  useEffect(() => {
    if (status !== 'processing' && status !== 'pending') return

    const stageInterval = setInterval(() => {
      setCurrentStage(prev => (prev + 1) % analysisStages.length)
    }, analysisStages[currentStage].duration)

    return () => clearInterval(stageInterval)
  }, [currentStage, status])

  // Animate progress bar
  useEffect(() => {
    if (status !== 'processing' && status !== 'pending') return

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        // Slow down as we approach 90% (never complete until actually done)
        const remaining = 90 - prev
        const increment = Math.max(0.5, remaining * 0.02)
        return Math.min(90, prev + increment)
      })
    }, 100)

    return () => clearInterval(progressInterval)
  }, [status])

  // Complete the progress when status is completed
  useEffect(() => {
    if (status === 'completed') {
      setProgress(100)
    }
  }, [status])

  return (
    <Card className={cn(
      "overflow-hidden border-primary/10 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-xl shadow-2xl",
      className
    )}>
      <CardContent className="p-12">
        <div className="flex flex-col items-center justify-center min-h-[450px] gap-12">
          
          {/* Luxury scanning animation */}
          <div className="relative w-56 h-56 flex items-center justify-center">
            {/* Ambient background glow */}
            <div className="absolute inset-0 rounded-full bg-primary/10 blur-3xl animate-pulse" />
            
            {/* Scanning rings */}
            <div className="absolute inset-0">
              {/* Outer pulsing ring */}
              <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
              
              {/* Main outer ring with gradient */}
              <div className="absolute inset-0 rounded-full border border-transparent bg-gradient-to-r from-primary/30 via-accent/20 to-primary/30 [mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] [mask-composite:xor] p-[1px]" />
            </div>
            
            {/* Rotating scanner element */}
            <div className="absolute inset-4 animate-[spin_4s_linear_infinite]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1/2 bg-gradient-to-b from-primary via-primary/50 to-transparent rounded-full" />
            </div>
            
            {/* Middle ring */}
            <div className="absolute inset-8 rounded-full border border-primary/30 animate-[spin_12s_linear_infinite_reverse]">
              <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gradient-to-r from-primary to-accent shadow-[0_0_12px_rgba(168,85,247,0.6)]" />
              <div className="absolute top-1/2 -left-0.5 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary/50" />
            </div>
            
            {/* Inner ring */}
            <div className="absolute inset-16 rounded-full border border-primary/40 animate-[spin_8s_linear_infinite]">
              <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(168,85,247,0.7)]" />
            </div>
            
            {/* Center AI core */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              {/* Pulsing core background */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 animate-pulse blur-sm" />
              
              {/* Core ring */}
              <div className="absolute inset-0 rounded-full border border-primary/50" />
              
              {/* Inner core */}
              <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-primary via-primary/80 to-accent flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                <Sparkles className="w-5 h-5 text-primary-foreground animate-pulse" />
              </div>
            </div>
            
            {/* Floating data particles */}
            <div className="absolute top-6 right-6 w-1 h-1 rounded-full bg-primary/60 animate-[float_3s_ease-in-out_infinite]" />
            <div className="absolute bottom-10 left-6 w-1.5 h-1.5 rounded-full bg-accent/50 animate-[float_4s_ease-in-out_infinite_0.5s]" />
            <div className="absolute top-16 left-4 w-0.5 h-0.5 rounded-full bg-primary/40 animate-[float_5s_ease-in-out_infinite_1s]" />
            <div className="absolute bottom-6 right-10 w-0.5 h-0.5 rounded-full bg-primary/30 animate-[float_4.5s_ease-in-out_infinite_0.3s]" />
          </div>

          {/* Status text and progress */}
          <div className="flex flex-col items-center gap-6 w-full max-w-sm">
            {/* Status badge */}
            <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 backdrop-blur-sm px-5 py-2 text-sm font-medium tracking-wide text-primary shadow-[0_0_20px_rgba(168,85,247,0.15)]">
              <span className="relative flex h-2 w-2 mr-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              AI Analysis in Progress
            </div>

            {/* Current stage text */}
            <div className="text-center space-y-2">
              <p className="text-lg font-medium text-foreground/90 tracking-wide animate-pulse">
                {analysisStages[currentStage].label}
              </p>
              <p className="text-sm text-muted-foreground/70">
                Curating your unique style identity
              </p>
            </div>

            {/* Elegant progress bar */}
            <div className="w-full space-y-2">
              <div className="h-1 w-full bg-primary/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary via-accent to-primary rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground/50 text-center tracking-widest uppercase">
                {Math.round(progress)}% Complete
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
