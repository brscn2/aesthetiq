"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useApi } from "@/lib/api"
import { Category, WardrobeItem, Outfit, CardTemplate, CreateOutfitDto } from "@/types/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Check, X, Save, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { CARD_TEMPLATES } from "@/lib/card-templates"

const TEMP_USER_ID = "507f1f77bcf86cd799439011"

interface OutfitCreatorProps {
  editOutfit?: Outfit | null
  onSaved: () => void
  onCancel: () => void
  prefillItemIds?: string[] | null
  prefillKey?: string | null
}

interface SelectedItems {
  top: string | null
  bottom: string | null
  shoe: string | null
  accessories: string[]
}

export function OutfitCreator({ editOutfit, onSaved, onCancel, prefillItemIds, prefillKey }: OutfitCreatorProps) {
  const { wardrobeApi, outfitApi } = useApi()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [name, setName] = useState("")
  const [cardTemplate, setCardTemplate] = useState<CardTemplate>("minimal")
  const [selectedItems, setSelectedItems] = useState<SelectedItems>({
    top: null,
    bottom: null,
    shoe: null,
    accessories: [],
  })
  const prefillAppliedRef = useRef<string | null>(null)

  // Load wardrobe items
  const { data: wardrobeItems, isLoading } = useQuery({
    queryKey: ["wardrobe", TEMP_USER_ID],
    queryFn: () => wardrobeApi.getAll(TEMP_USER_ID),
  })

  // Pre-populate for edit mode
  useEffect(() => {
    if (editOutfit) {
      setName(editOutfit.name)
      setCardTemplate(editOutfit.cardTemplate)
      setSelectedItems({
        top: typeof editOutfit.items.top === "string" ? editOutfit.items.top : editOutfit.items.top?._id || null,
        bottom: typeof editOutfit.items.bottom === "string" ? editOutfit.items.bottom : editOutfit.items.bottom?._id || null,
        shoe: typeof editOutfit.items.shoe === "string" ? editOutfit.items.shoe : editOutfit.items.shoe?._id || null,
        accessories: editOutfit.items.accessories.map(a => typeof a === "string" ? a : a._id),
      })
    }
  }, [editOutfit])

  // Pre-populate for chat suggestions (override selections)
  useEffect(() => {
    if (!prefillItemIds || prefillItemIds.length === 0) return
    if (!wardrobeItems || wardrobeItems.length === 0) return
    if (editOutfit) return

    const key = prefillKey || prefillItemIds.join(",")
    if (prefillAppliedRef.current === key) return

    const nextSelection: SelectedItems = {
      top: null,
      bottom: null,
      shoe: null,
      accessories: [],
    }
    const missingIds: string[] = []
    const skippedIds: string[] = []

    prefillItemIds.forEach((id) => {
      const item = wardrobeItems.find((wardrobeItem) => wardrobeItem._id === id)
      if (!item) {
        missingIds.push(id)
        return
      }

      if (item.category === Category.ACCESSORY) {
        if (!nextSelection.accessories.includes(item._id)) {
          nextSelection.accessories.push(item._id)
        }
        return
      }

      if (item.category === Category.TOP) {
        if (!nextSelection.top) {
          nextSelection.top = item._id
        } else {
          skippedIds.push(item._id)
        }
        return
      }

      if (item.category === Category.BOTTOM) {
        if (!nextSelection.bottom) {
          nextSelection.bottom = item._id
        } else {
          skippedIds.push(item._id)
        }
        return
      }

      if (item.category === Category.SHOE) {
        if (!nextSelection.shoe) {
          nextSelection.shoe = item._id
        } else {
          skippedIds.push(item._id)
        }
      }
    })

    setSelectedItems(nextSelection)
    prefillAppliedRef.current = key

    if (missingIds.length > 0) {
      toast({
        title: "Some items were not found",
        description: "We couldn't find all suggested items in your wardrobe, so they were skipped.",
        variant: "destructive",
      })
    }

    if (skippedIds.length > 0) {
      toast({
        title: "Some items were skipped",
        description: "Only one item per top, bottom, and shoe category can be pre-selected.",
      })
    }
  }, [prefillItemIds, prefillKey, wardrobeItems, editOutfit, toast])

  const createMutation = useMutation({
    mutationFn: (data: CreateOutfitDto) => outfitApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outfits"] })
      toast({ title: "Outfit created!" })
      onSaved()
    },
    onError: () => {
      toast({ title: "Failed to create outfit", variant: "destructive" })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => outfitApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outfits"] })
      toast({ title: "Outfit updated!" })
      onSaved()
    },
    onError: () => {
      toast({ title: "Failed to update outfit", variant: "destructive" })
    },
  })

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: "Please enter a name", variant: "destructive" })
      return
    }
    if (!selectedItems.top && !selectedItems.bottom && !selectedItems.shoe && selectedItems.accessories.length === 0) {
      toast({ title: "Please select at least one item", variant: "destructive" })
      return
    }

    const data = {
      name: name.trim(),
      items: {
        top: selectedItems.top || undefined,
        bottom: selectedItems.bottom || undefined,
        shoe: selectedItems.shoe || undefined,
        accessories: selectedItems.accessories.length > 0 ? selectedItems.accessories : undefined,
      },
      cardTemplate,
    }

    if (editOutfit) {
      updateMutation.mutate({ id: editOutfit._id, data })
    } else {
      createMutation.mutate(data as CreateOutfitDto)
    }
  }

  const toggleItem = (category: Category, itemId: string) => {
    if (category === Category.ACCESSORY) {
      setSelectedItems(prev => ({
        ...prev,
        accessories: prev.accessories.includes(itemId)
          ? prev.accessories.filter(id => id !== itemId)
          : [...prev.accessories, itemId],
      }))
    } else {
      const key = category.toLowerCase() as "top" | "bottom" | "shoe"
      setSelectedItems(prev => ({
        ...prev,
        [key]: prev[key] === itemId ? null : itemId,
      }))
    }
  }

  const isSelected = (category: Category, itemId: string): boolean => {
    if (category === Category.ACCESSORY) {
      return selectedItems.accessories.includes(itemId)
    }
    const key = category.toLowerCase() as "top" | "bottom" | "shoe"
    return selectedItems[key] === itemId
  }

  const getSelectedItem = (itemId: string | null): WardrobeItem | undefined => {
    if (!itemId || !wardrobeItems) return undefined
    return wardrobeItems.find(i => i._id === itemId)
  }

  // Group items by category
  const itemsByCategory = {
    [Category.TOP]: wardrobeItems?.filter(i => i.category === Category.TOP) || [],
    [Category.BOTTOM]: wardrobeItems?.filter(i => i.category === Category.BOTTOM) || [],
    [Category.SHOE]: wardrobeItems?.filter(i => i.category === Category.SHOE) || [],
    [Category.ACCESSORY]: wardrobeItems?.filter(i => i.category === Category.ACCESSORY) || [],
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Item Selection */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-light text-foreground">
            {editOutfit ? "Edit Outfit" : "Create Outfit"}
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {editOutfit ? "Update" : "Save"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue={Category.TOP}>
          <TabsList className="bg-card">
            <TabsTrigger value={Category.TOP}>Tops ({itemsByCategory[Category.TOP].length})</TabsTrigger>
            <TabsTrigger value={Category.BOTTOM}>Bottoms ({itemsByCategory[Category.BOTTOM].length})</TabsTrigger>
            <TabsTrigger value={Category.SHOE}>Shoes ({itemsByCategory[Category.SHOE].length})</TabsTrigger>
            <TabsTrigger value={Category.ACCESSORY}>Accessories ({itemsByCategory[Category.ACCESSORY].length})</TabsTrigger>
          </TabsList>

          {Object.entries(itemsByCategory).map(([category, items]) => (
            <TabsContent key={category} value={category} className="mt-4">
              {items.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                  {items.map((item) => (
                    <ItemSelectCard
                      key={item._id}
                      item={item}
                      selected={isSelected(category as Category, item._id)}
                      onClick={() => toggleItem(category as Category, item._id)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No items in this category</p>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Preview & Settings */}
      <div className="space-y-6">
        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-4">
            <div>
              <Label htmlFor="outfit-name">Outfit Name</Label>
              <Input
                id="outfit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Casual Friday"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Card Template</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {(Object.keys(CARD_TEMPLATES) as CardTemplate[]).map((template) => (
                  <button
                    key={template}
                    onClick={() => setCardTemplate(template)}
                    className={`p-3 rounded-md border text-sm capitalize transition-all ${
                      cardTemplate === template
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-border hover:border-muted-foreground"
                    }`}
                    style={{ backgroundColor: CARD_TEMPLATES[template].background + "20" }}
                  >
                    {CARD_TEMPLATES[template].name}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Preview */}
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <Label className="mb-3 block">Preview</Label>
            <div 
              className="aspect-[4/5] rounded-lg p-4 flex flex-col"
              style={{ 
                backgroundColor: CARD_TEMPLATES[cardTemplate].background,
                borderRadius: CARD_TEMPLATES[cardTemplate].borderRadius,
              }}
            >
              <p 
                className="text-center font-medium mb-3 truncate"
                style={{ 
                  color: CARD_TEMPLATES[cardTemplate].textColor,
                  fontFamily: CARD_TEMPLATES[cardTemplate].fontFamily,
                }}
              >
                {name || "Outfit Name"}
              </p>
              <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-2">
                <PreviewSlot item={getSelectedItem(selectedItems.top)} label="Top" template={cardTemplate} />
                <PreviewSlot item={getSelectedItem(selectedItems.bottom)} label="Bottom" template={cardTemplate} />
                <PreviewSlot item={getSelectedItem(selectedItems.shoe)} label="Shoe" template={cardTemplate} />
                <PreviewSlot 
                  item={selectedItems.accessories[0] ? getSelectedItem(selectedItems.accessories[0]) : undefined} 
                  label="Acc" 
                  template={cardTemplate}
                  count={selectedItems.accessories.length > 1 ? selectedItems.accessories.length : undefined}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


// Item Selection Card
function ItemSelectCard({ item, selected, onClick }: { item: WardrobeItem; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`relative aspect-square rounded-md border-2 cursor-pointer transition-all overflow-hidden ${
        selected ? "border-purple-500 ring-2 ring-purple-500/30" : "border-border hover:border-muted-foreground"
      }`}
    >
      <Image
        src={item.processedImageUrl || item.imageUrl}
        alt={item.brand || "Item"}
        fill
        className="object-contain p-2"
      />
      {selected && (
        <div className="absolute top-1 right-1 bg-purple-500 rounded-full p-0.5">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}
    </div>
  )
}

// Preview Slot
function PreviewSlot({ 
  item, 
  label, 
  template,
  count,
}: { 
  item?: WardrobeItem
  label: string
  template: CardTemplate
  count?: number
}) {
  const config = CARD_TEMPLATES[template]
  
  return (
    <div 
      className="relative flex items-center justify-center rounded overflow-hidden"
      style={{ backgroundColor: config.textColor + "10" }}
    >
      {item ? (
        <>
          <Image
            src={item.processedImageUrl || item.imageUrl}
            alt={label}
            fill
            className="object-contain p-1"
          />
          {count && count > 1 && (
            <div 
              className="absolute bottom-1 right-1 text-xs px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: config.accentColor, color: config.background }}
            >
              +{count - 1}
            </div>
          )}
        </>
      ) : (
        <span className="text-xs" style={{ color: config.textColor + "60" }}>{label}</span>
      )}
    </div>
  )
}
