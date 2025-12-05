"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@clerk/nextjs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useApi } from "@/lib/api"
import { toast } from "sonner"
import { Ruler } from "lucide-react"

interface DetailedMeasurementsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentSizes?: {
    top?: string
    bottom?: string
    shoe?: string
  }
  onSizesUpdate?: () => void
}

interface BodyMeasurements {
  chest?: string
  waist?: string
  hips?: string
  inseam?: string
  shoulder?: string
  sleeve?: string
}

type SizeRegion = "EU" | "US" | "UK"

const SIZE_OPTIONS: Record<SizeRegion, {
  top: string[]
  bottom: string[]
  shoe: string[]
}> = {
  EU: {
    top: ["XS", "S", "M", "L", "XL", "XXL", "3X"],
    bottom: ["38", "40", "42", "44", "46", "48", "50", "52"],
    shoe: ["38", "39", "40", "41", "42", "43", "44", "45", "46"],
  },
  US: {
    top: ["XS", "S", "M", "L", "XL", "XXL", "3X"],
    bottom: ["24", "26", "28", "30", "32", "34", "36", "38"],
    shoe: ["5", "6", "7", "8", "9", "10", "11", "12", "13"],
  },
  UK: {
    top: ["XS", "S", "M", "L", "XL", "XXL", "3X"],
    bottom: ["24", "26", "28", "30", "32", "34", "36", "38"],
    shoe: ["3", "4", "5", "6", "7", "8", "9", "10", "11"],
  },
}

export function DetailedMeasurements({
  open,
  onOpenChange,
  currentSizes,
  onSizesUpdate,
}: DetailedMeasurementsProps) {
  const { userId } = useAuth()
  const { styleProfileApi } = useApi()

  const [region, setRegion] = useState<SizeRegion | "">("")
  const [sizes, setSizes] = useState({
    top: currentSizes?.top || "",
    bottom: currentSizes?.bottom || "",
    shoe: currentSizes?.shoe || "",
  })

  const [measurements, setMeasurements] = useState<BodyMeasurements>({
    chest: "",
    waist: "",
    hips: "",
    inseam: "",
    shoulder: "",
    sleeve: "",
  })

  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (currentSizes) {
      setSizes({
        top: currentSizes.top || "",
        bottom: currentSizes.bottom || "",
        shoe: currentSizes.shoe || "",
      })
    }
  }, [currentSizes])

  // Reset sizes when region changes
  useEffect(() => {
    if (region) {
      setSizes({
        top: "",
        bottom: "",
        shoe: "",
      })
    }
  }, [region])

  const handleSizeChange = (type: "top" | "bottom" | "shoe", value: string) => {
    setSizes((prev) => ({ ...prev, [type]: value }))
  }

  const handleMeasurementChange = (field: keyof BodyMeasurements, value: string) => {
    setMeasurements((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!userId) {
      toast.error("You must be logged in to save measurements")
      return
    }

    setIsLoading(true)
    try {
      // Try to get current style profile
      let styleProfile
      try {
        styleProfile = await styleProfileApi.getByUserId()
      } catch (error: any) {
        // If profile doesn't exist (404), create it
        // If it's a 401 error, re-throw it
        if (error?.response?.status === 401) {
          throw error
        }
        // For 404 or other errors, create a new profile
        // Filter out empty size values
        const filteredSizes = Object.fromEntries(
          Object.entries(sizes).filter(([_, value]) => value && value.trim() !== "")
        )
        styleProfile = await styleProfileApi.create({
          archetype: "Minimalist",
          sizes: Object.keys(filteredSizes).length > 0 ? filteredSizes : undefined,
        })
      }

      // Update with new sizes (upsert will handle if profile exists)
      // Filter out empty size values to avoid overwriting saved sizes
      const filteredSizes = Object.fromEntries(
        Object.entries(sizes).filter(([_, value]) => value && value.trim() !== "")
      )
      await styleProfileApi.updateByUserId({
        sizes: Object.keys(filteredSizes).length > 0 ? filteredSizes : undefined,
      })

      toast.success("Measurements saved successfully")
      onSizesUpdate?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error saving measurements:", error)
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to save measurements"
      const statusCode = error?.response?.status
      
      if (statusCode === 401) {
        toast.error("Authentication failed. Please log in again.")
      } else {
        toast.error(`Failed to save measurements: ${errorMessage}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getSizeOptions = () => {
    if (!region) return { top: [], bottom: [], shoe: [] }
    return SIZE_OPTIONS[region]
  }

  const sizeOptions = getSizeOptions()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-2xl">
            <Ruler className="h-5 w-5" />
            Detailed Measurements
          </DialogTitle>
          <DialogDescription>
            Update your sizes and body measurements for better fit recommendations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Size Selection */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Size Selection</h3>
            
            {/* Region Selection */}
            <div className="space-y-2">
              <Label htmlFor="region">Size Region</Label>
              <Select value={region} onValueChange={(value) => setRegion(value as SizeRegion)}>
                <SelectTrigger id="region">
                  <SelectValue placeholder="Select region (EU/US/UK)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EU">EU (European)</SelectItem>
                  <SelectItem value="US">US (United States)</SelectItem>
                  <SelectItem value="UK">UK (United Kingdom)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="top-size">Top Size {region && `(${region})`}</Label>
                <Select 
                  value={sizes.top} 
                  onValueChange={(value) => handleSizeChange("top", value)}
                  disabled={!region}
                >
                  <SelectTrigger id="top-size">
                    <SelectValue placeholder={region ? "Select size" : "Select region first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {sizeOptions.top.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bottom-size">Bottom Size {region && `(${region})`}</Label>
                <Select 
                  value={sizes.bottom} 
                  onValueChange={(value) => handleSizeChange("bottom", value)}
                  disabled={!region}
                >
                  <SelectTrigger id="bottom-size">
                    <SelectValue placeholder={region ? "Select size" : "Select region first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {sizeOptions.bottom.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shoe-size">Shoe Size {region && `(${region})`}</Label>
                <Select 
                  value={sizes.shoe} 
                  onValueChange={(value) => handleSizeChange("shoe", value)}
                  disabled={!region}
                >
                  <SelectTrigger id="shoe-size">
                    <SelectValue placeholder={region ? "Select size" : "Select region first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {sizeOptions.shoe.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Body Measurements */}
          <div className="space-y-4 border-t border-border pt-4">
            <h3 className="font-semibold text-lg">Body Measurements (Optional)</h3>
            <p className="text-sm text-muted-foreground">
              Add your body measurements for more accurate size recommendations
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="chest">Chest (cm/in)</Label>
                <Input
                  id="chest"
                  type="text"
                  placeholder="e.g., 100cm or 39in"
                  value={measurements.chest}
                  onChange={(e) => handleMeasurementChange("chest", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="waist">Waist (cm/in)</Label>
                <Input
                  id="waist"
                  type="text"
                  placeholder="e.g., 80cm or 31in"
                  value={measurements.waist}
                  onChange={(e) => handleMeasurementChange("waist", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hips">Hips (cm/in)</Label>
                <Input
                  id="hips"
                  type="text"
                  placeholder="e.g., 95cm or 37in"
                  value={measurements.hips}
                  onChange={(e) => handleMeasurementChange("hips", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inseam">Inseam (cm/in)</Label>
                <Input
                  id="inseam"
                  type="text"
                  placeholder="e.g., 80cm or 31in"
                  value={measurements.inseam}
                  onChange={(e) => handleMeasurementChange("inseam", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shoulder">Shoulder Width (cm/in)</Label>
                <Input
                  id="shoulder"
                  type="text"
                  placeholder="e.g., 45cm or 18in"
                  value={measurements.shoulder}
                  onChange={(e) => handleMeasurementChange("shoulder", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sleeve">Sleeve Length (cm/in)</Label>
                <Input
                  id="sleeve"
                  type="text"
                  placeholder="e.g., 60cm or 24in"
                  value={measurements.sleeve}
                  onChange={(e) => handleMeasurementChange("sleeve", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Measurements"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

