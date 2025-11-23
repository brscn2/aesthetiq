"use client"

import { Plus, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Image from "next/image"

const INSPIRATION_IMAGES = [
  "/minimalist-fashion-street-style.jpg",
  "/architectural-blazer-beige.jpg",
  "/black-monochrome-outfit-texture.jpg",
  "/wide-leg-trousers-grey.jpg",
  "/oversized-coat-winter-fashion.jpg",
]

const TAGS = ["Streetwear", "Oversized Silhouette", "Neutral Tones", "Layering", "Matte Textures"]

export function InspirationBoard() {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-2xl font-bold">Inspiration & Vibe</h3>
        <Button variant="outline" size="sm">
          Edit Board
        </Button>
      </div>

      {/* Masonry Grid Layout using CSS Columns */}
      <div className="columns-2 gap-4 space-y-4 md:columns-3 lg:columns-4">
        {/* Add Inspiration Card */}
        <Card className="break-inside-avoid border-2 border-dashed border-muted bg-transparent transition-colors hover:border-primary hover:bg-primary/5">
          <CardContent className="flex aspect-[3/4] flex-col items-center justify-center p-6 text-center text-muted-foreground">
            <div className="mb-4 rounded-full bg-muted/50 p-4">
              <Plus className="h-6 w-6" />
            </div>
            <p className="font-medium">Add Inspiration</p>
            <p className="text-xs">Upload or save from chat</p>
          </CardContent>
        </Card>

        {INSPIRATION_IMAGES.map((src, i) => (
          <div
            key={i}
            className="break-inside-avoid overflow-hidden rounded-xl border border-border/50 bg-muted/20 mb-4"
          >
            <Image
              src={src || "/placeholder.svg"}
              alt={`Inspiration ${i + 1}`}
              width={400}
              height={500}
              className="h-auto w-full object-cover transition-transform duration-500 hover:scale-105"
            />
          </div>
        ))}
      </div>

      {/* AI Analysis Tags */}
      <div className="flex flex-wrap gap-2">
        <span className="flex items-center px-2 text-sm text-muted-foreground">AI Detected:</span>
        {TAGS.map((tag) => (
          <Badge key={tag} variant="secondary" className="group gap-1 px-3 py-1 text-sm hover:bg-secondary/80">
            {tag}
            <button className="ml-1 opacity-0 transition-opacity group-hover:opacity-100">
              <X className="h-3 w-3" />
              <span className="sr-only">Remove {tag} tag</span>
            </button>
          </Badge>
        ))}
      </div>
    </section>
  )
}
