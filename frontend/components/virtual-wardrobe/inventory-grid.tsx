import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface ClothingItem {
  id: string
  image: string
  brand: string
  lastWorn: string
  isNew?: boolean
  isProcessing?: boolean
}

const tops: ClothingItem[] = [
  {
    id: "1",
    image: "/white-silk-blouse-flat-lay-minimal.jpg",
    brand: "Totême",
    lastWorn: "2 days ago",
  },
  {
    id: "2",
    image: "/black-turtleneck-sweater-luxury.jpg",
    brand: "The Row",
    lastWorn: "1 week ago",
  },
  {
    id: "3",
    image: "/oversized-beige-blazer-minimalist.jpg",
    brand: "Frankie Shop",
    lastWorn: "Yesterday",
  },
  {
    id: "4",
    image: "/striped-button-down-shirt.jpg",
    brand: "Zara",
    lastWorn: "3 weeks ago",
    isProcessing: true,
  },
]

const bottoms: ClothingItem[] = [
  {
    id: "5",
    image: "/black-tailored-trousers-flat-lay.jpg",
    brand: "COS",
    lastWorn: "4 days ago",
  },
  {
    id: "6",
    image: "/vintage-blue-jeans-levis.jpg",
    brand: "Levi's",
    lastWorn: "2 weeks ago",
  },
  {
    id: "7",
    image: "/silk-midi-skirt-champagne.jpg",
    brand: "Anine Bing",
    lastWorn: "1 month ago",
    isNew: true,
  },
]

const footwear: ClothingItem[] = [
  {
    id: "8",
    image: "/minimalist-white-sneakers.jpg",
    brand: "Common Projects",
    lastWorn: "Yesterday",
  },
  {
    id: "9",
    image: "/black-leather-boots.png",
    brand: "Acne Studios",
    lastWorn: "5 days ago",
  },
]

function ItemCard({ item }: { item: ClothingItem }) {
  return (
    <Card className="group relative overflow-hidden border-white/5 bg-white/5 transition-all hover:border-purple-500/30 hover:bg-white/10">
      <CardContent className="p-4">
        {item.isNew && (
          <Badge className="absolute right-3 top-3 z-10 bg-purple-500 text-[10px] text-white hover:bg-purple-600">
            NEW
          </Badge>
        )}
        {item.isProcessing && (
          <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[10px] text-white backdrop-blur-md">
            <Loader2 className="h-3 w-3 animate-spin text-purple-400" />
            Scanning
          </div>
        )}
        <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-md bg-[#1a1a1a]">
          <div className="absolute inset-0 flex items-center justify-center p-4 opacity-90 transition-transform duration-500 group-hover:scale-105">
            <Image
              src={item.image || "/placeholder.svg"}
              alt={item.brand}
              width={200}
              height={200}
              className="h-full w-full object-contain mix-blend-screen"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-serif text-sm font-medium text-white">{item.brand}</span>
          <span className="text-[10px] text-muted-foreground">{item.lastWorn}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function InventoryGrid() {
  return (
    <div className="space-y-10 pb-10">
      <section>
        <h2 className="mb-6 font-serif text-2xl font-light text-white">Tops</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {tops.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-6 font-serif text-2xl font-light text-white">Bottoms</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {bottoms.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-6 font-serif text-2xl font-light text-white">Footwear</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {footwear.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  )
}
