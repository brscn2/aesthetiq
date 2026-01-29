"use client"

import { useState, useRef } from "react"
import { Outfit, WardrobeItem } from "@/types/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Download, X, Upload, Camera } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"

interface VirtualTryOnProps {
  outfit?: Outfit
  singleItem?: WardrobeItem // For single item try-on
  onClose: () => void
  personImageUrl?: string
}

function getItemImage(item: string | WardrobeItem | undefined): string | null {
  if (!item || typeof item === "string") return null
  return item.processedImageUrl || item.imageUrl || null
}

export function VirtualTryOn({ outfit, singleItem, onClose, personImageUrl }: VirtualTryOnProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [tryOnImage, setTryOnImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadedPersonImage, setUploadedPersonImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Use uploaded image, provided person image, or placeholder from public folder
  const personImage = uploadedPersonImage || personImageUrl || "/random_guy_tryon.jpeg"

  // Handle single item or outfit items
  let topImage: string | null = null
  let bottomImage: string | null = null
  let shoeImage: string | null = null
  let accessoryImages: string[] = []

  if (singleItem) {
    // Single item try-on
    const itemImage = getItemImage(singleItem)
    if (itemImage) {
      // Assign to appropriate category based on item type or just use as top
      topImage = itemImage
    }
  } else if (outfit) {
    // Full outfit try-on
    topImage = getItemImage(outfit.items.top)
    bottomImage = getItemImage(outfit.items.bottom)
    shoeImage = getItemImage(outfit.items.shoe)
    accessoryImages = outfit.items.accessories
      .map(getItemImage)
      .filter((img): img is string => img !== null)
      .slice(0, 1)
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select a valid image file")
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image size must be less than 10MB")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setUploadedPersonImage(result)
      toast.success("Image uploaded successfully")
    }
    reader.onerror = () => {
      toast.error("Failed to read image file")
    }
    reader.readAsDataURL(file)
  }

  const handleGenerateTryOn = async () => {
    // Check if we have clothing items
    const hasClothingItems = singleItem || (outfit && (topImage || bottomImage || shoeImage || accessoryImages.length > 0))
    
    if (!hasClothingItems) {
      toast.error("No items to try on", {
        description: "Please select at least one clothing item",
      })
      return
    }

    setIsLoading(true)
    setError(null)
    setTryOnImage(null) // Clear previous result
    
    try {
      let requestBody: any = {}

      // Handle person image
      if (uploadedPersonImage) {
        // Extract base64 data from data URL
        const base64Data = uploadedPersonImage.split(',')[1]
        requestBody.personImageFile = base64Data
      } else {
        requestBody.personImageUrl = personImage
      }

      // Handle clothing items
      if (singleItem) {
        // Single item try-on
        const itemImage = getItemImage(singleItem)
        if (itemImage) {
          requestBody.singleClothingItem = itemImage
        }
      } else if (outfit) {
        // Multiple items try-on
        const clothingImages: string[] = []
        if (topImage) clothingImages.push(topImage)
        if (bottomImage) clothingImages.push(bottomImage)
        if (shoeImage) clothingImages.push(shoeImage)
        clothingImages.push(...accessoryImages)
        requestBody.clothingImages = clothingImages
      }

      console.log("Sending request with:", requestBody)

      const response = await fetch("/api/virtual-tryon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Failed to generate virtual try-on`)
      }

      if (data.imageBase64) {
        setTryOnImage(`data:image/png;base64,${data.imageBase64}`)
        toast.success("Virtual try-on generated!", {
          description: "Your model runway preview is ready",
        })
      } else {
        throw new Error("No image returned from API")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      console.error("Virtual try-on error:", err)
      setError(errorMessage)
      toast.error("Error generating try-on", {
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!tryOnImage) return

    try {
      // Convert base64 to blob and download
      const arr = tryOnImage.split(",")
      const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png"
      const bstr = atob(arr[1])
      let n = bstr.length
      const u8arr = new Uint8Array(n)
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n)
      }
      const blob = new Blob([u8arr], { type: mime })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      
      // Generate filename based on item type
      const itemName = singleItem?.name || outfit?.name || "virtual-tryon"
      a.download = `${itemName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-tryon.png`
      
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success("Image downloaded")
    } catch (error) {
      console.error("Download error:", error)
      toast.error("Error downloading image")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <Card className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Virtual Try-On</CardTitle>
            <CardDescription>
              {singleItem ? singleItem.name : outfit?.name}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Person Image Upload Section */}
          <div className="space-y-4">
            <h3 className="font-serif text-lg font-semibold">Person Image</h3>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="relative aspect-[3/4] w-32 overflow-hidden rounded-lg border border-border bg-muted flex items-center justify-center">
                <Image
                  src={personImage}
                  alt="Person"
                  width={128}
                  height={170}
                  className="object-cover"
                />
              </div>
              <div className="flex-1 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Upload your own photo or use the default model
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Photo
                  </Button>
                  {uploadedPersonImage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUploadedPersonImage(null)
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ""
                        }
                        toast.success("Reset to default model")
                      }}
                    >
                      Reset
                    </Button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Clothing Items Summary */}
          <div className="space-y-4">
            <h3 className="font-serif text-lg font-semibold">
              {singleItem ? "Clothing Item" : "Outfit Items"}
            </h3>
            
            {singleItem ? (
              // Single item display
              <div className="flex justify-center">
                <div className="text-center">
                  <div className="mb-2 aspect-square w-32 overflow-hidden rounded-lg bg-muted flex items-center justify-center">
                    <Image
                      src={getItemImage(singleItem) || "/placeholder.jpg"}
                      alt={singleItem.name}
                      width={120}
                      height={120}
                      className="object-contain p-2"
                    />
                  </div>
                  <p className="text-sm font-medium">{singleItem.name}</p>
                  <p className="text-xs text-muted-foreground">{singleItem.category}</p>
                </div>
              </div>
            ) : (
              // Multiple items display
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {topImage && (
                  <div className="text-center">
                    <div className="mb-2 aspect-square overflow-hidden rounded-lg bg-muted flex items-center justify-center">
                      <Image
                        src={topImage}
                        alt="Top"
                        width={120}
                        height={120}
                        className="object-contain p-2"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Top</p>
                  </div>
                )}
                {bottomImage && (
                  <div className="text-center">
                    <div className="mb-2 aspect-square overflow-hidden rounded-lg bg-muted flex items-center justify-center">
                      <Image
                        src={bottomImage}
                        alt="Bottom"
                        width={120}
                        height={120}
                        className="object-contain p-2"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Bottom</p>
                  </div>
                )}
                {shoeImage && (
                  <div className="text-center">
                    <div className="mb-2 aspect-square overflow-hidden rounded-lg bg-muted flex items-center justify-center">
                      <Image
                        src={shoeImage}
                        alt="Shoe"
                        width={120}
                        height={120}
                        className="object-contain p-2"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Shoe</p>
                  </div>
                )}
                {accessoryImages[0] && (
                  <div className="text-center">
                    <div className="mb-2 aspect-square overflow-hidden rounded-lg bg-muted flex items-center justify-center">
                      <Image
                        src={accessoryImages[0]}
                        alt="Accessory"
                        width={120}
                        height={120}
                        className="object-contain p-2"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Accessory</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Try-On Result Area */}
          <div className="space-y-4">
            <h3 className="font-serif text-lg font-semibold">Preview</h3>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="relative aspect-[3/4] max-h-[500px] overflow-hidden rounded-lg border border-border bg-muted flex items-center justify-center">
              {tryOnImage ? (
                <Image
                  src={tryOnImage}
                  alt="Virtual try-on result"
                  fill
                  className="object-contain"
                />
              ) : (
                <div className="text-center space-y-2">
                  <Camera className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click "Generate Virtual Try-On" to see the result
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Close
            </Button>

            {tryOnImage ? (
              <Button
                onClick={handleDownload}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            ) : (
              <Button
                onClick={handleGenerateTryOn}
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? "Generating..." : "Generate Virtual Try-On"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
