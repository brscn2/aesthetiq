"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
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
          <DialogTitle>Your Virtual Try-On Result</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Generated Image */}
          <div className="relative aspect-[3/4] w-full max-w-md mx-auto overflow-hidden rounded-lg border bg-muted">
            <Image
              src={`data:image/png;base64,${imageBase64}`}
              alt="Virtual try-on result showing you wearing the selected clothing items"
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Selected Items */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Items Used</h3>
            <div className="flex gap-3">
              {Object.entries(selectedItems).map(([category, item]) => {
                // Get image URL - try all possible fields
                const itemData = item as any;
                const imageUrl =
                  itemData.imageUrl ||
                  itemData.processedImageUrl ||
                  (itemData.imageUrls && itemData.imageUrls[0]) ||
                  itemData.primaryImageUrl ||
                  "/placeholder.png";

                return (
                  <div
                    key={category}
                    className="relative w-20 h-20 overflow-hidden rounded-md border bg-muted"
                  >
                    <Image
                      src={imageUrl}
                      alt={`${itemData.name || itemData.subCategory || category}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                );
              })}
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
