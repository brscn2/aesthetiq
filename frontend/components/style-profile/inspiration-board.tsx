"use client"

import { useState, useRef } from "react"
import { Plus, X, Upload, Link as LinkIcon, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"
import { StyleProfile } from "@/types/api"
import { useApi } from "@/lib/api"
import { toast } from "sonner"

interface InspirationBoardProps {
  styleProfile: StyleProfile
  onProfileUpdate?: () => void
}

const DEFAULT_TAGS = ["Streetwear", "Oversized Silhouette", "Neutral Tones", "Layering", "Matte Textures"]

export function InspirationBoard({ styleProfile, onProfileUpdate }: InspirationBoardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadApi, styleProfileApi } = useApi()
  const inspirationImages = styleProfile.inspirationImageUrls || []
  const tags = DEFAULT_TAGS // In the future, these could be extracted from the profile or AI analysis

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPEG, PNG, or WebP image.')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size too large. Maximum size is 5MB.')
      return
    }

    setIsUploading(true)

    try {
      // Upload the file
      const response = await uploadApi.uploadImage(file)

      // Backend returns absolute URL from Azure Blob Storage
      const fullUrl = response.url.startsWith('http') || response.url.startsWith('https')
        ? response.url
        : `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace('/api', '')}${response.url}`

      setImageUrl(fullUrl)
      toast.success("Image uploaded successfully!")
    } catch (error: any) {
      toast.error(`Failed to upload image: ${error.message || 'Unknown error'}`)
      setImageUrl("")
    } finally {
      setIsUploading(false)
    }
  }

  const handleAddInspiration = async () => {
    if (!imageUrl.trim()) {
      toast.error("Please provide an image URL or upload a file")
      return
    }

    // Validate URL format
    try {
      new URL(imageUrl)
    } catch {
      toast.error("Please enter a valid image URL")
      return
    }

    setIsSaving(true)
    try {
      const updatedImages = [...inspirationImages, imageUrl]
      await styleProfileApi.updateByUserId({
        inspirationImageUrls: updatedImages,
      })
      toast.success("Inspiration added successfully!")
      setImageUrl("")
      setIsModalOpen(false)
      onProfileUpdate?.()
    } catch (error) {
      console.error("Error adding inspiration:", error)
      toast.error("Failed to add inspiration")
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveInspiration = async (index: number) => {
    setIsSaving(true)
    try {
      const updatedImages = inspirationImages.filter((_, i) => i !== index)
      await styleProfileApi.updateByUserId({
        inspirationImageUrls: updatedImages,
      })
      toast.success("Inspiration removed successfully!")
      onProfileUpdate?.()
    } catch (error) {
      console.error("Error removing inspiration:", error)
      toast.error("Failed to remove inspiration")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-2xl font-bold">Inspiration & Vibe</h3>
        <Button variant="outline" size="sm">
          Edit Board
        </Button>
      </div>

      {/* Masonry Grid Layout using CSS Columns */}
      <div className="columns-2 gap-4 space-y-4 md:columns-3 lg:columns-4">
        {/* Add Inspiration Card */}
        <Card 
          className="break-inside-avoid border-2 border-dashed border-muted bg-transparent transition-colors hover:border-primary hover:bg-primary/5 cursor-pointer"
          onClick={() => setIsModalOpen(true)}
        >
          <CardContent className="flex aspect-[3/4] flex-col items-center justify-center p-6 text-center text-muted-foreground">
            <div className="mb-4 rounded-full bg-muted/50 p-4">
              <Plus className="h-6 w-6" />
            </div>
            <p className="font-medium">Add Inspiration</p>
            <p className="text-xs">Upload or save from chat</p>
          </CardContent>
        </Card>

        {inspirationImages.map((src, i) => (
          <div
            key={i}
            className="group relative break-inside-avoid overflow-hidden rounded-xl border border-border/50 bg-muted/20 mb-4"
          >
            <Image
              src={src || "/placeholder.svg"}
              alt={`Inspiration ${i + 1}`}
              width={400}
              height={500}
              className="h-auto w-full object-cover transition-transform duration-500 hover:scale-105"
            />
            <button
              onClick={() => handleRemoveInspiration(i)}
              disabled={isSaving}
              className="absolute right-2 top-2 rounded-full bg-destructive/80 p-1.5 opacity-0 transition-opacity hover:bg-destructive group-hover:opacity-100 disabled:opacity-50"
              aria-label={`Remove inspiration ${i + 1}`}
            >
              <X className="h-4 w-4 text-destructive-foreground" />
            </button>
          </div>
        ))}
      </div>

      {/* AI Analysis Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center px-2 text-sm text-muted-foreground">AI Detected:</span>
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="group gap-1 px-3 py-1 text-sm hover:bg-secondary/80">
              {tag}
              <button className="ml-1 opacity-0 transition-opacity group-hover:opacity-100">
                <X className="h-3 w-3" />
                <span className="sr-only">Remove {tag} tag</span>
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Add Inspiration Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Inspiration</DialogTitle>
            <DialogDescription>
              Upload a photo from your device or add an image using a URL.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="url">
                <LinkIcon className="mr-2 h-4 w-4" />
                URL
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">Select Image</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  disabled={isUploading || isSaving}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Supported formats: JPEG, PNG, WebP (Max 5MB)
                </p>
              </div>
              {isUploading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Uploading...</span>
                </div>
              )}
              {imageUrl && (
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border">
                    <Image
                      src={imageUrl}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              )}
            </TabsContent>
            <TabsContent value="url" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image-url">Image URL</Label>
                <Input
                  id="image-url"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground">
                  Enter a direct link to an image
                </p>
              </div>
              {imageUrl && (
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border">
                    <Image
                      src={imageUrl}
                      alt="Preview"
                      fill
                      className="object-cover"
                      onError={() => {
                        toast.error("Failed to load image from URL")
                        setImageUrl("")
                      }}
                    />
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false)
                setImageUrl("")
                if (fileInputRef.current) {
                  fileInputRef.current.value = ""
                }
              }}
              disabled={isSaving || isUploading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddInspiration} 
              disabled={isSaving || isUploading || !imageUrl.trim()}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Inspiration"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
