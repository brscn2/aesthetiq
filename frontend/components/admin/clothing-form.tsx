"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Upload, X, Shirt, Loader2, Palette } from "lucide-react"
import { useAdminApi, WardrobeItem, Category, CreateWardrobeItemDto, UpdateWardrobeItemDto, Brand } from "@/lib/admin-api"
import { useAdminLoading } from "@/hooks/use-admin-loading"
import { AdminErrorHandler } from "@/lib/admin-error-handler"

interface ClothingFormProps {
  item?: WardrobeItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface FormData {
  userId: string
  category: Category | ""
  subCategory: string
  brand: string
  brandId: string
  colorHex: string
}

const initialFormData: FormData = {
  userId: "",
  category: "",
  subCategory: "",
  brand: "",
  brandId: "",
  colorHex: "",
}

const categoryOptions = [
  { value: "TOP", label: "Top" },
  { value: "BOTTOM", label: "Bottom" },
  { value: "SHOE", label: "Shoe" },
  { value: "ACCESSORY", label: "Accessory" },
]

const subCategoryOptions = {
  TOP: ["T-Shirt", "Shirt", "Blouse", "Sweater", "Hoodie", "Jacket", "Coat", "Blazer"],
  BOTTOM: ["Jeans", "Trousers", "Shorts", "Skirt", "Dress", "Leggings"],
  SHOE: ["Sneakers", "Boots", "Sandals", "Heels", "Flats", "Loafers"],
  ACCESSORY: ["Hat", "Bag", "Belt", "Jewelry", "Scarf", "Sunglasses", "Watch"],
}

export function ClothingForm({ item, open, onOpenChange, onSuccess }: ClothingFormProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [brands, setBrands] = useState<Brand[]>([])
  const [errors, setErrors] = useState<Partial<FormData>>({})
  const [isDragging, setIsDragging] = useState(false)
  
  const api = useAdminApi()
  const { isLoading, execute } = useAdminLoading()
  const { isLoading: uploadLoading, execute: executeUpload } = useAdminLoading()
  const { isLoading: brandsLoading, execute: executeBrands } = useAdminLoading()

  const isEditing = !!item

  // Load brands on mount
  useEffect(() => {
    const loadBrands = async () => {
      const result = await executeBrands(
        () => api.brands.getAll(),
        "Loading brands"
      )
      if (result) {
        setBrands(result.brands)
      }
    }
    loadBrands()
  }, [])

  useEffect(() => {
    if (item && brands.length > 0) {
      // Find brandId by matching brand name
      const matchingBrand = item.brand 
        ? brands.find(b => b.name === item.brand)
        : null
      
      setFormData({
        userId: item.userId,
        category: item.category,
        subCategory: item.subCategory || "",
        brand: item.brand || "",
        brandId: matchingBrand?._id || (item as any).brandId?.toString() || "",
        colorHex: item.colorHex || "",
      })
      setImagePreview(item.processedImageUrl || item.imageUrl)
    } else if (!item) {
      setFormData(initialFormData)
      setImagePreview("")
    }
    setImageFile(null)
    setErrors({})
  }, [item, open, brands])

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}

    if (!formData.userId.trim()) {
      newErrors.userId = "User ID is required"
    }

    if (!formData.category) {
      (newErrors as any).category = "Category is required"
    }

    if (!imageFile && !isEditing) {
      AdminErrorHandler.handle(new Error("Image is required for new items"))
      return false
    }

    if (formData.colorHex && !formData.colorHex.match(/^#[0-9A-Fa-f]{6}$/)) {
      newErrors.colorHex = "Color must be a valid hex code (e.g., #FF0000)"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      AdminErrorHandler.handle(new Error("Please select an image file"))
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      AdminErrorHandler.handle(new Error("Image size must be less than 10MB"))
      return
    }

    setImageFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleBrandChange = (brandId: string) => {
    if (brandId === "none") {
      setFormData(prev => ({
        ...prev,
        brandId: "",
        brand: "",
      }))
      return
    }
    const selectedBrand = brands.find((b) => b._id === brandId)
    setFormData((prev) => ({
      ...prev,
      brandId,
      brand: selectedBrand?.name || "",
    }))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleImageUpload(files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    let imageUrl = item?.imageUrl || ""

    // Upload image if a new file was selected
    if (imageFile) {
      const uploadResult = await executeUpload(
        () => api.upload.uploadImage(imageFile),
        "Uploading image"
      )
      
      if (!uploadResult) {
        return // Error already handled by executeUpload
      }
      
      imageUrl = uploadResult.url
    }

    // Prepare clothing item data
    const baseData = {
      imageUrl,
      category: formData.category as Category,
      subCategory: formData.subCategory.trim() || undefined,
      brand: formData.brand.trim() || undefined,
      brandId: formData.brandId || undefined,
      colorHex: formData.colorHex.trim() || undefined,
    }

    // For create, include userId. For update, don't include userId
    const itemData = isEditing 
      ? baseData 
      : { ...baseData, userId: formData.userId.trim() }

    // Create or update item
    const result = await execute(
      () => isEditing 
        ? api.wardrobe.update(item!._id, itemData as UpdateWardrobeItemDto)
        : api.wardrobe.create(itemData as CreateWardrobeItemDto & { userId: string }),
      isEditing ? "Updating clothing item" : "Creating clothing item"
    )

    if (result) {
      AdminErrorHandler.showSuccess(
        isEditing ? "Clothing item updated successfully" : "Clothing item created successfully"
      )
      onSuccess()
      onOpenChange(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shirt className="h-5 w-5" />
            {isEditing ? "Edit Clothing Item" : "Add New Clothing Item"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update the clothing item information below" 
              : "Fill in the details to add a new clothing item to the database"
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Item Image *</Label>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <div 
                  className={`relative cursor-pointer transition-all ${
                    isDragging ? "ring-2 ring-primary ring-offset-2 rounded-lg" : ""
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  <img
                    src={imagePreview}
                    alt="Item preview"
                    className="h-24 w-24 rounded-lg object-cover border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      setImagePreview("")
                      setImageFile(null)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div 
                  className={`h-24 w-24 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors ${
                    isDragging 
                      ? "border-primary bg-primary/10" 
                      : "border-muted-foreground/25 hover:border-muted-foreground/50"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  <Shirt className={`h-8 w-8 transition-colors ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                </div>
              )}
              
              <div className="flex-1">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageUpload(file)
                  }}
                  className="hidden"
                  id="image-upload"
                />
                <Label htmlFor="image-upload" className="cursor-pointer">
                  <Button type="button" variant="outline" asChild>
                    <span>
                      {uploadLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      {imagePreview ? "Change Image" : "Upload Image"}
                    </span>
                  </Button>
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Drag & drop on image or click to upload (PNG, JPG, WebP up to 10MB)
                </p>
              </div>
            </div>
          </div>

          {/* User ID */}
          <div className="space-y-2">
            <Label htmlFor="userId">User ID *</Label>
            <Input
              id="userId"
              value={formData.userId}
              onChange={(e) => handleInputChange("userId", e.target.value)}
              placeholder="e.g., user_123456789"
              className={errors.userId ? "border-destructive" : ""}
            />
            {errors.userId && (
              <p className="text-sm text-destructive">{errors.userId}</p>
            )}
          </div>

          {/* Category & Subcategory */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => handleInputChange("category", value)}
              >
                <SelectTrigger className={errors.category ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Subcategory</Label>
              <Select 
                value={formData.subCategory} 
                onValueChange={(value) => handleInputChange("subCategory", value)}
                disabled={!formData.category}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {formData.category && subCategoryOptions[formData.category as Category]?.map((subCat) => (
                    <SelectItem key={subCat} value={subCat}>
                      {subCat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Brand Selection */}
          <div className="space-y-2">
            <Label>Brand</Label>
            <Select
              value={formData.brandId || "none"}
              onValueChange={handleBrandChange}
              disabled={brandsLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={brandsLoading ? "Loading brands..." : "Select brand"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No brand</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand._id} value={brand._id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label htmlFor="colorHex">Color (Hex Code)</Label>
            <div className="flex items-center gap-2">
              {formData.colorHex && (
                <div 
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: formData.colorHex }}
                />
              )}
              <Input
                id="colorHex"
                value={formData.colorHex}
                onChange={(e) => handleInputChange("colorHex", e.target.value)}
                placeholder="#FF0000"
                className={`font-mono ${errors.colorHex ? "border-destructive" : ""}`}
              />
              <label className="relative cursor-pointer">
                <Palette className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                <input
                  type="color"
                  value={formData.colorHex || "#000000"}
                  onChange={(e) => handleInputChange("colorHex", e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  title="Pick a color"
                />
              </label>
            </div>
            {errors.colorHex && (
              <p className="text-sm text-destructive">{errors.colorHex}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || uploadLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isEditing ? "Update Item" : "Create Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}