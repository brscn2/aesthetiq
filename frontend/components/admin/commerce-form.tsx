"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
import { Upload, X, ShoppingBag, Loader2 } from "lucide-react"
import { useAdminApi, CommerceItem, CreateCommerceItemDto, UpdateCommerceItemDto, Retailer, Brand, Category } from "@/lib/admin-api"
import { useAdminLoading } from "@/hooks/use-admin-loading"
import { AdminErrorHandler } from "@/lib/admin-error-handler"

interface CommerceFormProps {
  item?: CommerceItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (item: CommerceItem) => void
}

interface FormData {
  name: string
  description: string
  imageUrl: string
  category: Category
  subCategory: string
  brand: string
  brandId: string
  retailerId: string
  colors: string
  price: string
  currency: string
  productUrl: string
  sku: string
  tags: string
  inStock: boolean
}

const initialFormData: FormData = {
  name: "",
  description: "",
  imageUrl: "",
  category: "TOP" as Category,
  subCategory: "",
  brand: "",
  brandId: "",
  retailerId: "",
  colors: "",
  price: "",
  currency: "USD",
  productUrl: "",
  sku: "",
  tags: "",
  inStock: true,
}

export function CommerceForm({ item, open, onOpenChange, onSuccess }: CommerceFormProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [retailers, setRetailers] = useState<Retailer[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  
  const api = useAdminApi()
  const { isLoading, execute } = useAdminLoading()
  const { isLoading: uploadLoading, execute: executeUpload } = useAdminLoading()

  const isEditing = !!item

  useEffect(() => {
    loadRetailers()
    loadBrands()
  }, [])

  const loadRetailers = async () => {
    const result = await api.retailers.getAll({ isActive: true, limit: 100 })
    if (result) {
      setRetailers(result.retailers)
    }
  }

  const loadBrands = async () => {
    const result = await api.brands.getAll({ limit: 100 })
    if (result) {
      setBrands(result.brands)
    }
  }

  useEffect(() => {
    if (item) {
      const retailerId = typeof item.retailerId === 'object' ? item.retailerId._id : item.retailerId
      setFormData({
        name: item.name,
        description: item.description || "",
        imageUrl: item.imageUrl,
        category: item.category,
        subCategory: item.subCategory || "",
        brand: item.brand || "",
        brandId: item.brandId || "",
        retailerId: retailerId,
        colors: item.colors?.join(", ") || "",
        price: item.price ? (item.price / 100).toString() : "",
        currency: item.currency || "USD",
        productUrl: item.productUrl,
        sku: item.sku || "",
        tags: item.tags?.join(", ") || "",
        inStock: item.inStock,
      })
      setImagePreview(item.imageUrl)
    } else {
      setFormData(initialFormData)
      setImagePreview("")
    }
    setImageFile(null)
    setErrors({})
  }, [item, open])

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Product name is required"
    }

    if (!formData.imageUrl && !imageFile) {
      newErrors.imageUrl = "Product image is required"
    }

    if (!formData.retailerId) {
      newErrors.retailerId = "Retailer is required"
    }

    if (!formData.productUrl.trim()) {
      newErrors.productUrl = "Product URL is required"
    } else if (!formData.productUrl.match(/^https?:\/\/.+/)) {
      newErrors.productUrl = "Product URL must be a valid URL"
    }

    if (formData.price && isNaN(parseFloat(formData.price))) {
      newErrors.price = "Price must be a valid number"
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

    if (file.size > 10 * 1024 * 1024) {
      AdminErrorHandler.handle(new Error("Image size must be less than 10MB"))
      return
    }

    setImageFile(file)
    
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    let imageUrl = formData.imageUrl

    if (imageFile) {
      const uploadResult = await executeUpload(
        () => api.upload.uploadImage(imageFile),
        "Uploading image"
      )
      
      if (!uploadResult) {
        return
      }
      
      imageUrl = uploadResult.url
    }

    const colors = formData.colors
      .split(",")
      .map(c => c.trim())
      .filter(c => c)

    const tags = formData.tags
      .split(",")
      .map(t => t.trim())
      .filter(t => t)

    const itemData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      imageUrl,
      category: formData.category,
      subCategory: formData.subCategory.trim() || undefined,
      brand: formData.brand.trim() || undefined,
      brandId: formData.brandId || undefined,
      retailerId: formData.retailerId,
      colors: colors.length > 0 ? colors : undefined,
      price: formData.price ? Math.round(parseFloat(formData.price) * 100) : undefined,
      currency: formData.currency || undefined,
      productUrl: formData.productUrl.trim(),
      sku: formData.sku.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      inStock: formData.inStock,
    }

    const result = await execute(
      () => isEditing 
        ? api.commerce.update(item!._id, itemData as UpdateCommerceItemDto)
        : api.commerce.create(itemData as CreateCommerceItemDto),
      isEditing ? "Updating commerce item" : "Creating commerce item"
    )

    if (result) {
      AdminErrorHandler.showSuccess(
        isEditing ? "Commerce item updated successfully" : "Commerce item created successfully"
      )
      onSuccess(result)
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
            <ShoppingBag className="h-5 w-5" />
            {isEditing ? "Edit Commerce Item" : "Add New Commerce Item"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update the product information below" 
              : "Fill in the details to add a new product from a retailer"
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Product Image *</Label>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Product preview"
                    className="h-20 w-20 rounded-lg object-cover border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={() => {
                      setImagePreview("")
                      setImageFile(null)
                      setFormData(prev => ({ ...prev, imageUrl: "" }))
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="h-20 w-20 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                  <ShoppingBag className="h-8 w-8 text-muted-foreground" />
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
                  PNG, JPG, WebP up to 10MB
                </p>
                {errors.imageUrl && (
                  <p className="text-sm text-destructive mt-1">{errors.imageUrl}</p>
                )}
              </div>
            </div>
          </div>

          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="e.g., Classic White T-Shirt"
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Product description..."
              rows={3}
            />
          </div>

          {/* Category & Subcategory */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => handleInputChange("category", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TOP">Top</SelectItem>
                  <SelectItem value="BOTTOM">Bottom</SelectItem>
                  <SelectItem value="SHOE">Shoe</SelectItem>
                  <SelectItem value="ACCESSORY">Accessory</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subCategory">Sub-Category</Label>
              <Input
                id="subCategory"
                value={formData.subCategory}
                onChange={(e) => handleInputChange("subCategory", e.target.value)}
                placeholder="e.g., T-Shirt, Jeans, Sneakers"
              />
            </div>
          </div>

          {/* Retailer & Brand */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="retailerId">Retailer *</Label>
              <Select 
                value={formData.retailerId} 
                onValueChange={(value) => handleInputChange("retailerId", value)}
              >
                <SelectTrigger className={errors.retailerId ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select retailer" />
                </SelectTrigger>
                <SelectContent>
                  {retailers.map((retailer) => (
                    <SelectItem key={retailer._id} value={retailer._id}>
                      {retailer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.retailerId && (
                <p className="text-sm text-destructive">{errors.retailerId}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => handleInputChange("brand", e.target.value)}
                placeholder="e.g., Nike, Adidas"
              />
            </div>
          </div>

          {/* Price & Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => handleInputChange("price", e.target.value)}
                placeholder="e.g., 29.99"
                className={errors.price ? "border-destructive" : ""}
              />
              {errors.price && (
                <p className="text-sm text-destructive">{errors.price}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select 
                value={formData.currency} 
                onValueChange={(value) => handleInputChange("currency", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Product URL & SKU */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="productUrl">Product URL *</Label>
              <Input
                id="productUrl"
                type="url"
                value={formData.productUrl}
                onChange={(e) => handleInputChange("productUrl", e.target.value)}
                placeholder="https://retailer.com/product/123"
                className={errors.productUrl ? "border-destructive" : ""}
              />
              {errors.productUrl && (
                <p className="text-sm text-destructive">{errors.productUrl}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => handleInputChange("sku", e.target.value)}
                placeholder="e.g., SKU-12345"
              />
            </div>
          </div>

          {/* Colors */}
          <div className="space-y-2">
            <Label htmlFor="colors">Colors (comma-separated hex codes)</Label>
            <Input
              id="colors"
              value={formData.colors}
              onChange={(e) => handleInputChange("colors", e.target.value)}
              placeholder="e.g., #FFFFFF, #000000, #FF5733"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => handleInputChange("tags", e.target.value)}
              placeholder="e.g., casual, summer, cotton"
            />
          </div>

          {/* In Stock */}
          <div className="flex items-center space-x-2">
            <Switch
              id="inStock"
              checked={formData.inStock}
              onCheckedChange={(checked) => handleInputChange("inStock", checked)}
            />
            <Label htmlFor="inStock" className="font-normal">
              {formData.inStock ? "In Stock" : "Out of Stock"}
            </Label>
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
