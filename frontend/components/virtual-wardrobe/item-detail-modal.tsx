"use client"

import { useState } from "react"
import Image from "next/image"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Calendar, Palette, Shirt, Loader2, Sparkles, MessageSquare } from "lucide-react"
import { WardrobeItem, Category } from "@/types/api"
import { useApi } from "@/lib/api"
import { getClosestColorName } from "@/lib/colors"
import { getBestMatchingPalettes, getPaletteDisplayName, formatScore, getScoreBgColor, getScoreColor } from "@/lib/seasonal-colors"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

interface ItemDetailModalProps {
  item: WardrobeItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CATEGORY_LABELS: Record<Category, string> = {
  [Category.TOP]: "Top",
  [Category.BOTTOM]: "Bottom",
  [Category.SHOE]: "Footwear",
  [Category.ACCESSORY]: "Accessory",
}

export function ItemDetailModal({ item, open, onOpenChange }: ItemDetailModalProps) {
  const { wardrobeApi } = useApi()
  const queryClient = useQueryClient()
  const [isDeleting, setIsDeleting] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: (id: string) => wardrobeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wardrobe"] })
      toast.success("Item deleted successfully")
      onOpenChange(false)
    },
    onError: (error) => {
      console.error("Failed to delete item:", error)
      toast.error("Failed to delete item")
    },
  })

  const handleDelete = async () => {
    if (!item) return
    
    setIsDeleting(true)
    try {
      await deleteMutation.mutateAsync(item._id)
    } finally {
      setIsDeleting(false)
    }
  }

  if (!item) return null

  const createdDate = item.createdAt ? format(new Date(item.createdAt), "PPP") : "Unknown"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {item.brand || "Unknown Brand"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image */}
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
            {item.processedImageUrl && (
              <div 
                className="absolute inset-0"
                style={{
                  backgroundImage: 'linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)',
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                  opacity: 0.05
                }}
              />
            )}
            <Image
              src={item.processedImageUrl || item.imageUrl || "/placeholder.svg"}
              alt={item.brand || "Clothing item"}
              fill
              className="object-contain p-4"
            />
          </div>

          {/* Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Shirt className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Category:</span>
              <Badge variant="secondary">{CATEGORY_LABELS[item.category]}</Badge>
              {item.subCategory && (
                <Badge variant="outline">{item.subCategory}</Badge>
              )}
            </div>

            {item.colors && item.colors.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Colors:</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {item.colors.map((color, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-border bg-card"
                    >
                      <div
                        className="h-3 w-3 rounded-full border border-border"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs">{getClosestColorName(color)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Added:</span>
              <span>{createdDate}</span>
            </div>

            {/* Style Notes */}
            {item.notes && (
              <div className="flex items-start gap-2 text-sm">
                <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-muted-foreground">Style Notes:</span>
                  <p className="text-foreground mt-1">{item.notes}</p>
                </div>
              </div>
            )}

            {/* Seasonal Palette Compatibility */}
            {item.seasonalPaletteScores && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Best Palettes:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {getBestMatchingPalettes(item.seasonalPaletteScores, 0.6)
                    .slice(0, 4)
                    .map(({ palette, score }) => (
                      <div
                        key={palette}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs ${getScoreBgColor(score)}`}
                      >
                        <span>{getPaletteDisplayName(palette)}</span>
                        <span className={`font-medium ${getScoreColor(score)}`}>
                          {formatScore(score)}
                        </span>
                      </div>
                    ))}
                  {getBestMatchingPalettes(item.seasonalPaletteScores, 0.6).length === 0 && (
                    <span className="text-xs text-muted-foreground">No strong matches</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Delete Button */}
          <div className="pt-4 border-t">
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Item
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
