"use client"

import { useEffect, useState } from "react"
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
  const [recommendedBrands, setRecommendedBrands] = useState<
    { name: string; reason: string }[]
  >([])
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
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

  const saveBrand = async (brandName: string, options?: { onSuccess?: () => void }) => {
    const trimmedBrand = brandName.trim()
    if (!trimmedBrand) {
      toast.error("Brand name cannot be empty")
      return
    }

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
      toast.success(`${trimmedBrand} added to favorites`)
      options?.onSuccess?.()
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

  const loadRecommendedBrands = () => {
    setIsLoadingRecommendations(true)

    // Placeholder recommendations for the future recommendation engine.
    // Ties loosely to archetype so the UI already handles dynamic data.
    const archetype = styleProfile.archetype?.toLowerCase() || ""
    const recs =
      archetype.includes("minimal") || archetype.includes("modern")
        ? [
          { name: "COS", reason: "Clean lines, neutral palette" },
          { name: "Arket", reason: "Scandi basics with structure" },
          { name: "Theory", reason: "Tailored essentials" },
        ]
        : archetype.includes("romantic")
          ? [
            { name: "Reformation", reason: "Feminine silhouettes" },
            { name: "Sézane", reason: "Parisian softness" },
            { name: "LoveShackFancy", reason: "Soft florals" },
          ]
          : [
            { name: "Acne Studios", reason: "Elevated essentials" },
            { name: "Everlane", reason: "Quality everyday staples" },
            { name: "A.P.C.", reason: "Understated denim & leather" },
          ]

    // Simulate async flow to make wiring identical to a future API call.
    setTimeout(() => {
      setRecommendedBrands(recs)
      setIsLoadingRecommendations(false)
    }, 250)
  }

  useEffect(() => {
    loadRecommendedBrands()
    // Refreshes when archetype changes (e.g., user updates their profile)
  }, [styleProfile.archetype])

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

            <div className="mt-6 space-y-2 rounded-lg border border-border/60 bg-muted/10 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">Recommended brands</p>
                  <p className="text-xs text-muted-foreground">
                    Prototype — we’ll auto-suggest based on your profile soon. Add any you like.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={loadRecommendedBrands}
                  disabled={isLoadingRecommendations}
                >
                  {isLoadingRecommendations ? "Refreshing..." : "Refresh"}
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {isLoadingRecommendations &&
                  Array.from({ length: 3 }).map((_, idx) => (
                    <div
                      key={`rec-skeleton-${idx}`}
                      className="h-[84px] rounded-md border border-dashed border-muted bg-background/40 animate-pulse"
                    />
                  ))}

                {!isLoadingRecommendations &&
                  recommendedBrands.map((brand) => {
                    const isSaved = favoriteBrands.includes(brand.name)
                    return (
                      <div
                        key={brand.name}
                        className="flex items-start justify-between gap-2 rounded-md border border-border bg-background/60 p-3"
                      >
                        <div className="space-y-1">
                          <p className="font-semibold leading-tight">{brand.name}</p>
                          <p className="text-xs text-muted-foreground">{brand.reason}</p>
                        </div>
                        <Button
                          size="sm"
                          variant={isSaved ? "outline" : "secondary"}
                          disabled={isSaving || isSaved}
                          onClick={() => saveBrand(brand.name)}
                          className="text-xs"
                        >
                          {isSaved ? "Saved" : "Add"}
                        </Button>
                      </div>
                    )
                  })}
              </div>
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
                    saveBrand(newBrandName, {
                      onSuccess: () => {
                        setNewBrandName("")
                        setIsAddBrandModalOpen(false)
                      },
                    })
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
            <Button
              onClick={() =>
                saveBrand(newBrandName, {
                  onSuccess: () => {
                    setNewBrandName("")
                    setIsAddBrandModalOpen(false)
                  },
                })
              }
              disabled={isSaving || !newBrandName.trim()}
            >
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
