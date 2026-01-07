"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Outfit, WardrobeItem, CardTemplate } from "@/types/api"
import { CARD_TEMPLATES, CARD_WIDTH, CARD_HEIGHT } from "@/lib/card-templates"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Download, Loader2, X } from "lucide-react"

// Simple toast helper
const useToast = () => {
  const toast = useCallback(({ title, variant }: { title: string; variant?: string }) => {
    if (variant === "destructive") {
      console.error(`[Error] ${title}`)
    } else {
      console.log(`[Success] ${title}`)
    }
  }, [])
  return { toast }
}

interface FashionCardGeneratorProps {
  outfit: Outfit
  onClose: () => void
}

function getItemImageUrl(item: string | WardrobeItem | undefined): string | null {
  if (!item || typeof item === "string") return null
  const imageUrl = item.processedImageUrl || item.imageUrl || null
  // Proxy Azure Blob Storage URLs to avoid CORS issues with canvas
  if (imageUrl && imageUrl.includes('blob.core.windows.net')) {
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/upload/proxy?url=${encodeURIComponent(imageUrl)}`
  }
  return imageUrl
}

export function FashionCardGenerator({ outfit, onClose }: FashionCardGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { toast } = useToast()
  const [isRendering, setIsRendering] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [template, setTemplate] = useState<CardTemplate>(outfit.cardTemplate)

  // Render canvas when outfit or template changes
  useEffect(() => {
    renderCard()
  }, [outfit, template])

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      img.crossOrigin = "anonymous"
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  const renderCard = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsRendering(true)
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const config = CARD_TEMPLATES[template]
    const padding = config.padding
    const contentWidth = CARD_WIDTH - padding * 2
    const headerHeight = 80

    // Background
    ctx.fillStyle = config.background
    if (config.borderRadius > 0) {
      roundRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, config.borderRadius)
      ctx.fill()
    } else {
      ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
    }

    // Header with outfit name
    ctx.fillStyle = config.textColor
    ctx.font = `bold 36px ${config.fontFamily}`
    ctx.textAlign = "center"
    ctx.fillText(outfit.name, CARD_WIDTH / 2, padding + 50)

    // Accent line
    ctx.fillStyle = config.accentColor
    ctx.fillRect(CARD_WIDTH / 2 - 40, padding + 70, 80, 3)

    // Calculate item positions
    const itemAreaTop = padding + headerHeight + 20
    const itemAreaHeight = CARD_HEIGHT - itemAreaTop - padding
    const itemSize = Math.min(contentWidth / 2 - 20, itemAreaHeight / 2 - 20)

    // Load and draw images
    const topUrl = getItemImageUrl(outfit.items.top)
    const bottomUrl = getItemImageUrl(outfit.items.bottom)
    const shoeUrl = getItemImageUrl(outfit.items.shoe)
    const accessoryUrl = outfit.items.accessories.length > 0 
      ? getItemImageUrl(outfit.items.accessories[0]) 
      : null

    const positions = [
      { url: topUrl, x: padding + (contentWidth / 4) - itemSize / 2, y: itemAreaTop, label: "Top" },
      { url: bottomUrl, x: padding + (contentWidth * 3 / 4) - itemSize / 2, y: itemAreaTop, label: "Bottom" },
      { url: shoeUrl, x: padding + (contentWidth / 4) - itemSize / 2, y: itemAreaTop + itemSize + 40, label: "Shoes" },
      { url: accessoryUrl, x: padding + (contentWidth * 3 / 4) - itemSize / 2, y: itemAreaTop + itemSize + 40, label: "Accessory" },
    ]

    for (const pos of positions) {
      // Draw slot background
      ctx.fillStyle = config.textColor + "10"
      roundRect(ctx, pos.x, pos.y, itemSize, itemSize, 12)
      ctx.fill()

      if (pos.url) {
        try {
          const img = await loadImage(pos.url)
          const scale = Math.min((itemSize - 20) / img.width, (itemSize - 20) / img.height)
          const w = img.width * scale
          const h = img.height * scale
          ctx.drawImage(img, pos.x + (itemSize - w) / 2, pos.y + (itemSize - h) / 2, w, h)
        } catch {
          // Draw placeholder text if image fails
          ctx.fillStyle = config.textColor + "40"
          ctx.font = `14px ${config.fontFamily}`
          ctx.textAlign = "center"
          ctx.fillText(pos.label, pos.x + itemSize / 2, pos.y + itemSize / 2)
        }
      } else {
        // Empty slot label
        ctx.fillStyle = config.textColor + "40"
        ctx.font = `14px ${config.fontFamily}`
        ctx.textAlign = "center"
        ctx.fillText(pos.label, pos.x + itemSize / 2, pos.y + itemSize / 2)
      }
    }

    // Footer branding
    ctx.fillStyle = config.accentColor
    ctx.font = `12px ${config.fontFamily}`
    ctx.textAlign = "center"
    ctx.fillText("Created with AesthetIQ", CARD_WIDTH / 2, CARD_HEIGHT - padding / 2)

    setIsRendering(false)
  }

  const handleExport = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsExporting(true)
    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png", 1.0)
      })

      if (!blob) {
        throw new Error("Failed to create image")
      }

      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${outfit.name.replace(/\s+/g, "-").toLowerCase()}-fashion-card.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({ title: "Fashion Card exported!" })
    } catch {
      toast({ title: "Failed to export", variant: "destructive" })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-background rounded-lg border border-border max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold">Fashion Card Generator</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Canvas Preview */}
          <div className="flex flex-col items-center">
            <div className="relative w-full max-w-[360px] aspect-[4/5] bg-muted rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                width={CARD_WIDTH}
                height={CARD_HEIGHT}
                className="w-full h-full object-contain"
              />
              {isRendering && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            <div>
              <Label className="mb-3 block">Template Style</Label>
              <div className="grid grid-cols-3 gap-3">
                {(Object.keys(CARD_TEMPLATES) as CardTemplate[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTemplate(t)}
                    className={`p-4 rounded-lg border-2 text-sm capitalize transition-all ${
                      template === t
                        ? "border-purple-500 ring-2 ring-purple-500/30"
                        : "border-border hover:border-muted-foreground"
                    }`}
                    style={{ backgroundColor: CARD_TEMPLATES[t].background }}
                  >
                    <span style={{ color: CARD_TEMPLATES[t].textColor }}>
                      {CARD_TEMPLATES[t].name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">Export Details</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Resolution: {CARD_WIDTH} × {CARD_HEIGHT}px</li>
                <li>• Format: PNG (transparent-ready)</li>
                <li>• Optimized for Instagram Stories</li>
              </ul>
            </div>

            <Button 
              onClick={handleExport} 
              disabled={isRendering || isExporting}
              className="w-full bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-700 hover:to-rose-700"
              size="lg"
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Download className="mr-2 h-5 w-5" />
              )}
              Download Fashion Card
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper: Draw rounded rectangle
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
