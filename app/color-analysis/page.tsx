"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Upload, Camera, X, Sparkles, ScanLine } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"

export default function ColorAnalysisPage() {
  const [analysisState, setAnalysisState] = useState<"upload" | "processing" | "complete">("upload")
  const [uploadProgress, setUploadProgress] = useState(0)

  // Simulate processing flow
  const handleUpload = () => {
    setAnalysisState("processing")
    let progress = 0
    const interval = setInterval(() => {
      progress += 2
      setUploadProgress(progress)
      if (progress >= 100) {
        clearInterval(interval)
        setAnalysisState("complete")
      }
    }, 50)
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
            {analysisState === "upload" && <SmartUploader onUpload={handleUpload} />}

            {analysisState === "processing" && <ProcessingView progress={uploadProgress} />}

            {analysisState === "complete" && <AnalysisReport />}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

function SmartUploader({ onUpload }: { onUpload: () => void }) {
  const [isDragging, setIsDragging] = useState(false)

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500">
      <div
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-300 ease-in-out",
          isDragging ? "border-primary bg-primary/5" : "border-border bg-card/50 hover:bg-card/80",
          "h-[500px] w-full",
        )}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          onUpload()
        }}
      >
        <div className="flex flex-col items-center space-y-6 text-center p-8">
          <div className="rounded-full bg-primary/10 p-6 shadow-xl shadow-primary/5">
            <Camera className="h-10 w-10 text-primary" />
          </div>

          <div className="space-y-2">
            <h3 className="font-serif text-2xl font-semibold">Upload your photo</h3>
            <p className="text-muted-foreground max-w-xs mx-auto">
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
            onClick={onUpload}
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

function ProcessingView({ progress }: { progress: number }) {
  return (
    <div className="flex h-[500px] flex-col items-center justify-center space-y-8 animate-in fade-in duration-500">
      <div className="relative h-64 w-64 overflow-hidden rounded-full border-4 border-muted shadow-2xl">
        <Image src="/placeholder-user.jpg" alt="Processing" fill className="object-cover opacity-50 grayscale" />
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

function AnalysisReport() {
  return (
    <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-700">
      {/* Section 2: The Analysis Report (Core Visual) */}
      <section className="relative grid gap-8 lg:grid-cols-2 lg:items-center">
        {/* The Subject */}
        <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-2xl shadow-2xl ring-1 ring-border/50">
          <Image src="/placeholder-user.jpg" alt="User Analysis" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />

          {/* Feature Extraction Cards - Glassmorphism */}
          <GlassCard
            label="Skin Undertone"
            value="Cool Olive"
            hex="#E8C4A6"
            className="absolute top-12 right-4 translate-x-4 lg:right-8 lg:translate-x-0"
          />
          <GlassCard
            label="Eye Color"
            value="High Contrast"
            hex="#3E2723"
            className="absolute top-1/3 left-4 -translate-x-4 lg:left-8 lg:translate-x-0"
          />
          <GlassCard
            label="Hair Tone"
            value="Dark Ash"
            hex="#1A1A1A"
            className="absolute bottom-1/3 right-4 translate-x-4 lg:right-8 lg:translate-x-0"
          />
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
              <span className="text-gradient-ai">Deep Autumn</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Rich, warm, and dark. You shine in colors that mirror the turning leaves and deep earth tones.
            </p>
          </div>

          <div className="grid gap-6 rounded-xl border border-border bg-card/30 p-6 backdrop-blur-sm">
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-medium">
                <span>Contrast Level</span>
                <span className="text-primary">High</span>
              </div>
              <Progress value={85} className="h-2" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-medium">
                <span>Temperature</span>
                <span className="text-orange-400">Warm</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full w-[70%] bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400" />
              </div>
            </div>
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
              <div>
                <h4 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Power Colors
                </h4>
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                  <PaletteSwatch color="#8D4E38" name="Terracotta" />
                  <PaletteSwatch color="#2E4A3B" name="Forest Green" />
                  <PaletteSwatch color="#4A1C17" name="Mahogany" />
                  <PaletteSwatch color="#D4AF37" name="Gold" />
                  <PaletteSwatch color="#C25A00" name="Burnt Orange" />
                  <PaletteSwatch color="#5D4037" name="Cocoa" />
                  <PaletteSwatch color="#333333" name="Charcoal" />
                  <PaletteSwatch color="#556B2F" name="Olive" />
                </div>
              </div>

              <div className="grid gap-8 md:grid-cols-2">
                {/* Neutrals */}
                <div>
                  <h4 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                    Essentials
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    <PaletteSwatch color="#F5F5DC" name="Cream" size="sm" />
                    <PaletteSwatch color="#2F4F4F" name="Dark Slate" size="sm" />
                    <PaletteSwatch color="#3E2723" name="Espresso" size="sm" />
                    <PaletteSwatch color="#8B4513" name="Saddle Brown" size="sm" />
                  </div>
                </div>

                {/* Avoid */}
                <div>
                  <h4 className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-destructive">
                    <X className="h-4 w-4" /> Avoid
                  </h4>
                  <div className="flex flex-wrap gap-3 opacity-60 grayscale hover:grayscale-0 transition-all">
                    <PaletteSwatch color="#FF69B4" name="Hot Pink" size="sm" crossOut />
                    <PaletteSwatch color="#00FFFF" name="Cyan" size="sm" crossOut />
                    <PaletteSwatch color="#E6E6FA" name="Lavender" size="sm" crossOut />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Section 4: Recommendations */}
      <section className="space-y-6 pb-20">
        <h3 className="font-serif text-2xl font-bold">Styling Recommendations</h3>
        <Tabs defaultValue="jewelry" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 bg-card/50 p-1 backdrop-blur-sm">
            <TabsTrigger value="jewelry">Jewelry</TabsTrigger>
            <TabsTrigger value="makeup">Makeup</TabsTrigger>
            <TabsTrigger value="hair">Hair</TabsTrigger>
          </TabsList>

          <TabsContent value="jewelry" className="mt-6 animate-in fade-in-50">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-yellow-500/20 bg-yellow-500/5 transition-all hover:border-yellow-500/40">
                <CardContent className="flex flex-col items-center p-8 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-500">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <Badge className="mb-4 bg-yellow-500 hover:bg-yellow-600">Recommended</Badge>
                  <h4 className="mb-2 font-serif text-xl font-bold">Gold & Brass</h4>
                  <p className="text-sm text-muted-foreground">
                    Warm metals harmonize beautifully with your skin's golden undertones.
                  </p>
                </CardContent>
              </Card>

              <Card className="opacity-60 grayscale transition-all hover:opacity-100 hover:grayscale-0">
                <CardContent className="flex flex-col items-center p-8 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-300/10 text-slate-300">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <Badge variant="outline" className="mb-4">
                    Use With Caution
                  </Badge>
                  <h4 className="mb-2 font-serif text-xl font-bold">Silver & Platinum</h4>
                  <p className="text-sm text-muted-foreground">
                    Cool metals may clash with your warmth. Opt for antique silver if necessary.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="makeup" className="mt-6">
            <Card className="bg-card/30 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="grid gap-8 md:grid-cols-2">
                  <div className="space-y-4">
                    <h4 className="font-serif text-lg font-medium">Lips</h4>
                    <div className="flex gap-3">
                      <PaletteSwatch color="#800000" name="Maroon" size="sm" />
                      <PaletteSwatch color="#A0522D" name="Sienna" size="sm" />
                      <PaletteSwatch color="#CC5500" name="Burnt Orange" size="sm" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-serif text-lg font-medium">Eyes</h4>
                    <div className="flex gap-3">
                      <PaletteSwatch color="#556B2F" name="Olive" size="sm" />
                      <PaletteSwatch color="#DAA520" name="Goldenrod" size="sm" />
                      <PaletteSwatch color="#3E2723" name="Coffee" size="sm" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hair" className="mt-6">
            <Card className="bg-card/30 backdrop-blur-sm">
              <CardContent className="p-6 text-center text-muted-foreground">
                Additional hair color recommendations available in the full report.
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
}: { color: string; name: string; size?: "sm" | "md"; crossOut?: boolean }) {
  return (
    <div className="group relative flex cursor-pointer flex-col items-center gap-2">
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
      <span
        className={cn(
          "text-center font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100",
          size === "md" ? "text-xs" : "text-[10px]",
        )}
      >
        {name}
      </span>
    </div>
  )
}
