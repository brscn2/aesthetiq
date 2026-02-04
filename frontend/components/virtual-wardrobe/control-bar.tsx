"use client"

import { useState, useRef, useEffect } from "react"
import { Search, Filter, Sparkles, X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Category } from "@/types/api"
import { WARDROBE_COLORS } from "@/lib/colors"

export interface WardrobeFilters {
  category: Category | null
  brand: string | null
  color: string | null // hex value
}

interface WardrobeControlBarProps {
  activeTab: string
  onTabChange: (value: string) => void
  onAddItem: () => void
  searchQuery: string
  onSearchChange: (value: string) => void
  filters: WardrobeFilters
  onFiltersChange: (filters: WardrobeFilters) => void
  availableBrands: string[]
}

const CATEGORY_OPTIONS = [
  { value: Category.TOP, label: "Tops" },
  { value: Category.BOTTOM, label: "Bottoms" },
  { value: Category.OUTERWEAR, label: "Outerwear" },
  { value: Category.FOOTWEAR, label: "Footwear" },
  { value: Category.ACCESSORY, label: "Accessories" },
  { value: Category.DRESS, label: "Dresses" },
]

export function WardrobeControlBar({ 
  activeTab, 
  onTabChange, 
  onAddItem, 
  searchQuery, 
  onSearchChange,
  filters,
  onFiltersChange,
  availableBrands,
}: WardrobeControlBarProps) {
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const filterPanelRef = useRef<HTMLDivElement>(null)
  
  const activeFilterCount = [filters.category, filters.brand, filters.color].filter(Boolean).length

  // Close filter panel when clicking outside
  useEffect(() => {
    if (!showFilterPanel) return
    
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
        setShowFilterPanel(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showFilterPanel])

  const clearFilters = () => {
    onFiltersChange({ category: null, brand: null, color: null })
  }

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
        
        {/* Filter Button & Panel */}
        <div className="relative" ref={filterPanelRef}>
          <Button 
            variant="outline" 
            className="relative border-border bg-card text-foreground hover:bg-accent"
            onClick={() => setShowFilterPanel(!showFilterPanel)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
            {activeFilterCount > 0 && (
              <Badge className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 p-0 text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          
          {/* Filter Panel */}
          {showFilterPanel && (
            <div className="absolute left-0 top-full mt-2 w-72 rounded-lg border border-border bg-card p-4 shadow-lg z-50">
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium text-foreground">Filters</span>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearFilters}>
                    <X className="mr-1 h-3 w-3" />
                    Clear all
                  </Button>
                )}
              </div>
              
              {/* Category Dropdown */}
              <div className="mb-4">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                  Category
                </Label>
                <FilterDropdown
                  value={filters.category ? CATEGORY_OPTIONS.find(c => c.value === filters.category)?.label || null : null}
                  placeholder="All categories"
                  options={CATEGORY_OPTIONS.map(c => c.label)}
                  onChange={(label) => {
                    const category = label ? CATEGORY_OPTIONS.find(c => c.label === label)?.value || null : null
                    onFiltersChange({ ...filters, category })
                  }}
                />
              </div>
              
              {/* Brand Dropdown */}
              <div className="mb-4">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                  Brand
                </Label>
                <FilterDropdown
                  value={filters.brand}
                  placeholder="All brands"
                  options={availableBrands}
                  onChange={(brand) => onFiltersChange({ ...filters, brand })}
                  searchable
                />
              </div>
              
              {/* Color Filter */}
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                  Color
                </Label>
                <div className="grid grid-cols-6 gap-2">
                  {WARDROBE_COLORS.map((color) => (
                    <button
                      key={color.hex}
                      className={`w-8 h-8 rounded-full border transition-all ${
                        filters.color === color.hex 
                          ? 'border-purple-500 scale-110 border-2' 
                          : 'border-muted-foreground/30 hover:border-muted-foreground/50'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      onClick={() => onFiltersChange({ 
                        ...filters, 
                        color: filters.color === color.hex ? null : color.hex 
                      })}
                      title={color.name}
                    />
                  ))}
                </div>
                {filters.color && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Showing: {WARDROBE_COLORS.find(c => c.hex === filters.color)?.name}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
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
              value="my-outfits"
              className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-200"
            >
              My Outfits
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
            <TabsTrigger
              value="disliked"
              className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-200"
            >
              Disliked
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

// Reusable Filter Dropdown Component
interface FilterDropdownProps {
  value: string | null
  placeholder: string
  options: string[]
  onChange: (value: string | null) => void
  searchable?: boolean
}

function FilterDropdown({ value, placeholder, options, onChange, searchable }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const filteredOptions = searchable && search
    ? options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()))
    : options

  useEffect(() => {
    if (!isOpen) return
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch("")
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 text-sm border border-border rounded-md bg-background hover:bg-accent"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-full max-h-48 overflow-auto rounded-md border border-border bg-card shadow-lg z-50">
          {searchable && (
            <div className="p-2 border-b border-border">
              <Input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-sm"
                autoFocus
              />
            </div>
          )}
          
          {/* Clear option */}
          <div
            className="px-3 py-2 text-sm cursor-pointer hover:bg-accent text-muted-foreground"
            onClick={() => {
              onChange(null)
              setIsOpen(false)
              setSearch("")
            }}
          >
            {placeholder}
          </div>
          
          {filteredOptions.map((option) => (
            <div
              key={option}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-accent ${
                value === option ? "bg-purple-500/10 text-purple-600" : ""
              }`}
              onClick={() => {
                onChange(option)
                setIsOpen(false)
                setSearch("")
              }}
            >
              {option}
            </div>
          ))}
          
          {filteredOptions.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  )
}
