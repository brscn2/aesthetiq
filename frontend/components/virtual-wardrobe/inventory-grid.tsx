"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useApi } from "@/lib/api"
import { Category, WardrobeItem } from "@/types/api"
import { colorMatchesFilter } from "@/lib/colors"
import { ItemDetailModal } from "./item-detail-modal"

// Temporary userId - in production, get from auth context
const TEMP_USER_ID = "507f1f77bcf86cd799439011" // Replace with actual user ID from auth

interface WardrobeFilters {
  category: Category | null
  brand: string | null
  color: string | null
}

interface InventoryGridProps {
  searchQuery?: string
  filters?: WardrobeFilters
}

interface ItemCardProps {
  item: WardrobeItem
  onClick: () => void
}

function ItemCard({ item, onClick }: ItemCardProps) {
  return (
    <Card 
      className="group relative overflow-hidden border-border bg-card transition-all hover:border-purple-500/30 hover:bg-accent cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-md bg-muted">
          {/* Checkerboard pattern for transparent backgrounds */}
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
        <span className="font-serif text-sm font-medium text-foreground">
          {item.brand || "Unknown Brand"}
        </span>
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

export function InventoryGrid({ searchQuery, filters }: InventoryGridProps) {
  const { wardrobeApi } = useApi()
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Fetch all items (without search) to know if wardrobe is truly empty
  const { data: allItems } = useQuery({
    queryKey: ["wardrobe", TEMP_USER_ID],
    queryFn: () => wardrobeApi.getAll(TEMP_USER_ID),
  })
  
  const { data: wardrobeItems, isLoading, error } = useQuery({
    queryKey: ["wardrobe", TEMP_USER_ID, searchQuery, filters],
    queryFn: () => wardrobeApi.getAll(TEMP_USER_ID, undefined, undefined, searchQuery),
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
  })
  
  const hasSearchOrFilters = !!(searchQuery || filters?.category || filters?.brand || filters?.color)

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

  // Sort items by creation date (newest first)
  const sortedItems = [...(wardrobeItems || [])].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime()
    const dateB = new Date(b.createdAt || 0).getTime()
    return dateB - dateA // Newest first
  })

  // Apply filters
  const filteredItems = sortedItems.filter((item: WardrobeItem) => {
    // Category filter
    if (filters?.category) {
      if (item.category !== filters.category) return false
    }
    // Brand filter
    if (filters?.brand) {
      if (!item.brand || item.brand !== filters.brand) return false
    }
    // Color filter (with tolerance matching) - check against colors array
    if (filters?.color) {
      const itemColors = item.colors || []
      if (itemColors.length === 0) return false
      // Check if any of the item's colors match the filter
      const hasMatchingColor = itemColors.some(color => colorMatchesFilter(color, filters.color!))
      if (!hasMatchingColor) return false
    }
    return true
  })

  // Group items by category
  const tops = filteredItems.filter((item: WardrobeItem) => item.category === Category.TOP)
  const bottoms = filteredItems.filter((item: WardrobeItem) => item.category === Category.BOTTOM)
  const footwear = filteredItems.filter((item: WardrobeItem) => item.category === Category.SHOE)
  const accessories = filteredItems.filter((item: WardrobeItem) => item.category === Category.ACCESSORY)

  return (
    <div className="space-y-10 pb-10">
      {tops.length > 0 && (
        <section>
          <h2 className="mb-6 font-serif text-2xl font-light text-foreground">Tops</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {tops.map((item: WardrobeItem) => (
              <ItemCard 
                key={item._id} 
                item={item} 
                onClick={() => {
                  setSelectedItem(item)
                  setIsModalOpen(true)
                }}
              />
            ))}
          </div>
        </section>
      )}

      {bottoms.length > 0 && (
        <section>
          <h2 className="mb-6 font-serif text-2xl font-light text-foreground">Bottoms</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {bottoms.map((item: WardrobeItem) => (
              <ItemCard 
                key={item._id} 
                item={item}
                onClick={() => {
                  setSelectedItem(item)
                  setIsModalOpen(true)
                }}
              />
            ))}
          </div>
        </section>
      )}

      {footwear.length > 0 && (
        <section>
          <h2 className="mb-6 font-serif text-2xl font-light text-foreground">Footwear</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {footwear.map((item: WardrobeItem) => (
              <ItemCard 
                key={item._id} 
                item={item}
                onClick={() => {
                  setSelectedItem(item)
                  setIsModalOpen(true)
                }}
              />
            ))}
          </div>
        </section>
      )}

      {accessories.length > 0 && (
        <section>
          <h2 className="mb-6 font-serif text-2xl font-light text-foreground">Accessories</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {accessories.map((item: WardrobeItem) => (
              <ItemCard 
                key={item._id} 
                item={item}
                onClick={() => {
                  setSelectedItem(item)
                  setIsModalOpen(true)
                }}
              />
            ))}
          </div>
        </section>
      )}

      {(!allItems || allItems.length === 0) && !hasSearchOrFilters && (
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

      {allItems && allItems.length > 0 && filteredItems.length === 0 && (
        <section>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="mb-4 font-serif text-xl text-muted-foreground">
              No items match your filters
            </p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </div>
        </section>
      )}

      <ItemDetailModal
        item={selectedItem}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  )
}
