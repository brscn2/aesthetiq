import Image from "next/image"
import { TrendingUp, Heart } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

const trendingItems = [
  {
    id: 1,
    title: "Linen Blazer",
    category: "Trending Now",
    image: "/placeholder.svg?key=blazer",
    price: "$245",
  },
  {
    id: 2,
    title: "Silk Midi Skirt",
    category: "Trending Now",
    image: "/placeholder.svg?key=skirt",
    price: "$189",
  },
  {
    id: 3,
    title: "Leather Loafers",
    category: "Trending Now",
    image: "/placeholder.svg?key=loafers",
    price: "$320",
  },
]

const wardrobeItems = [
  {
    id: 1,
    title: "Camel Trench Coat",
    brand: "Burberry",
    image: "/placeholder.svg?key=trench",
    worn: "3 times this month",
  },
  {
    id: 2,
    title: "Black Ankle Boots",
    brand: "Stuart Weitzman",
    image: "/placeholder.svg?key=boots",
    worn: "5 times this month",
  },
  {
    id: 3,
    title: "Silk Blouse",
    brand: "Equipment",
    image: "/placeholder.svg?key=blouse",
    worn: "2 times this month",
  },
]

export function TrendsSidebar() {
  return (
    <div className="flex h-full w-80 flex-col border-l border-border bg-card/30 backdrop-blur-sm">
      <ScrollArea className="flex-1 min-h-0">
        {/* Trending Now Section */}
        <div className="p-4">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Trending Now</h3>
          </div>
          <div className="space-y-3">
            {trendingItems.map((item) => (
              <Card
                key={item.id}
                className="group cursor-pointer overflow-hidden border-border/50 bg-card transition-all hover:border-primary/50 hover:shadow-lg"
              >
                <div className="relative aspect-square w-full overflow-hidden">
                  <Image
                    src={item.image || "/placeholder.svg"}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <CardContent className="p-3">
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="text-sm text-primary">{item.price}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Separator className="bg-border/50" />

        {/* From Your Closet Section */}
        <div className="p-4 pb-6">
          <div className="mb-4 flex items-center gap-2">
            <Heart className="h-5 w-5 text-accent" />
            <h3 className="font-semibold text-foreground">From Your Closet</h3>
          </div>
          <div className="space-y-3">
            {wardrobeItems.map((item) => (
              <Card
                key={item.id}
                className="group cursor-pointer overflow-hidden border-border/50 bg-card transition-all hover:border-accent/50"
              >
                <div className="flex gap-3 p-3">
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md">
                    <Image src={item.image || "/placeholder.svg"} alt={item.title} fill className="object-cover" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.brand}</p>
                    <Badge variant="outline" className="mt-1 w-fit text-xs">
                      {item.worn}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
