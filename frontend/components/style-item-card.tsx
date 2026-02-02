"use client";

import { StyleItem } from "@/lib/style-api";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Check } from "lucide-react";
import Image from "next/image";

interface StyleItemCardProps {
  item: StyleItem;
  isSelected?: boolean;
  onSelect?: (item: StyleItem) => void;
}

export function StyleItemCard({
  item,
  isSelected = false,
  onSelect,
}: StyleItemCardProps) {
  // Use the first image from imageUrls
  const imageUrl =
    item.imageUrls?.[0] || item.primaryImageUrl || "/placeholder.png";

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(item);
    }
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    // Prevent card selection when clicking the link
    e.stopPropagation();
  };

  return (
    <Card
      className={`group overflow-hidden transition-all hover:shadow-lg cursor-pointer ${
        isSelected ? "ring-2 ring-primary ring-offset-2" : ""
      }`}
      onClick={handleCardClick}
    >
      {/* Image Container - relative positioning for absolute children */}
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute left-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
            <Check className="h-5 w-5" />
          </div>
        )}

        {/* External Link Button - Visible on hover with primary color */}
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-110 border border-primary opacity-0 group-hover:opacity-100"
          onClick={handleLinkClick}
          title="View on store website"
        >
          <ExternalLink className="h-4 w-4" />
        </a>

        <Image
          src={imageUrl}
          alt={item.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {item.colorHex && (
          <div
            className="absolute right-2 bottom-2 h-8 w-8 rounded-full border-2 border-white shadow-lg"
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
      </CardFooter>
    </Card>
  );
}
