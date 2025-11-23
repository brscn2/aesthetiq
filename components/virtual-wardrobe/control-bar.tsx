"use client"

import { Search, Filter, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

interface WardrobeControlBarProps {
  activeTab: string
  onTabChange: (value: string) => void
  onAddItem: () => void
}

export function WardrobeControlBar({ activeTab, onTabChange, onAddItem }: WardrobeControlBarProps) {
  return (
    <div className="sticky top-0 z-10 flex h-auto flex-col gap-4 border-b border-white/10 bg-[#121212]/95 px-6 py-4 backdrop-blur-md md:h-20 md:flex-row md:items-center md:justify-between md:gap-0">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search wardrobe..."
            className="h-10 border-white/10 bg-white/5 pl-9 text-sm text-white placeholder:text-muted-foreground focus-visible:ring-purple-500"
          />
        </div>
        <Button variant="outline" className="relative border-white/10 bg-white/5 text-white hover:bg-white/10">
          <Filter className="mr-2 h-4 w-4" />
          Filter
          <Badge className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 p-0 text-[10px]">
            2
          </Badge>
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full md:w-auto">
          <TabsList className="bg-white/5 text-muted-foreground">
            <TabsTrigger
              value="all-items"
              className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-200"
            >
              All Items
            </TabsTrigger>
            <TabsTrigger
              value="outfits"
              className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-200"
            >
              Create Outfit
            </TabsTrigger>
            <TabsTrigger
              value="wishlist"
              className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-200"
            >
              Wishlist
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Button
          onClick={onAddItem}
          className="bg-gradient-to-r from-purple-600 to-rose-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:from-purple-700 hover:to-rose-700"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Add New Item
        </Button>
      </div>
    </div>
  )
}
