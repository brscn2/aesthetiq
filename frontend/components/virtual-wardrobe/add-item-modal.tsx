"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Upload, Check, Loader2, Palette, ChevronDown } from "lucide-react"
import { HexColorPicker } from "react-colorful"
import { useForm } from "react-hook-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@clerk/nextjs"
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
import { getClosestColorName } from "@/lib/colors"
import "@/styles/color-picker.css"

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
  colors: string[]
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
  
  // Track uploaded file for on-demand processing
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null)
  const [processedPreviewUrl, setProcessedPreviewUrl] = useState<string | null>(null)
  
  // Track object URLs for cleanup
  const [objectUrls, setObjectUrls] = useState<string[]>([])
  
  // Color picker state
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [pendingColor, setPendingColor] = useState("#808080")
  
  // AI Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(false)
  
  const queryClient = useQueryClient()
  const { getToken, userId } = useAuth()
  const { wardrobeApi, uploadApi, brandsApi, aiApi } = useApi()
  
  // Brands state for autocomplete
  const [availableBrands, setAvailableBrands] = useState<string[]>([])
  const [brandSearch, setBrandSearch] = useState("")
  const [showBrandDropdown, setShowBrandDropdown] = useState(false)
  const brandInputRef = useRef<HTMLInputElement>(null)
  const brandDropdownRef = useRef<HTMLDivElement>(null)

  // Subcategory state for autocomplete
  const [subCategorySearch, setSubCategorySearch] = useState("")
  const [showSubCategoryDropdown, setShowSubCategoryDropdown] = useState(false)
  const subCategoryInputRef = useRef<HTMLInputElement>(null)
  const subCategoryDropdownRef = useRef<HTMLDivElement>(null)

  // Predefined subcategories per category
  const subCategoriesByCategory: Record<Category, string[]> = {
    [Category.TOP]: ['T-Shirt', 'Shirt', 'Polo', 'Hoodie', 'Sweater', 'Jacket', 'Coat', 'Blazer', 'Tank Top', 'Cardigan'],
    [Category.BOTTOM]: ['Jeans', 'Chinos', 'Shorts', 'Joggers', 'Trousers', 'Sweatpants', 'Skirt', 'Leggings'],
    [Category.SHOE]: ['Sneakers', 'Boots', 'Loafers', 'Sandals', 'Running Shoes', 'Dress Shoes', 'Slippers', 'High Heels'],
    [Category.ACCESSORY]: ['Watch', 'Sunglasses', 'Cap', 'Hat', 'Belt', 'Bag', 'Backpack', 'Scarf', 'Gloves', 'Jewelry'],
  }

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

  // Load available brands when modal opens
  useEffect(() => {
    if (isOpen) {
      brandsApi.getAll().then(({ brands }) => {
        setAvailableBrands(brands.map(b => b.name))
      }).catch(() => {
        // Silently fail - user can still type custom brand
      })
    }
  }, [isOpen, brandsApi])

  // Close brand dropdown when clicking outside
  useEffect(() => {
    if (!showBrandDropdown) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!brandDropdownRef.current?.contains(target) && !brandInputRef.current?.contains(target)) {
        setShowBrandDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showBrandDropdown])

  // Close subcategory dropdown when clicking outside
  useEffect(() => {
    if (!showSubCategoryDropdown) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!subCategoryDropdownRef.current?.contains(target) && !subCategoryInputRef.current?.contains(target)) {
        setShowSubCategoryDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSubCategoryDropdown])

  // Filter brands based on search
  const filteredBrands = availableBrands.filter(brand =>
    brand.toLowerCase().includes(brandSearch.toLowerCase())
  )

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

      // Process the image with progress callback (server-side)
      const processedBlob = await backgroundRemovalService.removeBackground(
        file,
        (progress) => {
          setProcessingProgress(progress)
          // When server reports completion, immediately show 100%
          if (progress >= 100) {
            setSmoothProgress(100)
          }
        },
        60000, // 60 second timeout for server-side processing
        getToken // Pass the auth token getter
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
      
      toast.success('✨ Background removed!', {
        description: 'You can now switch between original and processed.',
        duration: 3000,
      })
    } catch (error: any) {
      // Fallback to original image on error
      const errorMessage = error.message || 'Unknown error'
      
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

  // AI Analysis function
  // Compress image for AI analysis (max 1024px, optimized for OpenAI Vision)
  const compressImageForAI = async (file: File): Promise<string> => {
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

          // Resize to max 1024px for AI analysis (reduces payload significantly)
          const maxDimension = 1024
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
          ctx.drawImage(img, 0, 0, width, height)
          
          // Convert to base64 with 80% quality JPEG
          const base64 = canvas.toDataURL('image/jpeg', 0.8)
          resolve(base64)
        }
        img.onerror = () => reject(new Error('Failed to load image'))
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
    })
  }

  const handleAiAnalysis = async () => {
    if (!imagePreview && !uploadedFile) {
      toast.error('Please upload an image first')
      return
    }

    setIsAnalyzing(true)
    try {
      let response
      
      if (uploadedFile) {
        // Compress and convert file to base64 for API (reduces ~5MB to ~200KB)
        toast.info('Preparing image for AI analysis...', { duration: 1500 })
        const base64 = await compressImageForAI(uploadedFile)
        response = await aiApi.analyzeClothing(undefined, base64)
      } else if (imagePreview) {
        response = await aiApi.analyzeClothing(imagePreview)
      }

      if (response?.success && response.data) {
        const { category, subCategory, brand, colors, styleNotes } = response.data
        
        // Update form with AI results
        setValue("category", category, { shouldValidate: true })
        if (subCategory) {
          setValue("subCategory", subCategory)
          setSubCategorySearch(subCategory)
        }
        if (brand) {
          setValue("brand", brand)
          setBrandSearch(brand)
        }
        if (colors && colors.length > 0) {
          setValue("colors", colors, { shouldValidate: true })
        }
        // Set AI style notes directly into the notes field
        if (styleNotes) {
          setValue("notes", styleNotes)
        }
        
        setAnalysisComplete(true)
        toast.success('AI analysis complete!', { duration: 2000 })
      } else {
        toast.error(response?.error || 'Analysis failed. Please fill in manually.')
      }
    } catch (error: any) {
      console.error('AI analysis error:', error)
      toast.error('AI analysis failed. Please fill in manually.')
    } finally {
      setIsAnalyzing(false)
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
      colors: [],
      notes: "",
      removeBackground: false,
    },
  })

  const category = watch("category")
  const colors = watch("colors")
  const formValues = watch()

  // Get filtered subcategories based on current category and search
  const filteredSubCategories = (subCategoriesByCategory[category] || []).filter(sub =>
    sub.toLowerCase().includes(subCategorySearch.toLowerCase())
  )

  // Check if form has unsaved changes
  const hasUnsavedChanges = () => {
    return (
      formValues.imageUrl !== "" ||
      formValues.brand !== "" ||
      formValues.subCategory !== "" ||
      (formValues.colors && formValues.colors.length > 0) ||
      formValues.notes !== "" ||
      imagePreview !== null
    )
  }

  const mutation = useMutation({
    mutationFn: async (data: CreateWardrobeItemDto) => {
      // Ensure complete workflow: upload → database → user association
      return wardrobeApi.create(data)
    },
    onMutate: async () => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["wardrobe", userId] })

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData(["wardrobe", userId])

      // Return context with the previous items for rollback
      return { previousItems }
    },
    onSuccess: () => {
      // Invalidate and refetch to get the real data from server
      queryClient.invalidateQueries({ queryKey: ["wardrobe", userId] })
      
      toast.success("Item added to wardrobe successfully!", { duration: 2000 })
      
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
      setUploadedFile(null)
      setOriginalImageUrl(null)
      setBrandSearch("") // Reset brand search input
      setSubCategorySearch("") // Reset subcategory search input
      setIsAnalyzing(false)
      setAnalysisComplete(false)
      
      onClose()
    },
    onError: (error: any, _newItem, context) => {
      // Rollback to previous state on error
      if (context?.previousItems) {
        queryClient.setQueryData(["wardrobe", userId], context.previousItems)
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
      queryClient.invalidateQueries({ queryKey: ["wardrobe", userId] })
    },
  })

  const onSubmit = async (data: FormData) => {
    // Validate that we have either an image URL or an uploaded file
    if (!data.imageUrl && !uploadedFile) {
      toast.error("Please upload an image or provide an image URL")
      return
    }

    // Validate required fields
    if (!data.colors || data.colors.length === 0) {
      toast.error("Please select at least one color for your item")
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
          colors: data.colors,
          notes: data.notes || undefined,
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
        colors: data.colors,
        notes: data.notes || undefined,
        isFavorite: false,
      }

      mutation.mutate(createData)
    }
  }

  const extractColorFromUrl = async (imageUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous' // Enable CORS for external images
      img.src = imageUrl
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
        
        try {
          const pixelData = ctx.getImageData(centerX, centerY, 1, 1).data
          const r = pixelData[0]
          const g = pixelData[1]
          const b = pixelData[2]
          const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
          resolve(hex.toUpperCase())
        } catch (error) {
          // CORS error - can't read pixel data from cross-origin image
          reject(new Error('Cannot read color from cross-origin image'))
        }
      }
      img.onerror = () => reject(new Error('Failed to load image'))
    })
  }

  // Fetch image as blob to bypass CORS for color extraction
  const fetchImageAsBlob = async (imageUrl: string): Promise<File> => {
    const response = await fetch(imageUrl)
    if (!response.ok) throw new Error('Failed to fetch image')
    const blob = await response.blob()
    return new File([blob], 'url-image.jpg', { type: blob.type || 'image/jpeg' })
  }

  const handleImageUrlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setValue("imageUrl", url)
    
    if (url) {
      setImagePreview(url)
      setAnalysisComplete(false)
      
      // Try to extract color - first try direct canvas approach
      try {
        const centerColor = await extractColorFromUrl(url)
        setValue("colors", [centerColor], { shouldValidate: true })
        toast.success(`Color detected: ${centerColor}`, { duration: 2000 })
      } catch (corsError) {
        // CORS blocked - try fetching as blob through our proxy/directly
        console.warn('CORS blocked, trying fetch approach...')
        try {
          const file = await fetchImageAsBlob(url)
          const centerColor = await extractCenterColor(file)
          setValue("colors", [centerColor], { shouldValidate: true })
          toast.success(`Color detected: ${centerColor}`, { duration: 2000 })
        } catch (fetchError) {
          console.warn('Could not auto-detect color from URL:', fetchError)
          toast.info('Color detection not available for this image. Please select manually.', {
            duration: 2000,
          })
        }
      }
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

    // Reset form fields when uploading a new image
    setValue("category", Category.TOP)
    setValue("subCategory", "")
    setValue("brand", "")
    setValue("colors", [])
    setValue("notes", "")
    setBrandSearch("")
    setSubCategorySearch("")
    setAnalysisComplete(false)

    // Compress if file is larger than 2MB
    const compressionThreshold = 2 * 1024 * 1024
    let fileToUpload = file
    
    if (file.size > compressionThreshold && file.type !== 'image/heic' && file.type !== 'image/heif') {
      try {
        toast.info('Compressing image...', { duration: 2000 })
        fileToUpload = await compressImage(file)
        const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2)
        const compressedSizeMB = (fileToUpload.size / (1024 * 1024)).toFixed(2)
        toast.success(`Image compressed: ${originalSizeMB}MB → ${compressedSizeMB}MB`, { duration: 2000 })
      } catch (error) {
        console.error('Compression failed, using original:', error)
        toast.warning('Compression failed, using original image', { duration: 2000 })
        fileToUpload = file
      }
    }

    try {
      // Create a local preview immediately (no upload yet!)
      const localPreview = URL.createObjectURL(fileToUpload)
      setObjectUrls(prev => [...prev, localPreview])
      setImagePreview(localPreview)

      toast.success(`Image ready! (${(fileToUpload.size / 1024).toFixed(0)}KB)`, { duration: 2000 })

      // Store the file locally - will upload on submit
      setUploadedFile(fileToUpload)
      setOriginalImageUrl(localPreview)
      
      // Clear any previously cached processed image since we have a new upload
      setProcessedImageBlob(null)
      setProcessedPreviewUrl(null)
      setValue("processedImageUrl", undefined)
      
      // Mark that we have a local file (not uploaded yet)
      setValue("imageUrl", "", { shouldValidate: false })
      
      // Trigger background removal if enabled
      if (removeBackground && !isProcessing) {
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
      setUploadedFile(null)
      setOriginalImageUrl(null)
      setBrandSearch("") // Reset brand search input
      setSubCategorySearch("") // Reset subcategory search input
      setIsAnalyzing(false)
      setAnalysisComplete(false)
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
                  title={isProcessing ? "AI is processing..." : "Toggle between original and background removed"}
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
                      disabled={false}
                    />
                  )}
                  <Label 
                    htmlFor="bg-remove" 
                    className="text-xs cursor-pointer text-foreground"
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
              {/* AI Analysis Button */}
              <Button
                type="button"
                variant={analysisComplete ? "outline" : "default"}
                className={`w-full ${analysisComplete 
                  ? 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 border-purple-500/30' 
                  : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
                onClick={handleAiAnalysis}
                disabled={isAnalyzing || (!imagePreview && !uploadedFile)}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : analysisComplete ? (
                  <>
                    <SparklesIcon className="mr-2 h-4 w-4" />
                    AI Analysis Complete
                  </>
                ) : (
                  <>
                    <SparklesIcon className="mr-2 h-4 w-4" />
                    Analyze with AI
                  </>
                )}
              </Button>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Category <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={category}
                  onValueChange={(value) => {
                    setValue("category", value as Category, { shouldValidate: true })
                    // Reset subcategory when category changes
                    setSubCategorySearch("")
                    setValue("subCategory", "")
                  }}
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
                <div className="relative">
                  <Input
                    ref={subCategoryInputRef}
                    placeholder="e.g., T-Shirt, Jeans, Sneakers"
                    className="border-border bg-card text-foreground"
                    value={subCategorySearch}
                    onChange={(e) => {
                      setSubCategorySearch(e.target.value)
                      setValue("subCategory", e.target.value)
                      setShowSubCategoryDropdown(true)
                    }}
                    onFocus={() => setShowSubCategoryDropdown(true)}
                  />
                  {showSubCategoryDropdown && filteredSubCategories.length > 0 && (
                    <div
                      ref={subCategoryDropdownRef}
                      className="absolute z-50 w-full mt-1 max-h-48 overflow-auto rounded-md border border-border bg-background shadow-lg"
                    >
                      {filteredSubCategories.map((sub) => (
                        <div
                          key={sub}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                          onClick={() => {
                            setSubCategorySearch(sub)
                            setValue("subCategory", sub)
                            setShowSubCategoryDropdown(false)
                          }}
                        >
                          {sub}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Brand
                </Label>
                <div className="relative">
                  <Input
                    ref={brandInputRef}
                    placeholder="e.g., Nike, Zara"
                    className="border-border bg-card text-foreground pr-8"
                    value={brandSearch}
                    onChange={(e) => {
                      setBrandSearch(e.target.value)
                      setValue("brand", e.target.value)
                      setShowBrandDropdown(true)
                    }}
                    onFocus={() => setShowBrandDropdown(true)}
                  />
                  <ChevronDown 
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer"
                    onClick={() => setShowBrandDropdown(!showBrandDropdown)}
                  />
                  {showBrandDropdown && filteredBrands.length > 0 && (
                    <div 
                      ref={brandDropdownRef}
                      className="absolute z-50 w-full mt-1 max-h-48 overflow-auto rounded-md border border-border bg-card shadow-lg"
                    >
                      {filteredBrands.map((brand) => (
                        <div
                          key={brand}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                          onClick={() => {
                            setBrandSearch(brand)
                            setValue("brand", brand)
                            setShowBrandDropdown(false)
                          }}
                        >
                          {brand}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {errors.brand && (
                  <p className="text-xs text-red-400">{errors.brand.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Colors <span className="text-red-400">*</span>
                </Label>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Color Chips */}
                  {colors && colors.map((color, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 px-2 py-1 rounded-full border border-border bg-card"
                    >
                      <div
                        className="h-4 w-4 rounded-full border border-border"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs text-muted-foreground">{getClosestColorName(color)}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const newColors = colors.filter((_, i) => i !== index)
                          setValue("colors", newColors, { shouldValidate: true })
                        }}
                        className="ml-1 text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  
                  {/* Add Color Button */}
                  {(!colors || colors.length < 5) && (
                    <div className="relative color-picker-container">
                      <button
                        type="button"
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="h-8 px-3 flex items-center gap-1 rounded-full border-2 border-dashed border-border hover:border-purple-400 transition-colors text-xs text-muted-foreground"
                      >
                        <Palette className="h-3 w-3" />
                        Add Color
                      </button>
                      {showColorPicker && (
                        <div className="absolute top-10 left-0 z-50 p-3 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl">
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
                            color={pendingColor}
                            onChange={setPendingColor}
                          />
                          <div className="mt-3 flex items-center gap-2">
                            <div 
                              className="h-8 w-8 rounded border border-border"
                              style={{ backgroundColor: pendingColor }}
                            />
                            <span className="text-xs text-muted-foreground flex-1">
                              {getClosestColorName(pendingColor)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const upperColor = pendingColor.toUpperCase()
                                const currentColors = colors || []
                                if (!currentColors.includes(upperColor) && currentColors.length < 5) {
                                  setValue("colors", [...currentColors, upperColor], { shouldValidate: true })
                                  toast.success(`Added ${getClosestColorName(pendingColor)}`)
                                }
                                setShowColorPicker(false)
                                setPendingColor("#808080")
                              }}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-md transition-colors"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {(!colors || colors.length === 0) && (
                  <p className="text-xs text-muted-foreground">At least one color is required</p>
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
