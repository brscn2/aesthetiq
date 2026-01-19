"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Upload, X, Store, Loader2 } from "lucide-react"
import { useAdminApi, Retailer, CreateRetailerDto, UpdateRetailerDto } from "@/lib/admin-api"
import { useAdminLoading } from "@/hooks/use-admin-loading"
import { AdminErrorHandler } from "@/lib/admin-error-handler"

interface RetailerFormProps {
  retailer?: Retailer | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (retailer: Retailer) => void
}

interface FormData {
  name: string
  description: string
  website: string
  country: string
  logoUrl: string
  isActive: boolean
}

const initialFormData: FormData = {
  name: "",
  description: "",
  website: "",
  country: "",
  logoUrl: "",
  isActive: true,
}

export function RetailerForm({ retailer, open, onOpenChange, onSuccess }: RetailerFormProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>("")
  const [errors, setErrors] = useState<Partial<FormData>>({})
  
  const api = useAdminApi()
  const { isLoading, execute } = useAdminLoading()
  const { isLoading: uploadLoading, execute: executeUpload } = useAdminLoading()

  const isEditing = !!retailer

  useEffect(() => {
    if (retailer) {
      setFormData({
        name: retailer.name,
        description: retailer.description || "",
        website: retailer.website || "",
        country: retailer.country || "",
        logoUrl: retailer.logoUrl || "",
        isActive: retailer.isActive,
      })
      setLogoPreview(retailer.logoUrl || "")
    } else {
      setFormData(initialFormData)
      setLogoPreview("")
    }
    setLogoFile(null)
    setErrors({})
  }, [retailer, open])

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Retailer name is required"
    }

    if (formData.website && !formData.website.match(/^https?:\/\/.+/)) {
      newErrors.website = "Website must be a valid URL (starting with http:// or https://)"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      AdminErrorHandler.handle(new Error("Please select an image file"))
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      AdminErrorHandler.handle(new Error("Image size must be less than 5MB"))
      return
    }

    setLogoFile(file)
    
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

    if (logoFile) {
      const uploadResult = await executeUpload(
        () => api.upload.uploadImage(logoFile),
        "Uploading logo"
      )
      
      if (!uploadResult) {
        return
      }
      
      logoUrl = uploadResult.url
    }

    const retailerData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      website: formData.website.trim() || undefined,
      country: formData.country.trim() || undefined,
      logoUrl: logoUrl || undefined,
      isActive: formData.isActive,
    }

    const result = await execute(
      () => isEditing 
        ? api.retailers.update(retailer!._id, retailerData as UpdateRetailerDto)
        : api.retailers.create(retailerData as CreateRetailerDto),
      isEditing ? "Updating retailer" : "Creating retailer"
    )

    if (result) {
      AdminErrorHandler.showSuccess(
        isEditing ? "Retailer updated successfully" : "Retailer created successfully"
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
            <Store className="h-5 w-5" />
            {isEditing ? "Edit Retailer" : "Add New Retailer"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update the retailer information below" 
              : "Fill in the details to add a new retailer to your database"
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Retailer Logo</Label>
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
                  <Store className="h-6 w-6 text-muted-foreground" />
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

          {/* Retailer Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Retailer Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="e.g., Zalando, ASOS, Nordstrom"
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
              placeholder="Brief description of the retailer..."
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

          {/* Country & Active Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => handleInputChange("country", e.target.value)}
                placeholder="e.g., Germany, United Kingdom"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="isActive">Active Status</Label>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleInputChange("isActive", checked)}
                />
                <Label htmlFor="isActive" className="font-normal">
                  {formData.isActive ? "Active" : "Inactive"}
                </Label>
              </div>
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
              {isEditing ? "Update Retailer" : "Create Retailer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
