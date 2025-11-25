"use client"

import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { wardrobeApi } from "@/lib/api"
import { Category, WardrobeItem } from "@/types/api"
import { formatDistanceToNow } from "date-fns"

interface ClothingItem {
  id: string
  image: string
  brand: string
  lastWorn: string
  isNew?: boolean
  isProcessing?: boolean
}

// Temporary userId - in production, get from auth context
const TEMP_USER_ID = "507f1f77bcf86cd799439011" // Replace with actual user ID from auth

function ItemCard({ item }: { item: WardrobeItem }) {
  const lastWornText = item.lastWorn
    ? formatDistanceToNow(new Date(item.lastWorn), { addSuffix: true })
    : "Never"

  return (
    <Card className="group relative overflow-hidden border-border bg-card transition-all hover:border-purple-500/30 hover:bg-accent">
      <CardContent className="p-4">
        <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-md bg-muted">
          <div className="absolute inset-0 flex items-center justify-center p-4 opacity-90 transition-transform duration-500 group-hover:scale-105">
            <Image
              src={item.processedImageUrl || item.imageUrl || "/placeholder.svg"}
              alt={item.brand || "Clothing item"}
              width={200}
              height={200}
              className="h-full w-full object-contain dark:mix-blend-screen"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-serif text-sm font-medium text-foreground">
            {item.brand || "Unknown Brand"}
          </span>
          <span className="text-[10px] text-muted-foreground">{lastWornText}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {[...Array(5)].map((_, i) => (
        <Card key={i} className="border-border bg-card">
          <CardContent className="p-4">
            <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-md bg-muted">
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
              </div>
            </div>
            <div className="h-4 w-20 rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function InventoryGrid() {
  const { data: wardrobeItems, isLoading, error } = useQuery({
    queryKey: ["wardrobe", TEMP_USER_ID],
    queryFn: () => wardrobeApi.getAll(TEMP_USER_ID),
  })

  if (isLoading) {
    return (
      <div className="space-y-10 pb-10">
        <section>
          <h2 className="mb-6 font-serif text-2xl font-light text-foreground">Loading...</h2>
          <LoadingSkeleton />
        </section>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-10 pb-10">
        <section>
          <h2 className="mb-6 font-serif text-2xl font-light text-foreground">
            Error loading wardrobe
          </h2>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : "Failed to load wardrobe items"}
          </p>
        </section>
      </div>
    )
  }

  // Group items by category
  const tops = wardrobeItems?.filter((item: WardrobeItem) => item.category === Category.TOP) || []
  const bottoms = wardrobeItems?.filter((item: WardrobeItem) => item.category === Category.BOTTOM) || []
  const footwear = wardrobeItems?.filter((item: WardrobeItem) => item.category === Category.SHOE) || []
  const accessories = wardrobeItems?.filter((item: WardrobeItem) => item.category === Category.ACCESSORY) || []

  return (
    <div className="space-y-10 pb-10">
      {tops.length > 0 && (
        <section>
          <h2 className="mb-6 font-serif text-2xl font-light text-foreground">Tops</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {tops.map((item: WardrobeItem) => (
              <ItemCard key={item._id} item={item} />
            ))}
          </div>
        </section>
      )}

      {bottoms.length > 0 && (
        <section>
          <h2 className="mb-6 font-serif text-2xl font-light text-foreground">Bottoms</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {bottoms.map((item: WardrobeItem) => (
              <ItemCard key={item._id} item={item} />
            ))}
          </div>
        </section>
      )}

      {footwear.length > 0 && (
        <section>
          <h2 className="mb-6 font-serif text-2xl font-light text-foreground">Footwear</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {footwear.map((item: WardrobeItem) => (
              <ItemCard key={item._id} item={item} />
            ))}
          </div>
        </section>
      )}

      {accessories.length > 0 && (
        <section>
          <h2 className="mb-6 font-serif text-2xl font-light text-foreground">Accessories</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {accessories.map((item: WardrobeItem) => (
              <ItemCard key={item._id} item={item} />
            ))}
          </div>
        </section>
      )}

      {wardrobeItems?.length === 0 && (
        <section>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="mb-4 font-serif text-xl text-muted-foreground">
              Your wardrobe is empty
            </p>
            <p className="text-sm text-muted-foreground">
              Add your first item to get started
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
