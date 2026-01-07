"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useApi } from "@/lib/api"
import { Outfit } from "@/types/api"
import { OutfitCard } from "./outfit-card"
import { Button } from "@/components/ui/button"
import { Loader2, Heart, HeartOff } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"

interface OutfitGridProps {
  onEdit: (outfit: Outfit) => void
  onView: (outfit: Outfit) => void
}

export function OutfitGrid({ onEdit, onView }: OutfitGridProps) {
  const { outfitApi } = useApi()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [deleteOutfit, setDeleteOutfit] = useState<Outfit | null>(null)

  const { data: outfits, isLoading, error } = useQuery({
    queryKey: ["outfits"],
    queryFn: () => outfitApi.getAll(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => outfitApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outfits"] })
      toast({ title: "Outfit deleted" })
      setDeleteOutfit(null)
    },
    onError: () => {
      toast({ title: "Failed to delete outfit", variant: "destructive" })
    },
  })

  const favoriteMutation = useMutation({
    mutationFn: (id: string) => outfitApi.toggleFavorite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outfits"] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground">Failed to load outfits</p>
      </div>
    )
  }

  const filteredOutfits = showFavoritesOnly 
    ? outfits?.filter(o => o.isFavorite) 
    : outfits

  return (
    <div className="space-y-6">
      {/* Filter Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={showFavoritesOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={showFavoritesOnly ? "bg-purple-600 hover:bg-purple-700" : ""}
        >
          {showFavoritesOnly ? <Heart className="mr-2 h-4 w-4 fill-current" /> : <HeartOff className="mr-2 h-4 w-4" />}
          {showFavoritesOnly ? "Showing Favorites" : "Show Favorites Only"}
        </Button>
      </div>

      {/* Grid */}
      {filteredOutfits && filteredOutfits.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredOutfits.map((outfit) => (
            <OutfitCard
              key={outfit._id}
              outfit={outfit}
              onEdit={() => onEdit(outfit)}
              onDelete={() => setDeleteOutfit(outfit)}
              onToggleFavorite={() => favoriteMutation.mutate(outfit._id)}
              onView={() => onView(outfit)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="mb-4 font-serif text-xl text-muted-foreground">
            {showFavoritesOnly ? "No favorite outfits yet" : "No outfits created yet"}
          </p>
          <p className="text-sm text-muted-foreground">
            {showFavoritesOnly ? "Mark some outfits as favorites" : "Create your first outfit to get started"}
          </p>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteOutfit} onOpenChange={() => setDeleteOutfit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Outfit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteOutfit?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteOutfit && deleteMutation.mutate(deleteOutfit._id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
