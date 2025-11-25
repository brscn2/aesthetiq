"use client"

import type React from "react"
import { useState } from "react"
import { Upload, Check, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useApi } from "@/lib/api"
import { Category, CreateWardrobeItemDto } from "@/types/api"
import { toast } from "sonner"

// Temporary userId - in production, get from auth context
const TEMP_USER_ID = "507f1f77bcf86cd799439011" // Replace with actual user ID from auth

interface AddItemModalProps {
  isOpen: boolean
  onClose: () => void
}

interface FormData {
  imageUrl: string
  category: Category
  brand?: string
  subCategory?: string
  colorHex?: string
  removeBackground: boolean
}

export function AddItemModal({ isOpen, onClose }: AddItemModalProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [removeBackground, setRemoveBackground] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const queryClient = useQueryClient()
  const { wardrobeApi, uploadApi } = useApi()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FormData>({
    defaultValues: {
      imageUrl: "",
      category: Category.TOP,
      brand: "",
      subCategory: "",
      colorHex: "",
      removeBackground: true,
    },
  })

  const category = watch("category")

  const mutation = useMutation({
    mutationFn: async (data: CreateWardrobeItemDto) => {
      return wardrobeApi.create(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wardrobe", TEMP_USER_ID] })
      toast.success("Item added to wardrobe successfully!")
      reset()
      setImagePreview(null)
      onClose()
    },
    onError: (error: Error) => {
      toast.error(`Failed to add item: ${error.message}`)
    },
  })

  const onSubmit = async (data: FormData) => {
    const createData: CreateWardrobeItemDto = {
      userId: TEMP_USER_ID,
      imageUrl: data.imageUrl || "/placeholder.svg",
      processedImageUrl: removeBackground ? data.imageUrl : undefined,
      category: data.category,
      brand: data.brand || undefined,
      subCategory: data.subCategory || undefined,
      colorHex: data.colorHex || undefined,
      isFavorite: false,
    }

    mutation.mutate(createData)
  }

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setValue("imageUrl", url)
    if (url) {
      setImagePreview(url)
    }
  }

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
      // Create a local preview immediately
      const localPreview = URL.createObjectURL(file)
      setImagePreview(localPreview)

      // Upload the file
      const response = await uploadApi.uploadImage(file)

      // Backend returns absolute URL from Azure Blob Storage (e.g., https://account.blob.core.windows.net/...)
      // If it's already an absolute URL, use it directly; otherwise construct it from relative path
      const fullUrl = response.url.startsWith('http') || response.url.startsWith('https')
        ? response.url
        : `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace('/api', '')}${response.url}`

      // Update form with the uploaded image URL
      setValue("imageUrl", fullUrl)
      setImagePreview(fullUrl)

      toast.success("Image uploaded successfully!")
    } catch (error: any) {
      toast.error(`Failed to upload image: ${error.message || 'Unknown error'}`)
      setImagePreview(null)
      setValue("imageUrl", "")
    } finally {
      setIsUploading(false)
      // Clean up the local preview URL
      if (e.target.files?.[0]) {
        URL.revokeObjectURL(URL.createObjectURL(e.target.files[0]))
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl border-white/10 bg-[#1a1a1a] text-white sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl sm:text-2xl font-light">Add New Item</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            Upload a photo and let our AI analyze the details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mt-4 grid gap-6 sm:gap-8 md:grid-cols-2">
            {/* Left Column: Image Preview */}
            <div className="space-y-3 sm:space-y-4">
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border-2 border-dashed border-white/10 bg-black/20">
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="absolute inset-0 h-full w-full object-contain p-4"
                    />
                    {removeBackground && (
                      <div className="absolute inset-0 bg-gradient-to-b from-purple-500/0 via-purple-500/10 to-purple-500/0 opacity-50 transition-transform duration-[3s]" />
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No image preview</p>
                  </div>
                )}
                <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full bg-background/80 border border-border px-3 py-1.5 backdrop-blur-md">
                  <Switch
                    id="bg-remove"
                    checked={removeBackground}
                    onCheckedChange={setRemoveBackground}
                  />
                  <Label htmlFor="bg-remove" className="text-xs text-foreground">
                    Remove BG
                  </Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Upload Image
                </Label>
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-border bg-card text-foreground hover:bg-accent"
                    disabled={isUploading}
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Choose File
                      </>
                    )}
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">OR</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imageUrl" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Image URL
                  </Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    className="border-border bg-card text-foreground"
                    {...register("imageUrl", { required: "Image URL or file upload is required" })}
                    onChange={handleImageUrlChange}
                  />
                  {errors.imageUrl && (
                    <p className="text-xs text-red-400">{errors.imageUrl.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Form Fields */}
            <div className="space-y-4 sm:space-y-5">
              <div className="mb-2 flex items-center gap-2 rounded-md bg-purple-500/10 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-purple-300">
                <SparklesIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>AI Analysis Complete</span>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Category
                </Label>
                <Select
                  value={category}
                  onValueChange={(value) => setValue("category", value as Category)}
                >
                  <SelectTrigger className="border-border bg-card text-foreground">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-background text-foreground">
                    <SelectItem value={Category.TOP}>Tops</SelectItem>
                    <SelectItem value={Category.BOTTOM}>Bottoms</SelectItem>
                    <SelectItem value={Category.SHOE}>Footwear</SelectItem>
                    <SelectItem value={Category.ACCESSORY}>Accessories</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Sub Category
                </Label>
                <Input
                  placeholder="e.g., T-Shirt, Jeans, Sneakers"
                  className="border-border bg-card text-foreground"
                  {...register("subCategory")}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Brand
                </Label>
                <Input
                  placeholder="e.g., Nike, Zara"
                  className="border-border bg-card text-foreground"
                  {...register("brand")}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Color (Hex)
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="text"
                    placeholder="#000000"
                    className="border-border bg-card text-foreground"
                    {...register("colorHex", {
                      pattern: {
                        value: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
                        message: "Invalid hex color code",
                      },
                    })}
                  />
                  {watch("colorHex") && (
                    <div
                      className="h-8 w-8 rounded-full border border-border"
                      style={{ backgroundColor: watch("colorHex") }}
                    />
                  )}
                </div>
                {errors.colorHex && (
                  <p className="text-xs text-red-400">{errors.colorHex.message}</p>
                )}
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full bg-foreground text-background hover:bg-foreground/90"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Save to Wardrobe
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  )
}
