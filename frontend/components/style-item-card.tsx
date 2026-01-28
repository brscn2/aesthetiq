"use client"

import { StyleItem } from "@/lib/style-api"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink } from "lucide-react"
import Image from "next/image"

interface StyleItemCardProps {
  item: StyleItem
}

export function StyleItemCard({ item }: StyleItemCardProps) {
  // Use the first image from imageUrls
  const imageUrl = item.imageUrls?.[0] || item.primaryImageUrl || "/placeholder.png"

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg">
      <a
        href={item.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {/* Image */}
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          <Image
            src={imageUrl}
            alt={item.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
          {item.colorHex && (
            <div
              className="absolute right-2 top-2 h-8 w-8 rounded-full border-2 border-white shadow-lg"
              style={{ backgroundColor: item.colorHex }}
              title={item.color}
            />
          )}
        </div>

        {/* Content */}
        <CardContent className="p-4">
          <div className="space-y-2">
            {/* Brand & Store */}
            <div className="flex items-center justify-between gap-2">
              {item.brand && (
                <Badge variant="secondary" className="text-xs">
                  {item.brand}
                </Badge>
              )}
              {item.store && (
                <span className="text-xs text-muted-foreground uppercase">
                  {item.store}
                </span>
              )}
            </div>

            {/* Name */}
            <h3 className="line-clamp-2 font-medium text-foreground group-hover:text-primary">
              {item.name}
            </h3>

            {/* Category & SubCategory */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {item.category && <span>{item.category}</span>}
              {item.subCategory && (
                <>
                  <span>•</span>
                  <span>{item.subCategory}</span>
                </>
              )}
            </div>

            {/* Description */}
            {item.description && (
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {item.description}
              </p>
            )}

            {/* Material */}
            {item.material && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Material:</span> {item.material}
              </p>
            )}
          </div>
        </CardContent>

        {/* Footer */}
        <CardFooter className="flex items-center justify-between border-t p-4">
          <div className="flex flex-col">
            {item.price && (
              <span className="text-lg font-semibold text-foreground">
                {item.price.formatted}
              </span>
            )}
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
        </CardFooter>
      </a>
    </Card>
  )
}
