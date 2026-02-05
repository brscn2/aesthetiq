"use client"

import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, Pencil, Trash2, AlertCircle, ShoppingBag } from "lucide-react"
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
    { label: "Top", image: topImage, hasItem: !!outfit.items.top },
    { label: "Bottom", image: bottomImage, hasItem: !!outfit.items.bottom },
    { label: "Outerwear", image: outerwearImage, hasItem: !!outfit.items.outerwear },
    { label: "Footwear", image: footwearImage, hasItem: !!outfit.items.footwear },
    { label: "Dress", image: dressImage, hasItem: !!outfit.items.dress },
    ...outfit.items.accessories.map((item, index) => ({
      label: `Acc ${index + 1}`,
      image: getItemImage(item),
      hasItem: !!item,
    })).slice(0, 5), // Limit total accessories to prevent layout break
  ].filter((item) => item.hasItem)

  const totalItems = Math.max(gridItems.length, 1)
  const columns = totalItems <= 2 ? totalItems : totalItems <= 4 ? 2 : 3
  const rows = Math.ceil(totalItems / columns)

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
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            }}
          >
            {gridItems.map((item, index) => (
              <div key={`${item.label}-${index}`} className="flex items-center justify-center bg-background/50 rounded overflow-hidden">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.label}
                    width={80}
                    height={80}
                    className="object-contain h-full w-full p-1"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full w-full p-1 text-muted-foreground/50">
                    <ShoppingBag className="h-4 w-4 mb-1" />
                    <span className="text-[9px] font-medium uppercase tracking-tighter truncate w-full text-center">{item.label}</span>
                  </div>
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
