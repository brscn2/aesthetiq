"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { WardrobeControlBar } from "@/components/virtual-wardrobe/control-bar"
import { InventoryGrid } from "@/components/virtual-wardrobe/inventory-grid"
import { WardrobeIntelligence } from "@/components/virtual-wardrobe/wardrobe-intelligence"
import { AddItemModal } from "@/components/virtual-wardrobe/add-item-modal"

export default function VirtualWardrobePage() {
  const [activeTab, setActiveTab] = useState("all-items")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-theme(spacing.16))] flex-col overflow-hidden bg-[#121212] text-foreground md:h-screen">
        {/* Control Bar */}
        <WardrobeControlBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onAddItem={() => setIsAddModalOpen(true)}
        />

        <div className="flex flex-1 overflow-hidden">
          {/* Main Inventory Grid */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            <InventoryGrid />
          </main>

          {/* Intelligence Sidebar */}
          <aside className="hidden w-[350px] overflow-y-auto border-l border-white/10 bg-[#121212] p-6 lg:block">
            <WardrobeIntelligence />
          </aside>
        </div>

        {/* Add Item Modal - Visual Representation */}
        <AddItemModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      </div>
    </DashboardLayout>
  )
}
