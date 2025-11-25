import { Badge } from "@/components/ui/badge"

const colorPalette = [
  { name: "Burnt Sienna", hex: "#E97451" },
  { name: "Olive Green", hex: "#6B8E23" },
  { name: "Rust Orange", hex: "#B7410E" },
  { name: "Warm Taupe", hex: "#C9A88D" },
  { name: "Deep Burgundy", hex: "#800020" },
  { name: "Golden Ochre", hex: "#CC7722" },
]

const styleStats = [
  { label: "Contrast", value: "High" },
  { label: "Undertone", value: "Warm" },
  { label: "Season", value: "Autumn" },
  { label: "Face Shape", value: "Oval" },
]

export function StyleDnaSummary() {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 flex-1">
      {/* Color Palette - Compact */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <span className="text-xs sm:text-sm font-medium text-muted-foreground">Colors:</span>
        <div className="flex gap-1.5 sm:gap-2">
          {colorPalette.slice(0, 6).map((color) => (
            <div
              key={color.hex}
              className="h-5 w-5 sm:h-6 sm:w-6 rounded-full border border-border/50 shadow-sm"
              style={{ backgroundColor: color.hex }}
              title={color.name}
            />
          ))}
        </div>
      </div>

      {/* Style Stats - Compact */}
      <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
        {styleStats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">{stat.label}:</span>
            <span className="text-xs text-muted-foreground sm:hidden">{stat.label.split(" ")[0]}:</span>
            <Badge variant="outline" className="text-xs border-border/50">
              {stat.value}
            </Badge>
          </div>
        ))}
      </div>

      <Badge variant="outline" className="border-primary/50 text-primary flex-shrink-0 text-xs">
        Analyzed
      </Badge>
    </div>
  )
}
