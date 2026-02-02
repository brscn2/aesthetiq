"use client"

import { useState } from "react"
import { StyleItem } from "@/lib/style-api"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Sparkles } from "lucide-react"
import Image from "next/image"
import { TryOnDialog } from "./tryon-dialog"

interface StyleItemCardProps {
  item: StyleItem
}

export function StyleItemCard({ item }: StyleItemCardProps) {
  const [showTryOn, setShowTryOn] = useState(false)
  // Use the first image from imageUrls
  const imageUrl = item.imageUrls?.[0] || item.primaryImageUrl || "/placeholder.png"

  return (
    <>
      <Card className="group overflow-hidden transition-all hover:shadow-lg">
        <div className="block">
          {/* Image */}
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
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
          </a>

          {/* Content */}
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
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

                {/* Price */}
                {item.price && (
                  <div className="pt-2">
                    <span className="text-lg font-semibold text-foreground">
                      {item.price.formatted}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </a>

          {/* Footer */}
          <CardFooter className="flex items-center gap-2 border-t p-4">
            <Button
              onClick={() => setShowTryOn(true)}
              variant="default"
              size="sm"
              className="flex-1"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Try On
            </Button>
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          </CardFooter>
        </div>
      </Card>

      <TryOnDialog
        open={showTryOn}
        onOpenChange={setShowTryOn}
        clothingImageUrl={imageUrl}
        clothingName={item.name}
      />
    </>
  )
}
