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
  const shoeImage = getItemImage(outfit.items.shoe)
  const accessoryImages = outfit.items.accessories
    .map(getItemImage)
    .filter((img): img is string => img !== null)
    .slice(0, 2)

  const hasDeletedItems = 
    isItemDeleted(outfit.items.top) ||
    isItemDeleted(outfit.items.bottom) ||
    isItemDeleted(outfit.items.shoe) ||
    outfit.items.accessories.some(isItemDeleted)

  return (
    <Card 
      className="group relative overflow-hidden border-border bg-card transition-all hover:border-purple-500/30 hover:bg-accent cursor-pointer"
      onClick={onView}
    >
      <CardContent className="p-4">
        {/* Thumbnail Grid */}
        <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-md bg-muted">
          <div className="grid grid-cols-2 grid-rows-2 gap-1 h-full p-2">
            {/* Top */}
            <div className="flex items-center justify-center bg-background/50 rounded">
              {topImage ? (
                <Image src={topImage} alt="Top" width={80} height={80} className="object-contain h-full w-full p-1" />
              ) : (
                <span className="text-xs text-muted-foreground">Top</span>
              )}
            </div>
            {/* Bottom */}
            <div className="flex items-center justify-center bg-background/50 rounded">
              {bottomImage ? (
                <Image src={bottomImage} alt="Bottom" width={80} height={80} className="object-contain h-full w-full p-1" />
              ) : (
                <span className="text-xs text-muted-foreground">Bottom</span>
              )}
            </div>
            {/* Shoe */}
            <div className="flex items-center justify-center bg-background/50 rounded">
              {shoeImage ? (
                <Image src={shoeImage} alt="Shoe" width={80} height={80} className="object-contain h-full w-full p-1" />
              ) : (
                <span className="text-xs text-muted-foreground">Shoe</span>
              )}
            </div>
            {/* Accessory */}
            <div className="flex items-center justify-center bg-background/50 rounded">
              {accessoryImages[0] ? (
                <Image src={accessoryImages[0]} alt="Accessory" width={80} height={80} className="object-contain h-full w-full p-1" />
              ) : (
                <span className="text-xs text-muted-foreground">Acc</span>
              )}
            </div>
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
