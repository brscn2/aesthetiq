"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { DashboardLayout } from "@/components/dashboard-layout"
import { StyleItemCard } from "@/components/style-item-card"
import { findYourStyle, StyleItem, FindStyleItemsParams } from "@/lib/style-api"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

export default function FindYourStylePage() {
  const { getToken } = useAuth()
  const [items, setItems] = useState<StyleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<FindStyleItemsParams>({
    limit: 50,
  })

  const loadItems = async (currentPage: number = 1) => {
    try {
      setLoading(true)
      setError(null)
      const token = await getToken()
      if (!token) {
        setError("Authentication required")
        return
      }

      console.log("Loading items with params:", {
        ...filters,
        page: currentPage,
      })

      const response = await findYourStyle(token, {
        ...filters,
        page: currentPage,
      })

      console.log("API Response:", response)

      setItems(response.items)
      setTotal(response.total)
      setPage(response.page)
    } catch (err: any) {
      console.error("Error loading style items:", err)
      setError(err.message || "Failed to load items")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems(1)
  }, [filters])

  const handleFilterChange = (key: keyof FindStyleItemsParams, value: string) => {
    setPage(1)
    setFilters((prev) => ({
      ...prev,
      [key]: value === "all" ? undefined : value,
    }))
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    loadItems(newPage)
  }

  const totalPages = Math.ceil(total / (filters.limit || 50))

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
            Find Your Own Style
          </h1>
          <p className="mt-2 text-muted-foreground">
            Discover fashion items that match your unique style
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <Select
            value={filters.gender || "all"}
            onValueChange={(value) => handleFilterChange("gender", value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genders</SelectItem>
              <SelectItem value="MEN">Men</SelectItem>
              <SelectItem value="WOMEN">Women</SelectItem>
              <SelectItem value="UNISEX">Unisex</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.category || "all"}
            onValueChange={(value) => handleFilterChange("category", value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="TOP">Tops</SelectItem>
              <SelectItem value="BOTTOM">Bottoms</SelectItem>
              <SelectItem value="SHOE">Shoes</SelectItem>
              <SelectItem value="ACCESSORY">Accessories</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.store || "all"}
            onValueChange={(value) => handleFilterChange("store", value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Store" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              <SelectItem value="zara">Zara</SelectItem>
              <SelectItem value="hm">H&M</SelectItem>
              <SelectItem value="mango">Mango</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.brand || "all"}
            onValueChange={(value) => handleFilterChange("brand", value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              <SelectItem value="Zara">Zara</SelectItem>
              <SelectItem value="H&M">H&M</SelectItem>
              <SelectItem value="Mango">Mango</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground">
          Showing {items.length} of {total} items
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        {/* Items Grid */}
        {!loading && !error && items.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <StyleItemCard key={item._id} item={item} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <p className="text-muted-foreground">No items found</p>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
