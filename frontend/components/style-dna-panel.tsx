import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const colorPalette = [
  { name: "Burnt Sienna", hex: "#E97451", category: "primary" },
  { name: "Olive Green", hex: "#6B8E23", category: "primary" },
  { name: "Rust Orange", hex: "#B7410E", category: "accent" },
  { name: "Warm Taupe", hex: "#C9A88D", category: "neutral" },
  { name: "Deep Burgundy", hex: "#800020", category: "accent" },
  { name: "Golden Ochre", hex: "#CC7722", category: "primary" },
]

const styleStats = [
  { label: "Contrast Level", value: "High", icon: "contrast" },
  { label: "Undertone", value: "Warm", icon: "sun" },
  { label: "Season", value: "Autumn", icon: "leaf" },
  { label: "Face Shape", value: "Oval", icon: "user" },
]

export function StyleDnaPanel() {
  return (
    <div className="h-full space-y-4">
      {/* User Photo Card */}
      <Card className="overflow-hidden border-border/50 bg-card">
        <div className="relative aspect-[4/3] w-full">
          <Image src="/professional-portrait-photo-fashion.jpg" alt="User portrait" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 flex gap-2">
            <Badge className="bg-primary/90 text-primary-foreground backdrop-blur-sm">Autumn Palette</Badge>
            <Badge className="bg-accent/90 text-accent-foreground backdrop-blur-sm">Oval Face Shape</Badge>
          </div>
        </div>
      </Card>

      {/* Color Palette */}
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Your Best Colors</CardTitle>
          <CardDescription>Colors that complement your natural features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-3">
            {colorPalette.map((color) => (
              <div key={color.hex} className="flex flex-col items-center gap-2">
                <div
                  className="h-12 w-12 rounded-full border-2 border-border shadow-lg transition-transform hover:scale-110"
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
                <span className="text-xs text-muted-foreground">{color.name.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Style Stats */}
      <div className="grid grid-cols-2 gap-3">
        {styleStats.map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
