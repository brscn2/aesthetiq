"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { ColorOption, WARDROBE_COLORS } from "@/lib/colors"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ColorSelectorProps {
  value?: string
  onChange: (color: string) => void
  colors?: ColorOption[]
  showCustomInput?: boolean
}

export function ColorSelector({
  value,
  onChange,
  colors = WARDROBE_COLORS,
  showCustomInput = true,
}: ColorSelectorProps) {
  const isColorSelected = (colorHex: string) => {
    return value?.toLowerCase() === colorHex.toLowerCase()
  }

  const handleColorClick = (colorHex: string) => {
    onChange(colorHex)
  }

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const customColor = e.target.value
    if (customColor && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(customColor)) {
      onChange(customColor)
    }
  }

  return (
    <div className="space-y-4">
      {/* Color Grid */}
      <div className="grid grid-cols-7 gap-2">
        {colors.map((color) => {
          const selected = isColorSelected(color.hex)
          const isLight = isLightColor(color.hex)

          return (
            <button
              key={color.hex}
              type="button"
              onClick={() => handleColorClick(color.hex)}
              className={cn(
                "relative h-10 w-10 rounded-full border-2 transition-all hover:scale-110",
                selected
                  ? "border-purple-500 ring-2 ring-purple-500 ring-offset-2 ring-offset-background"
                  : "border-border hover:border-purple-300"
              )}
              style={{ backgroundColor: color.hex }}
              title={color.name}
              aria-label={`Select ${color.name}`}
            >
              {selected && (
                <Check
                  className={cn(
                    "absolute inset-0 m-auto h-5 w-5",
                    isLight ? "text-black" : "text-white"
                  )}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Custom Hex Input */}
      {showCustomInput && (
        <div className="space-y-2">
          <Label htmlFor="custom-color" className="text-xs uppercase tracking-wider text-muted-foreground">
            Or enter custom hex
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="custom-color"
              type="text"
              placeholder="#000000"
              value={value || ""}
              onChange={handleCustomColorChange}
              className="border-border bg-card text-foreground"
              pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
            />
            {value && (
              <div
                className="h-10 w-10 flex-shrink-0 rounded-full border-2 border-border"
                style={{ backgroundColor: value }}
                aria-label="Selected color preview"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Determines if a color is light or dark based on its hex value
 * Used to determine if check mark should be black or white
 */
function isLightColor(hex: string): boolean {
  // Remove # if present
  const color = hex.replace("#", "")

  // Convert to RGB
  const r = parseInt(color.substring(0, 2), 16)
  const g = parseInt(color.substring(2, 4), 16)
  const b = parseInt(color.substring(4, 6), 16)

  // Calculate relative luminance using the formula from WCAG
  // https://www.w3.org/TR/WCAG20/#relativeluminancedef
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Return true if luminance is greater than 0.5 (light color)
  return luminance > 0.5
}
