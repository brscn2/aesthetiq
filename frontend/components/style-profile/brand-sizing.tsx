"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DetailedMeasurements } from "./detailed-measurements"
import { useApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { StyleProfile } from "@/types/api"

interface BrandSizingProps {
  styleProfile: StyleProfile
  onProfileUpdate?: () => void
}

export function BrandSizing({ styleProfile, onProfileUpdate }: BrandSizingProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const sizes = styleProfile.sizes || {}

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
              {["COS", "Arket", "Acne Studios", "Totême"].map((brand) => (
                <div
                  key={brand}
                  className="flex aspect-[3/2] items-center justify-center rounded-lg border border-border bg-background/50 p-4 text-center font-serif text-lg font-medium shadow-sm transition-colors hover:border-primary/50"
                >
                  {brand}
                </div>
              ))}
              <div className="flex aspect-[3/2] cursor-pointer items-center justify-center rounded-lg border border-dashed border-muted bg-transparent p-4 text-center text-sm text-muted-foreground hover:bg-muted/10">
                + Add Brand
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
