"use client"

import { WardrobeItem } from "@/types/api"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { SingleItemTryOn } from "./single-item-tryon"

interface WardrobeItemCardProps {
  item: WardrobeItem
  personImageUrl?: string
}

export function WardrobeItemCard({ item, personImageUrl }: WardrobeItemCardProps) {
  const imageUrl = item.processedImageUrl || item.imageUrl || "/placeholder.jpg"

  return (
    <Card className="group hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="aspect-square mb-3 overflow-hidden rounded-lg bg-muted">
          <Image
            src={imageUrl}
            alt={item.name}
            width={200}
            height={200}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform"
          />
        </div>
        
        <div className="space-y-2">
          <h3 className="font-medium text-sm line-clamp-2">{item.name}</h3>
          
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              {item.category}
            </Badge>
            {item.brand && (
              <span className="text-xs text-muted-foreground">{item.brand}</span>
            )}
          </div>
          
          {item.colors && item.colors.length > 0 && (
            <div className="flex gap-1">
              {item.colors.slice(0, 3).map((color, index) => (
                <div
                  key={index}
                  className="w-4 h-4 rounded-full border border-border"
                  style={{ backgroundColor: color.toLowerCase() }}
                  title={color}
                />
              ))}
              {item.colors.length > 3 && (
                <span className="text-xs text-muted-foreground ml-1">
                  +{item.colors.length - 3}
                </span>
              )}
            </div>
          )}
          
          <div className="pt-2">
            <SingleItemTryOn item={item} personImageUrl={personImageUrl} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}