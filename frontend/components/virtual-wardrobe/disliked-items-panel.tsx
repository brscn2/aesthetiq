"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useApi } from "@/lib/api"
import type { DislikedWardrobeItemEntry } from "@/types/api"

const PAGE_SIZE = 20

export function DislikedItemsPanel() {
  const { wardrobeApi } = useApi()
  const [items, setItems] = useState<DislikedWardrobeItemEntry[]>([])
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const fetchPage = async (nextOffset: number, replace = false) => {
    setIsLoading(true)
    try {
      const res = await wardrobeApi.getDislikedFeedback(PAGE_SIZE, nextOffset)
      setTotal(res.total || 0)
      setItems((prev) => (replace ? res.items : [...prev, ...res.items]))
      setOffset(nextOffset)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPage(0, true)
  }, [])

  const handleDelete = async (itemId: string) => {
    await wardrobeApi.deleteFeedback(itemId)
    setItems((prev) => prev.filter((entry) => entry.item._id !== itemId))
    setTotal((prev) => Math.max(prev - 1, 0))
  }

  const hasMore = items.length < total

  if (!items.length && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card/50 p-10 text-center">
        <p className="text-sm text-muted-foreground">No disliked wardrobe items yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((entry) => {
          const item = entry.item
          const title = [item.brand, item.subCategory].filter(Boolean).join(" · ") || "Wardrobe Item"
          const subtitle = item.category
          const imageUrl = item.processedImageUrl || item.imageUrl

          return (
            <div
              key={item._id}
              className="rounded-lg border border-border bg-card/50 p-4 shadow-sm"
            >
              <div className="mb-3 aspect-square overflow-hidden rounded-md bg-muted">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    No image
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground line-clamp-1">{title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{subtitle}</p>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(item._id)}
                >
                  Neutral
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleDelete(item._id)}
                >
                  Like
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchPage(offset + PAGE_SIZE)}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  )
}
