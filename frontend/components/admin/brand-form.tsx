"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Upload, X, Package, Loader2 } from "lucide-react"
import { useAdminApi, Brand, CreateBrandDto, UpdateBrandDto } from "@/lib/admin-api"
import { useAdminLoading } from "@/hooks/use-admin-loading"
import { AdminErrorHandler } from "@/lib/admin-error-handler"

interface BrandFormProps {
  brand?: Brand | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (brand: Brand) => void
}

interface FormData {
  name: string
  description: string
  website: string
  foundedYear: string
  country: string
  logoUrl: string
}

const initialFormData: FormData = {
  name: "",
  description: "",
  website: "",
  foundedYear: "",
  country: "",
  logoUrl: "",
}

export function BrandForm({ brand, open, onOpenChange, onSuccess }: BrandFormProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>("")
  const [errors, setErrors] = useState<Partial<FormData>>({})
  
  const api = useAdminApi()
  const { isLoading, execute } = useAdminLoading()
  const { isLoading: uploadLoading, execute: executeUpload } = useAdminLoading()

  const isEditing = !!brand

  useEffect(() => {
    if (brand) {
      setFormData({
        name: brand.name,
        description: brand.description || "",
        website: brand.website || "",
        foundedYear: brand.foundedYear?.toString() || "",
        country: brand.country || "",
        logoUrl: brand.logoUrl || "",
      })
      setLogoPreview(brand.logoUrl || "")
    } else {
      setFormData(initialFormData)
      setLogoPreview("")
    }
    setLogoFile(null)
    setErrors({})
  }, [brand, open])

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Brand name is required"
    }

    if (formData.website && !formData.website.match(/^https?:\/\/.+/)) {
      newErrors.website = "Website must be a valid URL (starting with http:// or https://)"
    }

    if (formData.foundedYear && (!parseInt(formData.foundedYear) || parseInt(formData.foundedYear) < 1800 || parseInt(formData.foundedYear) > new Date().getFullYear())) {
      newErrors.foundedYear = "Founded year must be a valid year between 1800 and current year"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      AdminErrorHandler.handle(new Error("Please select an image file"))
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      AdminErrorHandler.handle(new Error("Image size must be less than 5MB"))
      return
    }

    setLogoFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    let logoUrl = formData.logoUrl

    // Upload logo if a new file was selected
    if (logoFile) {
      const uploadResult = await executeUpload(
        () => api.upload.brandLogo(logoFile, formData.name),
        "Uploading logo"
      )
      
      if (!uploadResult) {
        return // Error already handled by executeUpload
      }
      
      logoUrl = uploadResult.url
    }

    // Prepare brand data
    const brandData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      website: formData.website.trim() || undefined,
      foundedYear: formData.foundedYear ? parseInt(formData.foundedYear) : undefined,
      country: formData.country.trim() || undefined,
      logoUrl: logoUrl || undefined,
    }

    // Create or update brand
    const result = await execute(
      () => isEditing 
        ? api.brands.update(brand!._id, brandData as UpdateBrandDto)
        : api.brands.create(brandData as CreateBrandDto),
      isEditing ? "Updating brand" : "Creating brand"
    )

    if (result) {
      AdminErrorHandler.showSuccess(
        isEditing ? "Brand updated successfully" : "Brand created successfully"
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {isEditing ? "Edit Brand" : "Add New Brand"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update the brand information below" 
              : "Fill in the details to add a new brand to your database"
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Brand Logo</Label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="relative">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-16 w-16 rounded-lg object-cover border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={() => {
                      setLogoPreview("")
                      setLogoFile(null)
                      setFormData(prev => ({ ...prev, logoUrl: "" }))
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="h-16 w-16 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              
              <div className="flex-1">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleLogoUpload(file)
                  }}
                  className="hidden"
                  id="logo-upload"
                />
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <Button type="button" variant="outline" asChild>
                    <span>
                      {uploadLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      {logoPreview ? "Change Logo" : "Upload Logo"}
                    </span>
                  </Button>
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, WebP up to 5MB
                </p>
              </div>
            </div>
          </div>

          {/* Brand Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Brand Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="e.g., Nike, Adidas, Zara"
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
              placeholder="Brief description of the brand..."
              rows={3}
            />
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => handleInputChange("website", e.target.value)}
              placeholder="https://www.example.com"
              className={errors.website ? "border-destructive" : ""}
            />
            {errors.website && (
              <p className="text-sm text-destructive">{errors.website}</p>
            )}
          </div>

          {/* Founded Year & Country */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="foundedYear">Founded Year</Label>
              <Input
                id="foundedYear"
                type="number"
                value={formData.foundedYear}
                onChange={(e) => handleInputChange("foundedYear", e.target.value)}
                placeholder="e.g., 1971"
                min="1800"
                max={new Date().getFullYear()}
                className={errors.foundedYear ? "border-destructive" : ""}
              />
              {errors.foundedYear && (
                <p className="text-sm text-destructive">{errors.foundedYear}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => handleInputChange("country", e.target.value)}
                placeholder="e.g., United States, Germany"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || uploadLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isEditing ? "Update Brand" : "Create Brand"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}