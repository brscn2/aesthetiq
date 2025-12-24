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
  searchQuery: string
  onSearchChange: (value: string) => void
}

export function WardrobeControlBar({ activeTab, onTabChange, onAddItem, searchQuery, onSearchChange }: WardrobeControlBarProps) {
  return (
    <div className="sticky top-0 z-10 flex h-auto flex-col gap-4 border-b border-border bg-background/95 px-6 py-4 backdrop-blur-md md:h-20 md:flex-row md:items-center md:justify-between md:gap-0">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search wardrobe..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-10 border-border bg-card pl-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-purple-500"
          />
        </div>
        <Button variant="outline" className="relative border-border bg-card text-foreground hover:bg-accent">
          <Filter className="mr-2 h-4 w-4" />
          Filter
          <Badge className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 p-0 text-[10px]">
            2
          </Badge>
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full md:w-auto">
          <TabsList className="bg-card text-foreground">
            <TabsTrigger
              value="all-items"
              className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-200"
            >
              All Items
            </TabsTrigger>
            <TabsTrigger
              value="outfits"
              className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-200"
            >
              Create Outfit
            </TabsTrigger>
            <TabsTrigger
              value="wishlist"
              className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-200"
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
