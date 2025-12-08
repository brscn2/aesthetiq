"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DetailedMeasurements } from "./detailed-measurements"
import { useApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { StyleProfile } from "@/types/api"
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
import { X } from "lucide-react"
import { toast } from "sonner"

interface BrandSizingProps {
  styleProfile: StyleProfile
  onProfileUpdate?: () => void
}

export function BrandSizing({ styleProfile, onProfileUpdate }: BrandSizingProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAddBrandModalOpen, setIsAddBrandModalOpen] = useState(false)
  const [newBrandName, setNewBrandName] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const { styleProfileApi } = useApi()
  const sizes = styleProfile.sizes || {}
  const favoriteBrands = styleProfile.favoriteBrands || []

  const handleSizesUpdate = () => {
    // Trigger parent to refetch the profile
    onProfileUpdate?.()
  }

  const getDisplayValue = (type: "top" | "bottom" | "shoe") => {
    const size = sizes[type]
    if (!size) return "Not set"
    // Size is already saved with the correct region format, just display it as is
    return size
  }

  const handleAddBrand = async () => {
    if (!newBrandName.trim()) {
      toast.error("Brand name cannot be empty")
      return
    }

    const trimmedBrand = newBrandName.trim()
    if (favoriteBrands.includes(trimmedBrand)) {
      toast.error("This brand is already in your favorites")
      return
    }

    setIsSaving(true)
    try {
      const updatedBrands = [...favoriteBrands, trimmedBrand]
      await styleProfileApi.updateByUserId({
        favoriteBrands: updatedBrands,
      })
      toast.success("Brand added successfully")
      setNewBrandName("")
      setIsAddBrandModalOpen(false)
      onProfileUpdate?.()
    } catch (error) {
      console.error("Error adding brand:", error)
      toast.error("Failed to add brand")
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveBrand = async (brandToRemove: string) => {
    setIsSaving(true)
    try {
      const updatedBrands = favoriteBrands.filter((brand) => brand !== brandToRemove)
      await styleProfileApi.updateByUserId({
        favoriteBrands: updatedBrands,
      })
      toast.success("Brand removed successfully")
      onProfileUpdate?.()
    } catch (error) {
      console.error("Error removing brand:", error)
      toast.error("Failed to remove brand")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      <h3 className="font-serif text-2xl font-bold">Brand Affinity & Sizing</h3>

      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        {/* Brand Affinity */}
        <Card className="bg-card/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Favorite Brands</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {favoriteBrands.map((brand) => (
                <div
                  key={brand}
                  className="group relative flex aspect-[3/2] items-center justify-center rounded-lg border border-border bg-background/50 p-4 text-center font-serif text-lg font-medium shadow-sm transition-colors hover:border-primary/50"
                >
                  <span className="truncate">{brand}</span>
                  <button
                    onClick={() => handleRemoveBrand(brand)}
                    disabled={isSaving}
                    className="absolute right-1 top-1 rounded-full bg-destructive/80 p-1 opacity-0 transition-opacity hover:bg-destructive group-hover:opacity-100"
                    aria-label={`Remove ${brand}`}
                  >
                    <X className="h-3 w-3 text-destructive-foreground" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setIsAddBrandModalOpen(true)}
                disabled={isSaving}
                className="flex aspect-[3/2] cursor-pointer items-center justify-center rounded-lg border border-dashed border-muted bg-transparent p-4 text-center text-sm text-muted-foreground transition-colors hover:bg-muted/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Add Brand
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Sizing Data */}
        <Card className="bg-card/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">My Sizes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SizeRow label="Top" value={getDisplayValue("top")} />
            <SizeRow label="Bottom" value={getDisplayValue("bottom")} />
            <SizeRow label="Shoe" value={getDisplayValue("shoe")} />
            <div className="pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary hover:underline p-0 h-auto font-normal"
                onClick={() => setIsModalOpen(true)}
              >
                View Detailed Measurements
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <DetailedMeasurements
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        currentSizes={sizes}
        onSizesUpdate={handleSizesUpdate}
      />

      {/* Add Brand Dialog */}
      <Dialog open={isAddBrandModalOpen} onOpenChange={setIsAddBrandModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Favorite Brand</DialogTitle>
            <DialogDescription>
              Enter the name of a brand you love to add it to your favorites.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="brand-name">Brand Name</Label>
              <Input
                id="brand-name"
                placeholder="e.g., COS, Arket, Acne Studios"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isSaving) {
                    handleAddBrand()
                  }
                }}
                disabled={isSaving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddBrandModalOpen(false)
                setNewBrandName("")
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleAddBrand} disabled={isSaving || !newBrandName.trim()}>
              {isSaving ? "Adding..." : "Add Brand"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function SizeRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="font-mono font-semibold">{value}</span>
    </div>
  )
}
