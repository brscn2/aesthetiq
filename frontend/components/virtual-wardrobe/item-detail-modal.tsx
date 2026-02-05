"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Calendar, Palette, Shirt, Loader2, Sparkles, MessageSquare, Check, X, Plus, Pencil } from "lucide-react"
import { WardrobeItem, Category, UpdateWardrobeItemDto } from "@/types/api"
import { useApi } from "@/lib/api"
import { getClosestColorName, WARDROBE_COLORS } from "@/lib/colors"
import { cn } from "@/lib/utils"
import { getBestMatchingPalettes, getPaletteDisplayName, formatScore, getScoreBgColor, getScoreColor } from "@/lib/seasonal-colors"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

interface ItemDetailModalProps {
  item: WardrobeItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CATEGORY_LABELS: Record<Category, string> = {
  [Category.TOP]: "Top",
  [Category.BOTTOM]: "Bottom",
  [Category.OUTERWEAR]: "Outerwear",
  [Category.FOOTWEAR]: "Footwear",
  [Category.ACCESSORY]: "Accessory",
  [Category.DRESS]: "Dress",
}

const SUB_CATEGORIES_BY_CATEGORY: Record<Category, string[]> = {
  [Category.TOP]: ['T-Shirt', 'Shirt', 'Polo', 'Hoodie', 'Sweater', 'Tank Top'],
  [Category.BOTTOM]: ['Jeans', 'Chinos', 'Shorts', 'Joggers', 'Trousers', 'Sweatpants', 'Skirt', 'Leggings'],
  [Category.OUTERWEAR]: ['Jacket', 'Coat', 'Blazer', 'Cardigan', 'Puffer', 'Trench Coat', 'Parka', 'Windbreaker'],
  [Category.FOOTWEAR]: ['Sneakers', 'Boots', 'Loafers', 'Sandals', 'Running Shoes', 'Dress Shoes', 'Slippers', 'High Heels'],
  [Category.ACCESSORY]: ['Watch', 'Sunglasses', 'Cap', 'Hat', 'Belt', 'Bag', 'Backpack', 'Scarf', 'Gloves', 'Jewelry'],
  [Category.DRESS]: ['Maxi', 'Midi', 'Mini', 'Cocktail', 'Evening', 'Casual', 'Wrap', 'Shirt Dress'],
}

export function ItemDetailModal({ item, open, onOpenChange }: ItemDetailModalProps) {
  const { wardrobeApi } = useApi()
  const queryClient = useQueryClient()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Editable fields
  const [editBrand, setEditBrand] = useState("")
  const [editCategory, setEditCategory] = useState<Category>(Category.TOP)
  const [editSubCategory, setEditSubCategory] = useState("")
  const [editColors, setEditColors] = useState<string[]>([])
  const [editNotes, setEditNotes] = useState("")
  // Price removed
  const [editCurrency, setEditCurrency] = useState<string>("USD")
  const [editGender, setEditGender] = useState<string>("")

  // Color picker state
  const [showColorPicker, setShowColorPicker] = useState(false)
  const colorPickerRef = useRef<HTMLDivElement>(null)

  // Track last saved values for cancel functionality
  const savedValuesRef = useRef({
    brand: "",
    category: Category.TOP as Category,
    subCategory: "",
    colors: [] as string[],
    notes: "",
    // price removed
    currency: "USD",
    gender: "",
  })

  // Initialize edit fields when item changes
  useEffect(() => {
    if (item) {
      const values = {
        brand: item.brand || "",
        category: item.category,
        subCategory: item.subCategory || "",
        colors: item.colors || [],
        notes: item.notes || "",
      }
      setEditBrand(values.brand)
      setEditCategory(values.category)
      setEditSubCategory(values.subCategory)
      setEditColors(values.colors)
      setEditNotes(values.notes)
      // price removed
      setEditCurrency(item.currency || "USD")
      setEditGender(item.gender || "")
      savedValuesRef.current = {
        ...values,
        // price removed
        currency: item.currency || "USD",
        gender: item.gender || "",
      }
    }
  }, [item])

  // Reset edit state when modal closes
  useEffect(() => {
    if (!open) {
      setIsEditing(false)
      setShowColorPicker(false)
    }
  }, [open])

  // Close color picker when clicking outside
  useEffect(() => {
    if (!showColorPicker) return

    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showColorPicker])

  const deleteMutation = useMutation({
    mutationFn: (id: string) => wardrobeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wardrobe"] })
      toast.success("Item deleted successfully")
      onOpenChange(false)
    },
    onError: (error) => {
      console.error("Failed to delete item:", error)
      toast.error("Failed to delete item")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWardrobeItemDto }) =>
      wardrobeApi.update(id, data),
    onSuccess: (updatedItem) => {
      // Update the cache immediately with the new data
      queryClient.setQueryData(["wardrobe"], (oldData: WardrobeItem[] | undefined) => {
        if (!oldData) return oldData
        return oldData.map(i => i._id === updatedItem._id ? updatedItem : i)
      })
      queryClient.invalidateQueries({ queryKey: ["wardrobe"] })
      // Save current values as the new baseline for cancel
      savedValuesRef.current = {
        brand: editBrand,
        category: editCategory,
        subCategory: editSubCategory,
        colors: editColors,
        notes: editNotes,
        // price removed
        currency: editCurrency,
        gender: editGender,
      }
      toast.success("Item updated successfully")
      setIsEditing(false)
    },
    onError: (error) => {
      console.error("Failed to update item:", error)
      toast.error("Failed to update item")
    },
  })

  const handleDelete = async () => {
    if (!item) return

    setIsDeleting(true)
    try {
      await deleteMutation.mutateAsync(item._id)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSave = async () => {
    if (!item) return

    setIsSaving(true)
    try {
      await updateMutation.mutateAsync({
        id: item._id,
        data: {
          brand: editBrand || undefined,
          category: editCategory,
          subCategory: editSubCategory || undefined,
          colors: editColors.length > 0 ? editColors : undefined,
          notes: editNotes || undefined,
          // price removed
          currency: editCurrency,
          gender: editGender || undefined,
        },
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    // Reset to last saved values (not item prop which may be stale)
    setEditBrand(savedValuesRef.current.brand)
    setEditCategory(savedValuesRef.current.category)
    setEditSubCategory(savedValuesRef.current.subCategory)
    setEditColors(savedValuesRef.current.colors)
    setEditNotes(savedValuesRef.current.notes)
    // price removed
    setEditCurrency(savedValuesRef.current.currency)
    setEditGender(savedValuesRef.current.gender)
    setIsEditing(false)
    setShowColorPicker(false)
  }

  const handleRemoveColor = (colorToRemove: string) => {
    setEditColors(editColors.filter(c => c !== colorToRemove))
  }

  // Helper to determine if a color is light or dark
  const isLightColor = (hex: string): boolean => {
    const color = hex.replace("#", "")
    const r = parseInt(color.substring(0, 2), 16)
    const g = parseInt(color.substring(2, 4), 16)
    const b = parseInt(color.substring(4, 6), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5
  }

  if (!item) return null

  const createdDate = item.createdAt ? format(new Date(item.createdAt), "PPP") : "Unknown"
  // Always use editColors for display - they're synced from item and updated after save
  const displayColors = editColors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" showCloseButton={!isEditing}>
        <DialogHeader>
          {isEditing ? (
            <Input
              value={editBrand}
              onChange={(e) => setEditBrand(e.target.value)}
              placeholder="Name your item"
              className="font-serif text-xl h-auto py-1 px-2 placeholder:text-xl"
            />
          ) : (
            <DialogTitle className="font-serif text-xl">
              {editBrand || "Unknown Brand"}
            </DialogTitle>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {/* Image */}
          <div className="relative aspect-square w-full max-h-[50vh] overflow-hidden rounded-lg bg-muted">
            {item.processedImageUrl && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: 'linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)',
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                  opacity: 0.05
                }}
              />
            )}
            <Image
              src={item.processedImageUrl || item.imageUrl || "/placeholder.svg"}
              alt={item.brand || "Clothing item"}
              fill
              sizes="(max-width: 448px) 100vw, 448px"
              className="object-contain p-4"
            />
          </div>

          {/* Details */}
          <div className="space-y-4">
            {/* Price & Gender Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Price Row removed as per request */}

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Gender:</span>
                </div>
                {isEditing ? (
                  <Select value={editGender} onValueChange={setEditGender}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="UNISEX">Unisex</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm">
                    {item.gender ? (item.gender.charAt(0) + item.gender.slice(1).toLowerCase()) : "Not set"}
                  </div>
                )}
              </div>

              {/* Currency (kept in case they want to set it for the record, but hidden if desired? User said "remove price field". Without price, currency is just a setting. I'll keep it as a secondary field or just remove it from UI if it looks cluttery. 
                   Actually, if price is hidden, currency typically goes with it.
                   But let's assume they only explicitly hated the Price input.
                   I will hide the Price input block.
               */}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Shirt className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Category:</span>
              </div>
              {isEditing ? (
                <div className="flex gap-2">
                  <Select value={editCategory} onValueChange={(value) => {
                    setEditCategory(value as Category)
                    setEditSubCategory("") // Reset subcategory when category changes
                  }}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={editSubCategory} onValueChange={setEditSubCategory}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUB_CATEGORIES_BY_CATEGORY[editCategory].map((sub) => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{CATEGORY_LABELS[editCategory]}</Badge>
                  {editSubCategory && (
                    <Badge variant="outline">{editSubCategory}</Badge>
                  )}
                </div>
              )}
            </div>

            {/* Colors */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Colors:</span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {displayColors.map((color, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-border bg-card group"
                  >
                    <div
                      className="h-3 w-3 rounded-full border border-border"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs">{getClosestColorName(color)}</span>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleRemoveColor(color)}
                        className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                {isEditing && (
                  <div className="relative" ref={colorPickerRef}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className="h-7 px-2"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                    {showColorPicker && (
                      <div className="absolute z-50 mt-2 p-3 bg-popover border rounded-lg shadow-lg w-[280px]">
                        <div className="grid grid-cols-7 gap-1.5">
                          {WARDROBE_COLORS.map((color) => {
                            const isSelected = editColors.includes(color.hex)
                            const isLight = isLightColor(color.hex)
                            return (
                              <button
                                key={color.hex}
                                type="button"
                                onClick={() => {
                                  if (!isSelected) {
                                    setEditColors([...editColors, color.hex])
                                  }
                                  setShowColorPicker(false)
                                }}
                                disabled={isSelected}
                                className={cn(
                                  "relative h-8 w-8 rounded-full border-2 transition-all hover:scale-110",
                                  isSelected
                                    ? "border-muted-foreground opacity-50 cursor-not-allowed"
                                    : "border-border hover:border-primary"
                                )}
                                style={{ backgroundColor: color.hex }}
                                title={color.name}
                              >
                                {isSelected && (
                                  <Check
                                    className={cn(
                                      "absolute inset-0 m-auto h-4 w-4",
                                      isLight ? "text-black" : "text-white"
                                    )}
                                  />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {displayColors.length === 0 && !isEditing && (
                  <span className="text-xs text-muted-foreground">No colors</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Added:</span>
              <span>{createdDate}</span>
            </div>

            {/* Style Notes */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Style Notes:</span>
              </div>
              {isEditing ? (
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add notes about styling, occasions, or pairings..."
                  className="min-h-[80px] text-sm"
                />
              ) : (
                editNotes ? (
                  <p className="text-sm text-foreground">{editNotes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No style notes</p>
                )
              )}
            </div>

            {/* Seasonal Palette Compatibility - Only show in view mode */}
            {!isEditing && item.seasonalPaletteScores && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Best Palettes:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {getBestMatchingPalettes(item.seasonalPaletteScores, 0.6)
                    .slice(0, 4)
                    .map(({ palette, score }) => (
                      <div
                        key={palette}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs ${getScoreBgColor(score)}`}
                      >
                        <span>{getPaletteDisplayName(palette)}</span>
                        <span className={`font-medium ${getScoreColor(score)}`}>
                          {formatScore(score)}
                        </span>
                      </div>
                    ))}
                  {getBestMatchingPalettes(item.seasonalPaletteScores, 0.6).length === 0 && (
                    <span className="text-xs text-muted-foreground">No strong matches</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t space-y-2">
            {isEditing ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Item
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Item
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
