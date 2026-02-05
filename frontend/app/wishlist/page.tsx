"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Trash2, ExternalLink, ShoppingBag, Loader2, Heart, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { useApi } from "@/lib/api"
import type { WishlistItem } from "@/types/api"

export default function WishlistPage() {
  const { wishlistApi } = useApi()
  const queryClient = useQueryClient()
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<WishlistItem | null>(null)
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false)

  const { data: wishlistItems, isLoading, isError } = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => wishlistApi.getAll(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => wishlistApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] })
      toast.success("Item removed from wishlist")
      setIsDeleteDialogOpen(false)
      setItemToDelete(null)
    },
    onError: () => {
      toast.error("Failed to remove item from wishlist")
    },
  })

  const clearAllMutation = useMutation({
    mutationFn: () => wishlistApi.clearAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] })
      toast.success("Wishlist cleared")
      setIsClearDialogOpen(false)
    },
    onError: () => {
      toast.error("Failed to clear wishlist")
    },
  })

  const handleDeleteClick = (item: WishlistItem, e: React.MouseEvent) => {
    e.stopPropagation()
    setItemToDelete(item)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete._id)
    }
  }

  const handleClearAll = () => {
    setIsClearDialogOpen(true)
  }

  const confirmClearAll = () => {
    clearAllMutation.mutate()
  }

  return (
    <DashboardLayout>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border bg-background/95 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Wishlist</h1>
                <p className="text-sm text-muted-foreground">
                  {wishlistItems?.length || 0} item{(wishlistItems?.length || 0) !== 1 ? "s" : ""} saved for later
                </p>
              </div>
            </div>
            {wishlistItems && wishlistItems.length > 0 && (
              <Button variant="outline" onClick={handleClearAll}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <p className="text-muted-foreground">Failed to load wishlist</p>
              <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["wishlist"] })}>
                Try Again
              </Button>
            </div>
          ) : !wishlistItems || wishlistItems.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-4">
              <div className="rounded-full bg-muted p-4">
                <Heart className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-foreground">Your wishlist is empty</h3>
                <p className="text-sm text-muted-foreground">
                  Items you save from your AI stylist recommendations will appear here
                </p>
              </div>
              <Link href="/dashboard">
                <Button className="bg-gradient-to-r from-purple-600 to-rose-600 text-white hover:from-purple-700 hover:to-rose-700">
                  Get Style Recommendations
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {wishlistItems.map((item) => (
                <Card
                  key={item._id}
                  className="group cursor-pointer transition-all hover:shadow-lg"
                  onClick={() => setSelectedItem(item)}
                >
                  <CardContent className="p-4">
                    <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="object-contain transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ShoppingBag className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute right-2 top-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => handleDeleteClick(item, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-3 space-y-1">
                      <h3 className="font-medium text-foreground line-clamp-2">{item.name}</h3>
                      {item.brand && (
                        <p className="text-sm text-muted-foreground">{item.brand}</p>
                      )}
                      <div className="flex items-center justify-between">
                        {item.price && (
                          <span className="font-semibold text-primary">
                            {item.currency === "EUR" ? "€" : item.currency === "GBP" ? "£" : "$"}
                            {item.price.toFixed(2)}
                          </span>
                        )}
                        {item.retailerName && (
                          <Badge variant="secondary" className="text-xs">
                            {item.retailerName}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {item.productUrl && (
                      <Button
                        asChild
                        className="mt-3 w-full bg-gradient-to-r from-purple-600 to-rose-600 text-white hover:from-purple-700 hover:to-rose-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a href={item.productUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Shop Now
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Item Detail Dialog */}
        <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
          {selectedItem && (
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">{selectedItem.name}</DialogTitle>
                {selectedItem.brand && (
                  <DialogDescription>{selectedItem.brand}</DialogDescription>
                )}
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
                  {selectedItem.imageUrl ? (
                    <Image
                      src={selectedItem.imageUrl}
                      alt={selectedItem.name}
                      fill
                      className="object-contain"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ShoppingBag className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  {selectedItem.category && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Category</span>
                      <span className="font-medium text-foreground">{selectedItem.category}</span>
                    </div>
                  )}
                  {selectedItem.price && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Price</span>
                      <span className="font-semibold text-primary">
                        {selectedItem.currency === "EUR" ? "€" : selectedItem.currency === "GBP" ? "£" : "$"}
                        {selectedItem.price.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {selectedItem.retailerName && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Retailer</span>
                      <span className="font-medium text-foreground">{selectedItem.retailerName}</span>
                    </div>
                  )}
                  {selectedItem.description && (
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">Description</span>
                      <span className="text-foreground">{selectedItem.description}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      setSelectedItem(null)
                      setItemToDelete(selectedItem)
                      setIsDeleteDialogOpen(true)
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                  {selectedItem.productUrl && (
                    <Button
                      asChild
                      className="flex-1 bg-gradient-to-r from-purple-600 to-rose-600 text-white hover:from-purple-700 hover:to-rose-700"
                    >
                      <a href={selectedItem.productUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Shop Now
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          )}
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove from Wishlist</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove "{itemToDelete?.name}" from your wishlist?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Clear All Confirmation Dialog */}
        <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clear Wishlist</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove all {wishlistItems?.length || 0} items from your wishlist? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsClearDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmClearAll}
                disabled={clearAllMutation.isPending}
              >
                {clearAllMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Clear All
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
