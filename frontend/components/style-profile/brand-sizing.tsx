"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@clerk/nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DetailedMeasurements } from "./detailed-measurements"
import { useApi } from "@/lib/api"
import { Button } from "@/components/ui/button"

export function BrandSizing() {
  const { userId } = useAuth()
  const { styleProfileApi } = useApi()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [sizes, setSizes] = useState<{
    top?: string
    bottom?: string
    shoe?: string
  }>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      loadSizes()
    }
  }, [userId])

  const loadSizes = async () => {
    if (!userId) return

    setIsLoading(true)
    try {
      const profile = await styleProfileApi.getByUserId()
      setSizes(profile.sizes || {})
    } catch (error) {
      // Profile doesn't exist yet, use default empty sizes
      setSizes({})
    } finally {
      setIsLoading(false)
    }
  }

  const formatSizeValue = (size?: string) => {
    if (!size) return "Not set"
    return size
  }

  const getDisplayValue = (type: "top" | "bottom" | "shoe") => {
    const size = sizes[type]
    if (!size) return "Not set"
    
    // Format based on type
    if (type === "top") {
      return size.includes("EU") ? size : `${size} / EU ${getEUEquivalent(type, size)}`
    }
    if (type === "bottom") {
      return size.includes("EU") ? size : `${size} / EU ${getEUEquivalent(type, size)}`
    }
    if (type === "shoe") {
      return size.includes("EU") ? size : `${size} / EU ${getEUEquivalent(type, size)}`
    }
    return size
  }

  const getEUEquivalent = (type: "top" | "bottom" | "shoe", size: string): string => {
    // Simple conversion logic (can be enhanced)
    if (type === "top") {
      const usToEU: Record<string, string> = {
        XS: "32", S: "36", M: "38", L: "40", XL: "42", XXL: "44"
      }
      return usToEU[size] || "38"
    }
    if (type === "bottom") {
      const usToEU: Record<string, string> = {
        "24": "38", "26": "40", "28": "42", "30": "40", "32": "42", "34": "44", "36": "46", "38": "48"
      }
      return usToEU[size] || "40"
    }
    if (type === "shoe") {
      const usToEU: Record<string, string> = {
        "US 5": "38", "US 6": "39", "US 7": "40", "US 8": "41", "US 9": "42", "US 10": "43", "US 11": "44", "US 12": "45"
      }
      return usToEU[size] || "40"
    }
    return "40"
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
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : (
              <>
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
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <DetailedMeasurements
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        currentSizes={sizes}
        onSizesUpdate={loadSizes}
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
