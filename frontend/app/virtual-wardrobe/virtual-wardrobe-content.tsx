"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { WardrobeControlBar, WardrobeFilters } from "@/components/virtual-wardrobe/control-bar"
import { InventoryGrid } from "@/components/virtual-wardrobe/inventory-grid"
import { WardrobeIntelligenceComponent } from "@/components/virtual-wardrobe/wardrobe-intelligence-new"
import { AddItemModal } from "@/components/virtual-wardrobe/add-item-modal"
import { OutfitCreator } from "@/components/virtual-wardrobe/outfit-creator"
import { OutfitGrid } from "@/components/virtual-wardrobe/outfit-grid"
import { FashionCardGenerator } from "@/components/virtual-wardrobe/fashion-card-generator"
import { DislikedItemsPanel } from "@/components/virtual-wardrobe/disliked-items-panel"
import { Button } from "@/components/ui/button"
import { Brain, X } from "lucide-react"
import { useApi } from "@/lib/api"
import { Outfit } from "@/types/api"

export default function VirtualWardrobeContent() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState("all-items")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [showIntelligence, setShowIntelligence] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState<WardrobeFilters>({ category: null, brand: null, color: null })
  const [availableBrands, setAvailableBrands] = useState<string[]>([])
  
  // Outfit state
  const [editingOutfit, setEditingOutfit] = useState<Outfit | null>(null)
  const [viewingOutfit, setViewingOutfit] = useState<Outfit | null>(null)
  const [isCreatingOutfit, setIsCreatingOutfit] = useState(false)
  const [prefillItemIds, setPrefillItemIds] = useState<string[] | null>(null)
  const [prefillKey, setPrefillKey] = useState<string | null>(null)
  
  const { brandsApi } = useApi()

  const tabParam = searchParams.get("tab")
  const prefillParam = searchParams.get("prefillItems")

  // Load available brands for filter
  useEffect(() => {
    brandsApi.getAll().then(({ brands }) => {
      setAvailableBrands(brands.map(b => b.name))
    }).catch(() => {})
  }, [brandsApi])

  // Handle query params for prefilled outfit creation
  useEffect(() => {
    if (tabParam === "outfits" || prefillParam) {
      setActiveTab("outfits")
      setIsCreatingOutfit(true)
      setEditingOutfit(null)
    }

    if (prefillParam) {
      const ids = prefillParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)

      if (ids.length > 0) {
        const uniqueIds = Array.from(new Set(ids))
        setPrefillItemIds(uniqueIds)
        setPrefillKey(uniqueIds.join(","))
      }
    } else {
      setPrefillItemIds(null)
      setPrefillKey(null)
    }
  }, [tabParam, prefillParam])

  // Handle tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    if (tab === "outfits") {
      setIsCreatingOutfit(true)
      setEditingOutfit(null)
    } else {
      setIsCreatingOutfit(false)
      setEditingOutfit(null)
    }
  }

  // Render main content based on active tab
  const renderContent = () => {
    if (activeTab === "outfits" && (isCreatingOutfit || editingOutfit)) {
      return (
        <OutfitCreator
          editOutfit={editingOutfit}
          prefillItemIds={prefillItemIds}
          prefillKey={prefillKey}
          onSaved={() => {
            setIsCreatingOutfit(false)
            setEditingOutfit(null)
            setActiveTab("my-outfits")
          }}
          onCancel={() => {
            setIsCreatingOutfit(false)
            setEditingOutfit(null)
            setActiveTab("all-items")
          }}
        />
      )
    }

    if (activeTab === "my-outfits") {
      return (
        <OutfitGrid
          onEdit={(outfit) => {
            setEditingOutfit(outfit)
            setIsCreatingOutfit(true)
            setActiveTab("outfits")
          }}
          onView={(outfit) => setViewingOutfit(outfit)}
        />
      )
    }

    if (activeTab === "disliked") {
      return <DislikedItemsPanel />
    }

    return <InventoryGrid searchQuery={searchQuery} filters={filters} />
  }

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] flex-col overflow-hidden bg-background text-foreground md:h-screen">
      {/* Control Bar */}
      <WardrobeControlBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onAddItem={() => setIsAddModalOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFiltersChange={setFilters}
        availableBrands={availableBrands}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {renderContent()}
        </main>

        {/* Intelligence Sidebar - Desktop (hide when creating outfit) */}
        {activeTab !== "outfits" && (
          <aside className="hidden w-[480px] overflow-y-auto border-l border-border bg-background p-7 lg:block">
            <WardrobeIntelligenceComponent />
          </aside>
        )}
      </div>

      {/* Intelligence Toggle Button - Mobile */}
      {activeTab !== "outfits" && (
        <div className="fixed bottom-6 right-6 z-40 lg:hidden">
          <Button
            size="lg"
            className="h-14 w-14 rounded-full bg-primary shadow-lg"
            onClick={() => setShowIntelligence(true)}
          >
            <Brain className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Intelligence Modal - Mobile */}
      {showIntelligence && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm lg:hidden"
            onClick={() => setShowIntelligence(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:hidden">
            <div className="w-full max-w-xl rounded-lg border border-border bg-background p-7 max-h-[90vh] overflow-y-auto">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-serif text-xl font-bold text-foreground">Wardrobe Intelligence</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowIntelligence(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <WardrobeIntelligenceComponent />
            </div>
          </div>
        </>
      )}

      {/* Add Item Modal */}
      <AddItemModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />

      {/* Fashion Card Generator Modal */}
      {viewingOutfit && (
        <FashionCardGenerator
          outfit={viewingOutfit}
          onClose={() => setViewingOutfit(null)}
        />
      )}
    </div>
  )
}
