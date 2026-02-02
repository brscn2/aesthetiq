"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@clerk/nextjs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2, Upload, Sparkles, Camera, Image as ImageIcon } from "lucide-react"
import { tryOnClothing, uploadTryonAvatar } from "@/lib/tryon-api"
import { getCurrentUser } from "@/lib/api"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"

interface TryOnDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clothingImageUrl: string
  clothingName: string
}

export function TryOnDialog({
  open,
  onOpenChange,
  clothingImageUrl,
  clothingName,
}: TryOnDialogProps) {
  const { getToken } = useAuth()
  const [mode, setMode] = useState<"saved" | "new">("saved")
  const [hasSavedAvatar, setHasSavedAvatar] = useState(false)
  const [savedAvatarUrl, setSavedAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Check if user has a saved try-on avatar
  useEffect(() => {
    const checkSavedAvatar = async () => {
      try {
        const token = await getToken()
        if (!token) return

        const user = await getCurrentUser(token)
        if (user.tryonAvatarUrl) {
          setHasSavedAvatar(true)
          setSavedAvatarUrl(user.tryonAvatarUrl)
          setMode("saved")
        } else {
          setMode("new")
        }
      } catch (error) {
        console.error("Failed to check saved avatar:", error)
        setMode("new")
      }
    }

    if (open) {
      checkSavedAvatar()
    }
  }, [open, getToken])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 12 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Image size must be less than 12MB",
          variant: "destructive",
        })
        return
      }
      setAvatarFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setResultUrl(null)
    }
  }

  const handleTryOn = async () => {
    if (mode === "new" && !avatarFile) {
      toast({
        title: "Error",
        description: "Please upload your photo first",
        variant: "destructive",
      })
      return
    }

    if (mode === "saved" && !hasSavedAvatar) {
      toast({
        title: "Error",
        description: "No saved photo found. Please upload a new photo.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      
      // Get auth token
      const token = await getToken()
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication required. Please sign in.",
          variant: "destructive",
        })
        return
      }

      const useSavedAvatar = mode === "saved"
      const blob = await tryOnClothing(token, clothingImageUrl, avatarFile, useSavedAvatar)
      const url = URL.createObjectURL(blob)
      setResultUrl(url)
      toast({
        title: "Success!",
        description: "Virtual try-on completed",
      })
    } catch (error: any) {
      console.error("Try-on failed:", error)
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Virtual try-on failed. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    if (resultUrl) URL.revokeObjectURL(resultUrl)
    setAvatarFile(null)
    setPreviewUrl(null)
    setResultUrl(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Virtual Try-On: {clothingName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Upload Section */}
          <div className="space-y-4">
            {/* Mode Selection */}
            {hasSavedAvatar && (
              <div className="space-y-3">
                <Label>Choose Photo</Label>
                <RadioGroup value={mode} onValueChange={(value: "saved" | "new") => setMode(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="saved" id="saved" />
                    <Label htmlFor="saved" className="cursor-pointer font-normal flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Use My Saved Photo
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="new" id="new" />
                    <Label htmlFor="new" className="cursor-pointer font-normal flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload New Photo
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Upload or show saved photo */}
            {mode === "new" ? (
              <>
                <div>
                  <Label htmlFor="avatar-upload">Upload Your Photo</Label>
                  <div className="mt-2">
                    <Input
                      id="avatar-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      disabled={loading}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Upload a frontal photo for best results (JPEG, PNG, or WEBP, max 12MB)
                  </p>
                </div>

                {/* Preview */}
                {previewUrl && (
                  <div className="space-y-2">
                    <Label>Your Photo</Label>
                    <div className="relative aspect-[3/4] overflow-hidden rounded-lg border">
                      <Image
                        src={previewUrl}
                        alt="Your photo"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              savedAvatarUrl && (
                <div className="space-y-2">
                  <Label>Your Saved Photo</Label>
                  <div className="relative aspect-[3/4] overflow-hidden rounded-lg border">
                    <Image
                      src={savedAvatarUrl}
                      alt="Your saved photo"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              )
            )}

            <Button
              onClick={handleTryOn}
              disabled={(mode === "new" && !avatarFile) || loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing (may take up to 2 minutes)...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Try On
                </>
              )}
            </Button>
          </div>

          {/* Result Section */}
          <div className="space-y-4">
            <Label>Result</Label>
            {resultUrl ? (
              <div className="space-y-4">
                <div className="relative aspect-[3/4] overflow-hidden rounded-lg border">
                  <Image
                    src={resultUrl}
                    alt="Try-on result"
                    fill
                    className="object-cover"
                  />
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const a = document.createElement("a")
                    a.href = resultUrl
                    a.download = `tryon-${Date.now()}.jpg`
                    a.click()
                  }}
                >
                  Download Result
                </Button>
              </div>
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-dashed">
                <div className="text-center text-muted-foreground">
                  <Upload className="mx-auto h-12 w-12 opacity-50" />
                  <p className="mt-2">Upload a photo and click Try On</p>
                  <p className="mt-1 text-xs">
                    Processing takes 5-10 seconds
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
