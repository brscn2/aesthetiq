"use client"

import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, Pencil, Trash2, AlertCircle } from "lucide-react"
import { Outfit, WardrobeItem } from "@/types/api"

interface OutfitCardProps {
  outfit: Outfit
  onEdit: () => void
  onDelete: () => void
  onToggleFavorite: () => void
  onView: () => void
}

function getItemImage(item: string | WardrobeItem | undefined): string | null {
  if (!item || typeof item === "string") return null
  return item.processedImageUrl || item.imageUrl || null
}

function isItemDeleted(item: string | WardrobeItem | undefined): boolean {
  return typeof item === "string" || item === null
}

export function OutfitCard({ outfit, onEdit, onDelete, onToggleFavorite, onView }: OutfitCardProps) {
  const topImage = getItemImage(outfit.items.top)
  const bottomImage = getItemImage(outfit.items.bottom)
  const outerwearImage = getItemImage(outfit.items.outerwear)
  const footwearImage = getItemImage(outfit.items.footwear)
  const dressImage = getItemImage(outfit.items.dress)
  const accessoryImages = outfit.items.accessories
    .map(getItemImage)
    .filter((img): img is string => img !== null)
    .slice(0, 6)

  const gridItems = [
    { label: "Top", image: topImage },
    { label: "Bottom", image: bottomImage },
    { label: "Outerwear", image: outerwearImage },
    { label: "Footwear", image: footwearImage },
    { label: "Dress", image: dressImage },
    ...accessoryImages.map((image, index) => ({
      label: `Acc ${index + 1}`,
      image,
    })),
  ].filter((item) => item.image)

  const totalItems = Math.max(gridItems.length, 1)
  const columns = totalItems <= 2 ? totalItems : totalItems <= 4 ? 2 : 3

  const hasDeletedItems = 
    isItemDeleted(outfit.items.top) ||
    isItemDeleted(outfit.items.bottom) ||
    isItemDeleted(outfit.items.outerwear) ||
    isItemDeleted(outfit.items.footwear) ||
    isItemDeleted(outfit.items.dress) ||
    outfit.items.accessories.some(isItemDeleted)

  return (
    <Card 
      className="group relative overflow-hidden border-border bg-card transition-all hover:border-purple-500/30 hover:bg-accent cursor-pointer"
      onClick={onView}
    >
      <CardContent className="p-4">
        {/* Thumbnail Grid */}
        <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-md bg-muted">
          <div
            className="grid gap-1 h-full p-2"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {gridItems.map((item, index) => (
              <div key={`${item.label}-${index}`} className="flex items-center justify-center bg-background/50 rounded">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.label}
                    width={80}
                    height={80}
                    className="object-contain h-full w-full p-1"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                )}
              </div>
            ))}
          </div>
          
          {/* Deleted Items Warning */}
          {hasDeletedItems && (
            <div className="absolute top-2 left-2 bg-yellow-500/90 text-yellow-950 rounded-full p-1" title="Some items are no longer available">
              <AlertCircle className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* Name & Actions */}
        <div className="flex items-center justify-between">
          <span className="font-serif text-sm font-medium text-foreground truncate flex-1">
            {outfit.name}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            >
              <Heart className={`h-4 w-4 ${outfit.isFavorite ? "fill-red-500 text-red-500" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
