"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Upload, Check, Loader2, Palette } from "lucide-react"
import { HexColorPicker } from "react-colorful"
import { useForm } from "react-hook-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useApi } from "@/lib/api"
import { Category, CreateWardrobeItemDto } from "@/types/api"
import { toast } from "sonner"
import { backgroundRemovalService } from "@/lib/background-removal"
import "@/styles/color-picker.css"

// Temporary userId - in production, get from auth context
const TEMP_USER_ID = "507f1f77bcf86cd799439011" // Replace with actual user ID from auth

interface AddItemModalProps {
  isOpen: boolean
  onClose: () => void
}

interface FormData {
  imageUrl: string
  processedImageUrl?: string
  category: Category
  brand?: string
  subCategory?: string
  colorHex: string
  notes?: string
  removeBackground: boolean
}

export function AddItemModal({ isOpen, onClose }: AddItemModalProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [removeBackground, setRemoveBackground] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [smoothProgress, setSmoothProgress] = useState(0)
  const [processedImageBlob, setProcessedImageBlob] = useState<Blob | null>(null)
  const [bgRemovalError, setBgRemovalError] = useState<string | null>(null)
  
  // Library loading state
  const [isLibraryLoading, setIsLibraryLoading] = useState(false)
  const [libraryLoadError, setLibraryLoadError] = useState<string | null>(null)
  
  // Track uploaded file for on-demand processing
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null)
  const [processedPreviewUrl, setProcessedPreviewUrl] = useState<string | null>(null)
  
  // Track object URLs for cleanup
  const [objectUrls, setObjectUrls] = useState<string[]>([])
  
  // Color picker state
  const [showColorPicker, setShowColorPicker] = useState(false)
  
  const queryClient = useQueryClient()
  const { wardrobeApi, uploadApi } = useApi()

  // Cleanup function to revoke all object URLs
  const cleanupObjectUrls = () => {
    objectUrls.forEach(url => {
      try {
        URL.revokeObjectURL(url)
      } catch (error) {
        console.warn('Failed to revoke object URL:', error)
      }
    })
    setObjectUrls([])
  }

  // Close color picker when clicking outside
  useEffect(() => {
    if (!showColorPicker) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.color-picker-container')) {
        setShowColorPicker(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showColorPicker])

  // Smooth progress animation with fake progress
  useEffect(() => {
    if (!isProcessing) {
      setSmoothProgress(0)
      return
    }

    // Gradually animate progress with realistic fake progress
    const interval = setInterval(() => {
      setSmoothProgress(prev => {
        // If we have real progress from library, use it
        if (processingProgress > prev) {
          return Math.min(prev + 2, processingProgress)
        }
        
        // Fake progress curve that slows down over time
        // Fast at start (0-20%), medium (20-60%), slow (60-90%), very slow (90-95%)
        if (prev < 20) {
          return prev + 1.5 // Fast initial progress
        } else if (prev < 60) {
          return prev + 0.8 // Medium progress
        } else if (prev < 85) {
          return prev + 0.3 // Slow progress
        } else if (prev < 95) {
          return prev + 0.1 // Very slow near end
        }
        return prev // Stop at 95% until real completion
      })
    }, 150) // Update every 150ms for smoother animation

    return () => clearInterval(interval)
  }, [isProcessing, processingProgress])

  // Handle background removal automatically in background
  const handleBackgroundRemoval = async (file: File) => {
    if (isProcessing || !file) return

    try {
      setIsProcessing(true)
      setProcessingProgress(0)
      setBgRemovalError(null)

      // Process the image with progress callback
      const processedBlob = await backgroundRemovalService.removeBackground(
        file,
        (progress) => {
          setProcessingProgress(progress)
          // When library reports completion, immediately show 100%
          if (progress >= 100) {
            setSmoothProgress(100)
          }
        },
        45000 // 45 second timeout
      )
      
      // Ensure progress shows 100% on completion
      setProcessingProgress(100)
      setSmoothProgress(100)

      // Cache the processed blob (will upload on submit)
      setProcessedImageBlob(processedBlob)
      
      // Update preview with processed image
      const processedPreview = URL.createObjectURL(processedBlob)
      setObjectUrls(prev => [...prev, processedPreview])
      setProcessedPreviewUrl(processedPreview)
      setImagePreview(processedPreview)
      
      toast.success('✨ Hintergrund entfernt!', {
        description: 'Du kannst jetzt zwischen Original und bearbeitet wechseln.',
        duration: 3000,
      })
    } catch (error: any) {
      // Fallback to original image on error
      const errorMessage = error.message || 'Unknown error'
      setBgRemovalError(errorMessage)
      
      // Provide specific error messages for different failure types
      if (errorMessage.includes('timed out')) {
        toast.warning('Background removal timed out', {
          description: 'The image is too complex. Using original image.',
          duration: 5000,
        })
      } else if (errorMessage.includes('format') || errorMessage.includes('unsupported')) {
        toast.warning('Unsupported image format', {
          description: 'Background removal not available for this format.',
          duration: 5000,
        })
      } else if (errorMessage.includes('memory') || errorMessage.includes('size')) {
        toast.warning('Image too large', {
          description: 'Try a smaller image for background removal.',
          duration: 5000,
        })
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        toast.warning('Network error', {
          description: 'Failed to load AI model. Check your connection.',
          duration: 5000,
        })
      } else {
        toast.warning('Background removal failed', {
          description: errorMessage,
          duration: 5000,
        })
      }
      
      // Keep original image in preview
      if (originalImageUrl) {
        setImagePreview(originalImageUrl)
      }
      console.error('Background removal error:', error)
    } finally {
      // Re-enable all form controls
      setIsProcessing(false)
      setProcessingProgress(0)
      setSmoothProgress(0)
    }
  }



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
      notes: "",
      removeBackground: false,
    },
  })

  const category = watch("category")
  const colorHex = watch("colorHex")
  const formValues = watch()

  // Check if form has unsaved changes
  const hasUnsavedChanges = () => {
    return (
      formValues.imageUrl !== "" ||
      formValues.brand !== "" ||
      formValues.subCategory !== "" ||
      formValues.colorHex !== "" ||
      formValues.notes !== "" ||
      imagePreview !== null
    )
  }

  const mutation = useMutation({
    mutationFn: async (data: CreateWardrobeItemDto) => {
      // Ensure complete workflow: upload → database → user association
      return wardrobeApi.create(data)
    },
    onMutate: async (newItem) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["wardrobe", TEMP_USER_ID] })

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData(["wardrobe", TEMP_USER_ID])

      // Optimistically update to show the new item immediately
      queryClient.setQueryData(["wardrobe", TEMP_USER_ID], (old: any) => {
        const optimisticItem = {
          _id: `temp-${Date.now()}`,
          ...newItem,
          userId: TEMP_USER_ID,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isFavorite: false,
        }
        return old ? [...old, optimisticItem] : [optimisticItem]
      })

      // Return context with the previous items for rollback
      return { previousItems }
    },
    onSuccess: () => {
      // Invalidate and refetch to get the real data from server
      queryClient.invalidateQueries({ queryKey: ["wardrobe", TEMP_USER_ID] })
      
      toast.success("Item added to wardrobe successfully!")
      
      // Clean up object URLs
      cleanupObjectUrls()
      
      // Reset form and close modal
      reset()
      setImagePreview(null)
      setIsUploading(false)
      setIsDragging(false)
      setUploadProgress(0)
      setIsProcessing(false)
      setProcessingProgress(0)
      setSmoothProgress(0)
      setProcessedImageBlob(null)
      setProcessedPreviewUrl(null)
      setBgRemovalError(null)
      setUploadedFile(null)
      setOriginalImageUrl(null)
      
      onClose()
    },
    onError: (error: any, newItem, context) => {
      // Rollback to previous state on error
      if (context?.previousItems) {
        queryClient.setQueryData(["wardrobe", TEMP_USER_ID], context.previousItems)
      }

      // Extract detailed error message
      const errorMessage = 
        error.response?.data?.message || 
        error.message || 
        'Failed to save item. Please try again.'

      toast.error(`Failed to add item: ${errorMessage}`)

      // Keep modal open and preserve form data for retry
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["wardrobe", TEMP_USER_ID] })
    },
  })

  const onSubmit = async (data: FormData) => {
    // Validate that we have either an image URL or an uploaded file
    if (!data.imageUrl && !uploadedFile) {
      toast.error("Please upload an image or provide an image URL")
      return
    }

    // Validate required fields
    if (!data.colorHex) {
      toast.error("Please select a color for your item")
      return
    }

    if (!data.category) {
      toast.error("Please select a category for your item")
      return
    }

    // Check if we have a local file that needs to be uploaded
    if (!data.imageUrl && uploadedFile) {
      try {
        setIsUploading(true)
        toast.info('Uploading images to cloud...')

        // Upload original image
        const originalResponse = await uploadApi.uploadImage(uploadedFile)
        const originalUrl = originalResponse.url.startsWith('http') || originalResponse.url.startsWith('https')
          ? originalResponse.url
          : `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace('/api', '')}${originalResponse.url}`

        // Upload processed image if we have one
        let processedUrl: string | undefined = undefined
        if (processedImageBlob && removeBackground) {
          const processedFile = new File(
            [processedImageBlob],
            `processed-${uploadedFile.name.replace(/\.[^/.]+$/, '')}.png`,
            { type: 'image/png' }
          )
          const processedResponse = await uploadApi.uploadImage(processedFile)
          processedUrl = processedResponse.url.startsWith('http') || processedResponse.url.startsWith('https')
            ? processedResponse.url
            : `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace('/api', '')}${processedResponse.url}`
        }

        setIsUploading(false)

        // Now create the wardrobe item with uploaded URLs
        const createData: CreateWardrobeItemDto = {
          imageUrl: originalUrl,
          processedImageUrl: processedUrl,
          category: data.category,
          brand: data.brand || undefined,
          subCategory: data.subCategory || undefined,
          colorHex: data.colorHex,
          isFavorite: false,
        }

        mutation.mutate(createData)
      } catch (error: any) {
        setIsUploading(false)
        const errorMessage = error.response?.data?.message || error.message || 'Unknown error'
        toast.error(`Failed to upload images: ${errorMessage}`)
      }
    } else {
      // Image URL was provided directly (not a file upload)
      const createData: CreateWardrobeItemDto = {
        imageUrl: data.imageUrl || "/placeholder.svg",
        processedImageUrl: data.processedImageUrl || undefined,
        category: data.category,
        brand: data.brand || undefined,
        subCategory: data.subCategory || undefined,
        colorHex: data.colorHex,
        isFavorite: false,
      }

      mutation.mutate(createData)
    }
  }

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setValue("imageUrl", url)
    if (url) {
      setImagePreview(url)
    }
  }

  const extractCenterColor = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (e) => {
        const img = new Image()
        img.src = e.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }

          canvas.width = img.width
          canvas.height = img.height
          ctx.drawImage(img, 0, 0)

          // Get pixel from center of image
          const centerX = Math.floor(img.width / 2)
          const centerY = Math.floor(img.height / 2)
          const pixelData = ctx.getImageData(centerX, centerY, 1, 1).data

          // Convert RGB to hex
          const r = pixelData[0]
          const g = pixelData[1]
          const b = pixelData[2]
          const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
          
          resolve(hex.toUpperCase())
        }
        img.onerror = () => reject(new Error('Failed to load image'))
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
    })
  }

  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (e) => {
        const img = new Image()
        img.src = e.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }

          // Calculate new dimensions (max 2048px on longest side)
          const maxDimension = 2048
          let width = img.width
          let height = img.height

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension
              width = maxDimension
            } else {
              width = (width / height) * maxDimension
              height = maxDimension
            }
          }

          canvas.width = width
          canvas.height = height

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height)
          
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'))
                return
              }
              
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
              
              resolve(compressedFile)
            },
            'image/jpeg',
            0.85 // 85% quality
          )
        }
        img.onerror = () => reject(new Error('Failed to load image'))
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
    })
  }

  const processFile = async (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPEG, PNG, WebP, or HEIC image.')
      return
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
      toast.error(`File size (${sizeMB}MB) exceeds the maximum limit of 10MB.`)
      return
    }

    // Compress if file is larger than 2MB
    const compressionThreshold = 2 * 1024 * 1024
    let fileToUpload = file
    
    if (file.size > compressionThreshold && file.type !== 'image/heic' && file.type !== 'image/heif') {
      try {
        toast.info('Compressing image...')
        fileToUpload = await compressImage(file)
        const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2)
        const compressedSizeMB = (fileToUpload.size / (1024 * 1024)).toFixed(2)
        toast.success(`Image compressed: ${originalSizeMB}MB → ${compressedSizeMB}MB`)
      } catch (error) {
        console.error('Compression failed, using original:', error)
        toast.warning('Compression failed, using original image')
        fileToUpload = file
      }
    }

    try {
      // Create a local preview immediately (no upload yet!)
      const localPreview = URL.createObjectURL(fileToUpload)
      setObjectUrls(prev => [...prev, localPreview])
      setImagePreview(localPreview)

      toast.success(`Image ready! (${(fileToUpload.size / 1024).toFixed(0)}KB)`)

      // Extract color from center of image
      try {
        const centerColor = await extractCenterColor(fileToUpload)
        setValue("colorHex", centerColor, { shouldValidate: true })
        toast.success(`Color detected: ${centerColor}`)
      } catch (error) {
        console.error('Failed to extract color:', error)
        toast.warning('Could not detect color automatically')
      }

      // Store the file locally - will upload on submit
      setUploadedFile(fileToUpload)
      setOriginalImageUrl(localPreview)
      
      // Clear any previously cached processed image since we have a new upload
      setProcessedImageBlob(null)
      setProcessedPreviewUrl(null)
      setValue("processedImageUrl", undefined)
      
      // Mark that we have a local file (not uploaded yet)
      setValue("imageUrl", "", { shouldValidate: false })
      
      // AUTO-START background removal in the background
      // User can continue filling out the form while AI processes
      if (removeBackground) {
        toast.info('AI removing background in the background...', {
          description: 'You can continue! Takes about 10-30 seconds.',
          duration: 4000,
        })
        
        // Start processing without blocking
        handleBackgroundRemoval(fileToUpload)
      }
      
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error'
      toast.error(`Failed to process image: ${errorMessage}`)
      setImagePreview(null)
      setValue("imageUrl", "")
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await processFile(file)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (!file) {
      toast.error('No file detected. Please try again.')
      return
    }

    // Check if it's an image file
    if (!file.type.startsWith('image/')) {
      toast.error('Please drop an image file.')
      return
    }

    await processFile(file)
  }

  const handleClose = (open: boolean) => {
    // If closing the modal and there are unsaved changes, confirm first
    if (!open && hasUnsavedChanges()) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close? All changes will be lost.'
      )
      if (!confirmed) {
        return // Don't close the modal
      }
    }

    // Reset form and close
    if (!open) {
      // Clean up object URLs
      cleanupObjectUrls()
      
      reset()
      setImagePreview(null)
      setIsUploading(false)
      setIsDragging(false)
      setUploadProgress(0)
      setIsProcessing(false)
      setProcessingProgress(0)
      setSmoothProgress(0)
      setProcessedImageBlob(null)
      setProcessedPreviewUrl(null)
      setBgRemovalError(null)
      setUploadedFile(null)
      setOriginalImageUrl(null)
    }

    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl border-border bg-background text-foreground sm:rounded-2xl max-h-[90vh] overflow-y-auto">
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
              <div 
                className={`relative aspect-[3/4] w-full overflow-hidden rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
                  isDragging 
                    ? 'border-purple-500 bg-purple-500/10' 
                    : 'border-border bg-muted/20 hover:border-purple-400/30'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isUploading && !isProcessing && document.getElementById('file-upload')?.click()}
              >
                {imagePreview ? (
                  <>
                    {/* Checkerboard pattern for transparent backgrounds */}
                    {processedImageBlob && (
                      <div 
                        className="absolute inset-0"
                        style={{
                          backgroundImage: 'linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)',
                          backgroundSize: '20px 20px',
                          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                          opacity: 0.1
                        }}
                      />
                    )}
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="absolute inset-0 h-full w-full object-contain p-4"
                    />
                    {removeBackground && !processedImageBlob && (
                      <div className="absolute inset-0 bg-gradient-to-b from-purple-500/0 via-purple-500/10 to-purple-500/0 opacity-50 transition-transform duration-[3s]" />
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="text-center">
                          <Loader2 className="mx-auto h-12 w-12 animate-spin text-purple-400" />
                          <p className="mt-2 text-sm text-white">Uploading... {uploadProgress}%</p>
                          <div className="mt-2 h-1 w-32 overflow-hidden rounded-full bg-white/20">
                            <div 
                              className="h-full bg-purple-500 transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {isProcessing && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm">
                        <div className="text-center px-5 py-4 bg-background/95 rounded-lg border border-purple-500/30 shadow-xl">
                          <Loader2 className="mx-auto h-10 w-10 animate-spin text-purple-500 dark:text-purple-400" />
                          <p className="mt-2 text-sm font-medium text-foreground">AI removing background</p>
                          <div className="mt-3 h-1.5 w-40 overflow-hidden rounded-full bg-muted">
                            <div 
                              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 ease-out"
                              style={{ width: `${Math.min(smoothProgress, 100)}%` }}
                            />
                          </div>
                          <p className="mt-1 text-xs font-mono text-purple-600 dark:text-purple-300">{Math.round(smoothProgress)}%</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
                    {isDragging ? (
                      <>
                        <Upload className="h-12 w-12 text-purple-400 animate-bounce" />
                        <p className="text-sm font-medium text-purple-300">Drop image here</p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No image preview</p>
                        <p className="text-xs text-muted-foreground">Drag & drop or click to upload</p>
                      </>
                    )}
                  </div>
                )}
                <div 
                  className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full bg-background/80 border border-border px-3 py-1.5 backdrop-blur-md"
                  onClick={(e) => e.stopPropagation()}
                  title={isProcessing ? "AI verarbeitet gerade..." : "Zwischen Original und ohne Hintergrund wechseln"}
                >
                  {isProcessing ? (
                    <Loader2 className="h-3 w-3 animate-spin text-purple-400" />
                  ) : (
                    <Switch
                      id="bg-remove"
                      checked={removeBackground}
                      onCheckedChange={(checked) => {
                        setRemoveBackground(checked)
                        
                        if (checked) {
                          // Toggle ON
                          if (processedPreviewUrl) {
                            // Use cached processed image (instant!)
                            setImagePreview(processedPreviewUrl)
                          } else if (uploadedFile && !processedImageBlob && !isProcessing) {
                            // Start processing if not already done
                            toast.info('AI removing background...', {
                              description: 'Takes about 10-30 seconds',
                              duration: 3000,
                            })
                            handleBackgroundRemoval(uploadedFile)
                          }
                        } else {
                          // Toggle OFF - show original (instant!)
                          if (originalImageUrl) {
                            setImagePreview(originalImageUrl)
                          }
                        }
                      }}
                      disabled={!!libraryLoadError}
                    />
                  )}
                  <Label 
                    htmlFor="bg-remove" 
                    className={`text-xs cursor-pointer ${libraryLoadError ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                  >
                    {isProcessing ? 'Processing...' : 'Remove BG'}
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
                    disabled={isUploading || isProcessing}
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
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
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
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
                    {...register("imageUrl", { 
                      required: false, // Not required anymore - we handle file uploads separately
                    })}
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
              <div className="mb-2 flex items-center gap-2 rounded-md bg-purple-500/10 dark:bg-purple-500/20 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-purple-600 dark:text-purple-300">
                <SparklesIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>AI Analysis Complete</span>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Category <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={category}
                  onValueChange={(value) => setValue("category", value as Category, { shouldValidate: true })}
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
                  {...register("brand", {
                    pattern: {
                      value: /^[a-zA-Z0-9\s\-&.]+$/,
                      message: "Brand name can only contain letters, numbers, spaces, hyphens, ampersands, and periods",
                    },
                  })}
                />
                {errors.brand && (
                  <p className="text-xs text-red-400">{errors.brand.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="colorHex" className="text-xs uppercase tracking-wider text-muted-foreground">
                  Color (Auto-detected) <span className="text-red-400">*</span>
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="colorHex"
                    type="text"
                    placeholder="#000000"
                    value={colorHex || ""}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) {
                        setValue("colorHex", value, { shouldValidate: true })
                      } else if (value === "" || value === "#") {
                        setValue("colorHex", value)
                      }
                    }}
                    className="border-border bg-card text-foreground"
                    pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                  />
                  {colorHex && (
                    <div className="relative color-picker-container">
                      <button
                        type="button"
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="h-10 w-10 flex-shrink-0 rounded-full border-2 border-border hover:border-purple-400 transition-colors cursor-pointer"
                        style={{ backgroundColor: colorHex }}
                        aria-label="Open color picker"
                        title="Click to change color"
                      />
                      {showColorPicker && (
                        <div className="absolute top-12 right-0 z-50 p-3 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground">Pick a color</span>
                            <button
                              type="button"
                              onClick={() => setShowColorPicker(false)}
                              className="text-xs text-muted-foreground hover:text-foreground"
                            >
                              ✕
                            </button>
                          </div>
                          <HexColorPicker
                            color={colorHex}
                            onChange={(color) => setValue("colorHex", color, { shouldValidate: true })}
                          />
                          <div className="mt-2 text-center">
                            <span className="text-xs font-mono text-muted-foreground">{colorHex}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {!colorHex && (
                    <button
                      type="button"
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className="h-10 w-10 flex-shrink-0 rounded-full border-2 border-dashed border-border hover:border-purple-400 transition-colors flex items-center justify-center"
                      aria-label="Open color picker"
                      title="Pick a color"
                    >
                      <Palette className="h-5 w-5 text-muted-foreground" />
                    </button>
                  )}
                </div>
                {errors.colorHex && (
                  <p className="text-xs text-red-400">{errors.colorHex.message}</p>
                )}
                {!colorHex && (
                  <p className="text-xs text-muted-foreground">Color will be auto-detected from image center</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs uppercase tracking-wider text-muted-foreground">
                  Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes about this item..."
                  className="border-border bg-card text-foreground resize-none"
                  rows={3}
                  {...register("notes", {
                    maxLength: {
                      value: 500,
                      message: "Notes cannot exceed 500 characters",
                    },
                  })}
                />
                <div className="flex items-center justify-between">
                  {errors.notes && (
                    <p className="text-xs text-red-400">{errors.notes.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground ml-auto">
                    {watch("notes")?.length || 0}/500
                  </p>
                </div>
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
