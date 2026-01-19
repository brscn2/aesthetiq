"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Sparkles } from "lucide-react"
import { useApi } from "@/lib/api"
import { PersonaAnalysisStatus } from "@/types/api"
import { toast } from "sonner"

interface PersonaAnalysisTriggerProps {
  onAnalysisComplete?: () => void
  onAnalysisStart?: () => void
  disabled?: boolean
}

export function PersonaAnalysisTrigger({ onAnalysisComplete, onAnalysisStart, disabled }: PersonaAnalysisTriggerProps) {
  const { styleProfileApi } = useApi()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [status, setStatus] = useState<PersonaAnalysisStatus | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)

  // Poll for status updates
  const pollStatus = useCallback(async (currentJobId: string) => {
    try {
      const currentStatus = await styleProfileApi.getPersonaAnalysisStatus()
      if (currentStatus && currentStatus.jobId === currentJobId) {
        setStatus(currentStatus)

        if (currentStatus.status === 'completed') {
          setIsAnalyzing(false)
          toast.success("Your style persona is ready!")
          onAnalysisComplete?.()
          return false // Stop polling
        } else if (currentStatus.status === 'failed') {
          setIsAnalyzing(false)
          toast.error(`Analysis failed: ${currentStatus.error || 'Unknown error'}`)
          return false // Stop polling
        }
      }
      return true // Continue polling
    } catch (error) {
      console.error("Failed to poll status:", error)
      return true // Continue polling on error
    }
  }, [styleProfileApi, onAnalysisComplete])

  // Start polling when jobId is set
  useEffect(() => {
    if (!jobId || !isAnalyzing) return

    const pollInterval = setInterval(async () => {
      const shouldContinue = await pollStatus(jobId)
      if (!shouldContinue) {
        clearInterval(pollInterval)
      }
    }, 2500) // Poll every 2.5 seconds

    return () => clearInterval(pollInterval)
  }, [jobId, isAnalyzing, pollStatus])

  const handleAnalyze = async () => {
    if (isAnalyzing || disabled) return

    setIsAnalyzing(true)
    setStatus(null)

    try {
      const result = await styleProfileApi.analyzePersona()
      setJobId(result.jobId)
      onAnalysisStart?.()
      toast.info("Your persona is being prepared...")
    } catch (error: any) {
      setIsAnalyzing(false)
      console.error("Failed to start analysis:", error)
      toast.error(`Failed to start analysis: ${error.message || 'Unknown error'}`)
    }
  }

  const getStatusMessage = () => {
    if (!isAnalyzing) return null

    if (status?.status === 'pending') {
      return "Queuing analysis..."
    } else if (status?.status === 'processing') {
      return "Analyzing your style..."
    } else {
      return "Your persona is being prepared..."
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleAnalyze}
        disabled={isAnalyzing || disabled}
        className="w-full sm:w-auto"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Analyze My Style Persona
          </>
        )}
      </Button>
      {getStatusMessage() && (
        <p className="text-sm text-muted-foreground">{getStatusMessage()}</p>
      )}
    </div>
  )
}
