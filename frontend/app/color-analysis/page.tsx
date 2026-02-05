"use client"

import { useState, useRef, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Upload, Camera, X, Sparkles, ScanLine, AlertCircle, History, Calendar, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { useApi } from "@/lib/api"
import { ColorAnalysis } from "@/types/api"
import { toast } from "sonner"
import { getJewelryTips } from "../../lib/get-jewelry-tips"
import { getMakeupColors } from "@/lib/get-makeup-colors"

export default function ColorAnalysisPage() {
  const [analysisState, setAnalysisState] = useState<"upload" | "processing" | "complete" | "viewing">("upload")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [analysisResult, setAnalysisResult] = useState<ColorAnalysis | null>(null)
  const [pastAnalyses, setPastAnalyses] = useState<ColorAnalysis[]>([])
  const [isLoadingPastAnalyses, setIsLoadingPastAnalyses] = useState(false)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { analysisApi } = useApi()

  // Load latest analysis and past analyses on mount
  useEffect(() => {
    loadPastAnalyses()
    loadLatestAnalysis()
  }, [])

  const loadLatestAnalysis = async () => {
    try {
      const latest = await analysisApi.getLatest()
      if (latest) {
        setAnalysisResult(latest)
        setAnalysisState("viewing")
      }
    } catch (err: any) {
      // No analysis found is okay, user can upload one
      if (err.response?.status !== 404) {
        console.error("Failed to load latest analysis:", err)
      }
    }
  }

  const loadPastAnalyses = async () => {
    setIsLoadingPastAnalyses(true)
    try {
      const analyses = await analysisApi.getAllByUserId()
      setPastAnalyses(analyses)
    } catch (err: any) {
      console.error("Failed to load past analyses:", err)
      if (err.response?.status !== 404) {
        toast.error("Failed to load past analyses")
      }
    } finally {
      setIsLoadingPastAnalyses(false)
    }
  }

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file)
    setUploadedImageUrl(previewUrl)

    // Start analysis
    setAnalysisState("processing")
    setUploadProgress(0)
    setError(null)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      const result = await analysisApi.analyzeImage(file)

      clearInterval(progressInterval)
      setUploadProgress(100)
      setAnalysisResult(result)
      setAnalysisState("complete")
      toast.success("Analysis complete!")
      // Reload past analyses to include the new one
      loadPastAnalyses()
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to analyze image"

      // Check for validation error
      if (errorMessage.includes("Invalid Item")) {
        setError(errorMessage)
        toast.error("Invalid Image Detected", {
          description: "Please upload a photo of clothing, fashion accessories, or a person."
        })
      } else {
        setError(errorMessage)
        toast.error("Analysis failed. Please try again.")
      }

      setAnalysisState("upload")
      setUploadedImageUrl(null)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const resetAnalysis = () => {
    setAnalysisState("upload")
    setAnalysisResult(null)
    setUploadedImageUrl(null)
    setError(null)
    setUploadProgress(0)
    if (uploadedImageUrl) {
      URL.revokeObjectURL(uploadedImageUrl)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const selectAnalysis = (analysis: ColorAnalysis) => {
    setAnalysisResult(analysis)
    setAnalysisState("viewing")
    // Use the saved image URL from the analysis if available
    // Otherwise clear the uploaded image URL
    if (analysis.imageUrl) {
      setUploadedImageUrl(analysis.imageUrl)
    } else {
      setUploadedImageUrl(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="flex h-full flex-col overflow-y-auto bg-background p-6">
        <div className="mx-auto w-full max-w-5xl space-y-8 pb-10">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl">Color Analysis</h1>
            <p className="text-muted-foreground">
              Discover your perfect palette through AI-powered facial feature extraction.
            </p>
          </div>

          {/* Main Content Area */}
          <div className="min-h-[600px] w-full">
            {analysisState === "upload" && (
              <div className="space-y-6">
                <SmartUploader
                  onFileSelect={handleFileSelect}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  fileInputRef={fileInputRef}
                  onFileInputChange={handleFileInputChange}
                  error={error}
                />
                {pastAnalyses.length > 0 && (
                  <PastAnalysesList
                    analyses={pastAnalyses}
                    onSelectAnalysis={selectAnalysis}
                    onDeleteAnalysis={async (id: string) => {
                      try {
                        await analysisApi.delete(id)
                        toast.success("Analysis deleted successfully")
                        await loadPastAnalyses()
                        // If the deleted analysis was being viewed, reset to upload state
                        if (analysisResult?._id === id) {
                          setAnalysisResult(null)
                          setAnalysisState("upload")
                        }
                      } catch (err: any) {
                        toast.error(err.response?.data?.message || "Failed to delete analysis")
                      }
                    }}
                    isLoading={isLoadingPastAnalyses}
                  />
                )}
              </div>
            )}

            {analysisState === "processing" && (
              <ProcessingView progress={uploadProgress} imageUrl={uploadedImageUrl} />
            )}

            {(analysisState === "complete" || analysisState === "viewing") && analysisResult && (
              <AnalysisReport
                analysis={analysisResult}
                imageUrl={uploadedImageUrl || analysisResult.imageUrl || null}
                onReset={resetAnalysis}
                pastAnalyses={pastAnalyses}
                onSelectAnalysis={selectAnalysis}
                isViewingPast={analysisState === "viewing"}
                onViewAll={() => {
                  setAnalysisState("upload")
                  setAnalysisResult(null)
                }}
              />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

function SmartUploader({
  onFileSelect,
  onDrop,
  onDragOver,
  fileInputRef,
  onFileInputChange,
  error,
}: {
  onFileSelect: (file: File) => void
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error: string | null
}) {
  const [isDragging, setIsDragging] = useState(false)

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500">
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      <div
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-300 ease-in-out",
          isDragging ? "border-primary bg-primary/5" : "border-border bg-card/50 hover:bg-card/80",
          "h-[500px] w-full",
        )}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
          onDragOver(e)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          onDrop(e)
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onFileInputChange}
          className="hidden"
        />
        <div className="flex flex-col items-center space-y-4 sm:space-y-6 text-center p-4 sm:p-8">
          <div className="rounded-full bg-primary/10 p-4 sm:p-6 shadow-xl shadow-primary/5">
            <Camera className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
          </div>

          <div className="space-y-2">
            <h3 className="font-serif text-xl sm:text-2xl font-semibold">Upload your photo</h3>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xs mx-auto px-4">
              Drag and drop your image here, or click to browse files.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl mt-8">
            <InstructionCard icon={Sparkles} text="Natural Lighting" />
            <InstructionCard icon={X} text="No Makeup" />
            <InstructionCard icon={ScanLine} text="Neutral Background" />
          </div>

          <Button
            size="lg"
            className="mt-8 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-8 h-12 rounded-full shadow-lg hover:shadow-primary/20 transition-all"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Select Image
          </Button>
        </div>
      </div>
    </div>
  )
}

function InstructionCard({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-background/50 border border-border/50 backdrop-blur-sm">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <span className="text-sm font-medium">{text}</span>
    </div>
  )
}

function ProcessingView({ progress, imageUrl }: { progress: number; imageUrl: string | null }) {
  return (
    <div className="flex h-[500px] flex-col items-center justify-center space-y-8 animate-in fade-in duration-500">
      <div className="relative h-64 w-64 overflow-hidden rounded-full border-4 border-muted shadow-2xl">
        {imageUrl ? (
          <img src={imageUrl} alt="Processing" className="h-full w-full object-cover opacity-50 grayscale" />
        ) : (
          <Image src="/placeholder-user.jpg" alt="Processing" fill className="object-cover opacity-50 grayscale" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent animate-scan" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <ScanLine className="h-16 w-16 text-primary animate-pulse" />
        </div>
      </div>

      <div className="w-full max-w-md space-y-4 text-center">
        <h3 className="font-serif text-xl font-medium animate-pulse">Analyzing Facial Features...</h3>
        <Progress value={progress} className="h-2 w-full" />
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>Mapping Skin Tone</span>
          <span>Measuring Contrast</span>
          <span>Determining Season</span>
        </div>
      </div>
    </div>
  )
}

function PastAnalysesList({
  analyses,
  onSelectAnalysis,
  onDeleteAnalysis,
  isLoading,
}: {
  analyses: ColorAnalysis[]
  onSelectAnalysis: (analysis: ColorAnalysis) => void
  onDeleteAnalysis: (id: string) => void
  isLoading: boolean
}) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const handleDelete = (e: React.MouseEvent, analysisId: string) => {
    e.stopPropagation() // Prevent triggering the card click
    if (confirm("Are you sure you want to delete this analysis? This action cannot be undone.")) {
      onDeleteAnalysis(analysisId)
    }
  }

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading past analyses...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-serif text-xl font-bold">Past Analyses</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {analyses.map((analysis) => (
            <div
              key={analysis._id}
              className="relative group rounded-lg border border-border/50 bg-background/50 hover:bg-background/80 hover:border-primary/50 transition-all overflow-hidden"
            >
              <button
                onClick={() => onSelectAnalysis(analysis)}
                className="w-full text-left p-4"
              >
                {/* Photo Preview */}
                {analysis.imageUrl ? (
                  <div className="relative w-full aspect-[3/4] mb-3 rounded-lg overflow-hidden border border-border/30">
                    <img
                      src={analysis.imageUrl}
                      alt={`${analysis.season} analysis`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Hide image if it fails to load, show placeholder instead
                        e.currentTarget.style.display = "none"
                        const placeholder = e.currentTarget.nextElementSibling as HTMLElement
                        if (placeholder) placeholder.style.display = "flex"
                      }}
                    />
                    <div className="hidden absolute inset-0 bg-muted/50 items-center justify-center">
                      <Camera className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full aspect-[3/4] mb-3 rounded-lg overflow-hidden border border-border/30 bg-muted/50 flex items-center justify-center">
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}

                <div className="flex items-start justify-between mb-2">
                  <Badge variant="outline" className="text-xs">
                    {analysis.season}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{analysis.season}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(analysis.scanDate)}
                  </p>
                  <div className="flex gap-1 mt-2">
                    {analysis.palette?.slice(0, 5).map((color, idx) => (
                      <div
                        key={idx}
                        className="h-6 w-6 rounded-full border border-border/50"
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </button>

              {/* Delete Button */}
              <button
                onClick={(e) => handleDelete(e, analysis._id)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive/90 hover:bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                title="Delete analysis"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function AnalysisReport({
  analysis,
  imageUrl,
  onReset,
  pastAnalyses,
  onSelectAnalysis,
  isViewingPast,
  onViewAll,
}: {
  analysis: ColorAnalysis
  imageUrl: string | null
  onReset: () => void
  pastAnalyses?: ColorAnalysis[]
  onSelectAnalysis?: (analysis: ColorAnalysis) => void
  isViewingPast?: boolean
  onViewAll?: () => void
}) {
  const contrastValue = analysis.contrastLevel === "High" ? 85 : analysis.contrastLevel === "Low" ? 30 : 55
  const undertoneValue = analysis.undertone === "Warm" ? 70 : analysis.undertone === "Cool" ? 30 : 50

  const jewelryTips = getJewelryTips(analysis.season)

  const makeupColors = getMakeupColors(
    analysis.season,
    analysis.undertone,
    analysis.contrastLevel,
  )

  const getSeasonDescription = (season: string) => {
    const descriptions: Record<string, string> = {
      "Dark Autumn": "Rich, warm, and dark. You shine in colors that mirror the turning leaves and deep earth tones.",
      "Dark Winter": "Bold, cool, and deep. Your palette features rich jewel tones and crisp contrasts.",
      "Light Spring": "Fresh, warm, and light. Your colors are bright and airy, like a spring morning.",
      "Light Summer": "Soft, cool, and light. Your palette features gentle pastels and muted tones.",
      "Muted Autumn": "Soft, warm, and earthy. Your colors are rich but subdued, like autumn mist.",
      "Muted Summer": "Soft, cool, and muted. Your palette features gentle, dusty tones.",
      "Bright Spring": "Vibrant, warm, and clear. Your colors are bold and energetic.",
      "Bright Winter": "Vivid, cool, and clear. Your palette features intense, saturated colors.",
      "Warm Autumn": "Rich, warm, and golden. Your colors echo the warmth of autumn leaves.",
      "Warm Spring": "Bright, warm, and clear. Your palette features sunny, vibrant tones.",
      "Cool Winter": "Crisp, cool, and bold. Your colors are sharp and dramatic.",
      "Cool Summer": "Soft, cool, and muted. Your palette features gentle, dusty blues and grays.",
    }
    return descriptions[season] || "Your personalized color analysis is complete."
  }

  return (
    <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-700">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {isViewingPast && (
            <Badge variant="secondary" className="gap-2">
              <History className="h-3 w-3" />
              Viewing Past Analysis
            </Badge>
          )}
          {analysis.scanDate && (
            <span className="text-sm text-muted-foreground">
              {new Date(analysis.scanDate).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {pastAnalyses && pastAnalyses.length > 0 && onViewAll && (
            <Button variant="outline" onClick={onViewAll}>
              <History className="h-4 w-4 mr-2" />
              View All Analyses
            </Button>
          )}
          <Button variant="outline" onClick={onReset}>
            Analyze Another Photo
          </Button>
        </div>
      </div>
      {/* Section 2: The Analysis Report (Core Visual) */}
      <section className="relative grid gap-8 lg:grid-cols-2 lg:items-center">
        {/* The Subject */}
        <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-2xl shadow-2xl ring-1 ring-border/50">
          {imageUrl || analysis.imageUrl ? (
            <img
              src={imageUrl || analysis.imageUrl || ""}
              alt="User Analysis"
              className="h-full w-full object-cover"
              onError={(e) => {
                // Fallback to placeholder if image fails to load
                e.currentTarget.src = "/placeholder-user.jpg"
              }}
            />
          ) : (
            <Image src="/placeholder-user.jpg" alt="User Analysis" fill className="object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
        </div>

        {/* The Verdict */}
        <div className="space-y-8 text-center lg:text-left">
          <div className="space-y-4">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Analysis Complete
            </div>
            <h2 className="font-serif text-5xl font-bold leading-tight md:text-6xl">
              Your Season is <br />
              <span className="text-gradient-ai">{analysis.season}</span>
            </h2>
            <p className="text-lg text-muted-foreground">{getSeasonDescription(analysis.season)}</p>
          </div>

          <div className="grid gap-6 rounded-xl border border-border bg-card/30 p-6 backdrop-blur-sm">
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-medium">
                <span>Contrast Level</span>
                <span className="text-primary">{analysis.contrastLevel}</span>
              </div>
              <Progress value={contrastValue} className="h-2" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-medium">
                <span>Undertone</span>
                <span className={analysis.undertone === "Warm" ? "text-orange-400" : "text-blue-400"}>
                  {analysis.undertone}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    "h-full transition-all",
                    analysis.undertone === "Warm"
                      ? "w-[70%] bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400"
                      : "w-[30%] bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400",
                  )}
                />
              </div>
            </div>
            {analysis.faceShape && (
              <div className="pt-2">
                <span className="text-sm font-medium">Face Shape</span>
                <p className="text-primary font-medium">{analysis.faceShape}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section 3: The Palettes */}
      <section className="space-y-6">
        <h3 className="font-serif text-2xl font-bold">Your Power Palette</h3>
        <Card className="overflow-hidden border-border/50 bg-card/30 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="space-y-8">
              {/* Power Colors */}
              {analysis.palette && analysis.palette.length > 0 && (
                <div>
                  <h4 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                    Power Colors
                  </h4>
                  <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                    {analysis.palette.slice(0, 8).map((color, index) => (
                      <PaletteSwatch key={index} color={color.hex} name={color.name} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Section 4: Recommendations */}
      <section className="space-y-6 pb-20">
        <h3 className="font-serif text-2xl font-bold">Styling Recommendations</h3>
        <Tabs defaultValue="jewelry" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-card/50 p-1 backdrop-blur-sm">
            <TabsTrigger value="jewelry">Jewelry</TabsTrigger>
            <TabsTrigger value="makeup">Makeup</TabsTrigger>
          </TabsList>

          <TabsContent value="jewelry" className="mt-6 animate-in fade-in-50">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Gold & Brass Card */}
              <Card className={analysis.undertone === "Warm" 
                ? "border-yellow-500/20 bg-yellow-500/5 transition-all hover:border-yellow-500/40"
                : "opacity-60 grayscale transition-all hover:opacity-100 hover:grayscale-0"
              }>
                <CardContent className="flex flex-col items-center p-8 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-500">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  {analysis.undertone === "Warm" ? (
                    <Badge className="mb-4 bg-yellow-500 hover:bg-yellow-600">Recommended</Badge>
                  ) : (
                    <Badge variant="outline" className="mb-4">Use With Caution</Badge>
                  )}
                  <h4 className="mb-2 font-serif text-xl font-bold">Gold & Brass</h4>
                  <p className="text-sm text-muted-foreground">
                    {analysis.undertone === "Warm" 
                      ? "Warm metals harmonize beautifully with your skin's golden undertones."
                      : "Warm metals may clash with your cool undertones. Opt for rose gold if needed."
                    }
                  </p>
                </CardContent>
              </Card>

              {/* Silver & Platinum Card */}
              <Card className={analysis.undertone === "Cool"
                ? "border-slate-400/20 bg-slate-400/5 transition-all hover:border-slate-400/40"
                : "opacity-60 grayscale transition-all hover:opacity-100 hover:grayscale-0"
              }>
                <CardContent className="flex flex-col items-center p-8 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-300/10 text-slate-300">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  {analysis.undertone === "Cool" ? (
                    <Badge className="mb-4 bg-slate-400 hover:bg-slate-500">Recommended</Badge>
                  ) : (
                    <Badge variant="outline" className="mb-4">Use With Caution</Badge>
                  )}
                  <h4 className="mb-2 font-serif text-xl font-bold">Silver & Platinum</h4>
                  <p className="text-sm text-muted-foreground">
                    {analysis.undertone === "Cool"
                      ? "Cool metals complement your skin's pink and blue undertones perfectly."
                      : "Cool metals may clash with your warmth. Opt for antique silver if necessary."
                    }
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Season-specific styling tips */}
            {jewelryTips.length > 0 && (
              <Card className="mt-6 bg-card/30 backdrop-blur-sm">
                <CardContent className="p-6">
                  <h4 className="mb-4 font-serif text-lg font-medium">
                    Jewelry Styling Tips for {analysis.season}
                  </h4>
                  <ul className="space-y-2">
                    {jewelryTips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="makeup" className="mt-6">
            <Card className="bg-card/30 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="mb-6 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                  <Sparkles className="h-4 w-4 text-primary" />

                  <p className="text-sm font-medium text-primary">
                    Personalized makeup shades based on your season, undertone, and contrast
                  </p>
                </div>
                <div className="grid gap-8 md:grid-cols-3">
                  <div className="space-y-4">
                    <h4 className="font-serif text-lg font-medium">Lips</h4>
                    <div className="flex gap-3">
                      {makeupColors.lips.map((item, idx) => (
                        <PaletteSwatch key={idx} color={item.color} name={item.name} size="sm" />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-serif text-lg font-medium">Eyes</h4>
                    <div className="flex gap-3">
                      {makeupColors.eyes.map((item, idx) => (
                        <PaletteSwatch key={idx} color={item.color} name={item.name} size="sm" />
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </section>
    </div>
  )
}

function GlassCard({
  label,
  value,
  hex,
  className,
}: { label: string; value: string; hex: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-white/10 bg-black/40 p-3 shadow-xl backdrop-blur-md transition-transform hover:scale-105",
        className,
      )}
    >
      <div className="h-10 w-10 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: hex }} />
      <div>
        <p className="text-xs font-medium text-white/60">{label}</p>
        <p className="text-sm font-bold text-white">{value}</p>
      </div>
    </div>
  )
}

function PaletteSwatch({
  color,
  name,
  size = "md",
  crossOut = false,
}: {
  color: string
  name: string
  size?: "sm" | "md"
  crossOut?: boolean
}) {
  return (
    <div className="group relative flex cursor-pointer flex-col items-center">
      {/* Swatch */}
      <div
        className={cn(
          "relative rounded-full shadow-lg ring-1 ring-border/50 transition-transform duration-300 group-hover:scale-110",
          size === "md" ? "h-16 w-16 md:h-20 md:w-20" : "h-12 w-12",
        )}
        style={{ backgroundColor: color }}
      >
        {crossOut && (
          <div className="absolute inset-0 flex items-center justify-center text-white/80">
            <X className="h-6 w-6" />
          </div>
        )}
      </div>

      {/* Label (absolute, no layout shift) */}
      <span
        className={cn(
          "absolute -bottom-6 text-center font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap",
          size === "md" ? "text-xs" : "text-[10px]",
        )}
      >
        {name}
      </span>
    </div>
  )
}
