"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { WardrobeControlBar } from "@/components/virtual-wardrobe/control-bar"
import { InventoryGrid } from "@/components/virtual-wardrobe/inventory-grid"
import { WardrobeIntelligence } from "@/components/virtual-wardrobe/wardrobe-intelligence"
import { AddItemModal } from "@/components/virtual-wardrobe/add-item-modal"
import { Button } from "@/components/ui/button"
import { Brain, X } from "lucide-react"

export default function VirtualWardrobePage() {
  const [activeTab, setActiveTab] = useState("all-items")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [showIntelligence, setShowIntelligence] = useState(false)

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-theme(spacing.16))] flex-col overflow-hidden bg-background text-foreground md:h-screen">
        {/* Control Bar */}
        <WardrobeControlBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onAddItem={() => setIsAddModalOpen(true)}
        />

        <div className="flex flex-1 overflow-hidden">
          {/* Main Inventory Grid */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
            <InventoryGrid />
          </main>

          {/* Intelligence Sidebar - Desktop */}
          <aside className="hidden w-[350px] overflow-y-auto border-l border-white/10 bg-[#121212] p-6 lg:block">
            <WardrobeIntelligence />
          </aside>
        </div>

        {/* Intelligence Toggle Button - Mobile */}
        <div className="fixed bottom-6 right-6 z-40 lg:hidden">
          <Button
            size="lg"
            className="h-14 w-14 rounded-full bg-primary shadow-lg"
            onClick={() => setShowIntelligence(true)}
          >
            <Brain className="h-6 w-6" />
          </Button>
        </div>

        {/* Intelligence Modal - Mobile */}
        {showIntelligence && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm lg:hidden"
              onClick={() => setShowIntelligence(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:hidden">
              <div className="w-full max-w-md rounded-lg border border-white/10 bg-[#121212] p-6 max-h-[90vh] overflow-y-auto">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-serif text-xl font-bold text-white">Wardrobe Intelligence</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowIntelligence(false)}
                    className="text-white hover:bg-white/10"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <WardrobeIntelligence />
              </div>
            </div>
          </>
        )}

        {/* Add Item Modal - Visual Representation */}
        <AddItemModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      </div>
    </DashboardLayout>
  )
}
