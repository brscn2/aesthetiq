"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { StyleItem } from "@/lib/style-api";
import Image from "next/image";

interface TryOnResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageBase64: string;
  selectedItems: Record<string, StyleItem>;
}

export function TryOnResultModal({
  isOpen,
  onClose,
  imageBase64,
  selectedItems,
}: TryOnResultModalProps) {
  const handleDownload = () => {
    // Create download link for base64 image
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${imageBase64}`;
    link.download = `try-on-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Your Virtual Try-On Result</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Generated Image */}
          <div className="relative aspect-[3/4] w-full max-w-md mx-auto overflow-hidden rounded-lg border bg-muted">
            <Image
              src={`data:image/png;base64,${imageBase64}`}
              alt="Virtual Try-On Result"
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Selected Items */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Selected Items ({Object.keys(selectedItems).length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Object.entries(selectedItems).map(([category, item]) => (
                <div key={category} className="space-y-2 rounded-lg border p-3">
                  <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
                    <Image
                      src={
                        item.imageUrls?.[0] ||
                        item.primaryImageUrl ||
                        "/placeholder.png"
                      }
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {category}
                    </p>
                    <p className="text-xs line-clamp-2">{item.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Download Image
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
