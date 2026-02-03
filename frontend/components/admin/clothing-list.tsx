"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Plus,
  Shirt,
  Download,
  User,
} from "lucide-react"
import { useAdminApi, WardrobeItem, Category } from "@/lib/admin-api"
import { useAdminLoading } from "@/hooks/use-admin-loading"
import { AdminErrorHandler } from "@/lib/admin-error-handler"
import { getClosestColorName } from "@/lib/colors"

interface ClothingListProps {
  onEdit: (item: WardrobeItem) => void
  onAdd: () => void
}

interface UserInfo {
  _id: string
  clerkId?: string
  email: string
  name?: string
  firstName?: string
  lastName?: string
}

const categoryColors: Record<string, string> = {
  TOP: "bg-blue-50 text-blue-700",
  BOTTOM: "bg-green-50 text-green-700",
  OUTERWEAR: "bg-indigo-50 text-indigo-700",
  FOOTWEAR: "bg-purple-50 text-purple-700",
  ACCESSORY: "bg-orange-50 text-orange-700",
  DRESS: "bg-pink-50 text-pink-700",
}

const categoryLabels: Record<string, string> = {
  TOP: "Top",
  BOTTOM: "Bottom",
  OUTERWEAR: "Outerwear",
  FOOTWEAR: "Footwear",
  ACCESSORY: "Accessory",
  DRESS: "Dress",
}

export function ClothingList({ onEdit, onAdd }: ClothingListProps) {
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [userMap, setUserMap] = useState<Map<string, UserInfo>>(new Map())
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<Category | "ALL">("ALL")
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL")
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<WardrobeItem | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

  const api = useAdminApi()
  const apiRef = useRef(api)
  const { isLoading, execute } = useAdminLoading()
  const { execute: executeDelete } = useAdminLoading()

  apiRef.current = api

  // Load users once for name lookup
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersData = await apiRef.current.users.getAll()
        const usersList = usersData as unknown as UserInfo[]

        const map = new Map<string, UserInfo>()
        usersList.forEach((user) => {
          // Map by clerkId (primary key for wardrobe items)
          if (user.clerkId) {
            map.set(user.clerkId, user)
          }
          // Also map by MongoDB _id
          if (user._id) {
            map.set(user._id, user)
          }
          // Map by email as fallback
          if (user.email) {
            map.set(user.email, user)
          }
        })
        setUserMap(map)
        console.log("Loaded users:", usersList.length, "Map size:", map.size)
      } catch (error) {
        console.warn("Failed to load users:", error)
      }
    }
    loadUsers()
  }, [])

  const getUserDisplayName = (userId: string): string => {
    // First try direct lookup
    const user = userMap.get(userId)
    if (user) {
      if (user.name) return user.name
      if (user.firstName && user.lastName) {
        return `${user.firstName} ${user.lastName}`
      }
      if (user.email) return user.email.split("@")[0]
    }

    // If userId is purely numeric or doesn't look like a Clerk ID, it's likely old test data
    if (/^\d+$/.test(userId) || (!userId.startsWith("user_") && !userMap.has(userId))) {
      return "Unknown User"
    }

    // Show truncated ID as last resort
    return userId.slice(-8)
  }

  const loadItems = async () => {
    const result = await execute(
      () =>
        api.wardrobe.getAll({
          search: searchTerm || undefined,
          category: selectedCategory !== "ALL" ? selectedCategory : undefined,
          brand: selectedBrand !== "ALL" ? selectedBrand : undefined,
        }),
      "Loading clothing items"
    )
    if (result) {
      setItems(result.items)
    }
  }

  useEffect(() => {
    loadItems()
  }, [searchTerm, selectedCategory, selectedBrand])

  const handleDelete = async () => {
    if (!itemToDelete) return

    const success = await executeDelete(
      () => api.wardrobe.delete(itemToDelete._id),
      "Deleting clothing item"
    )

    if (success !== null) {
      AdminErrorHandler.showSuccess("Clothing item deleted successfully")
      setItems(items.filter((item) => item._id !== itemToDelete._id))
      setDeleteDialogOpen(false)
      setItemToDelete(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return

    const promises = Array.from(selectedItems).map((id) => api.wardrobe.delete(id))

    try {
      await Promise.all(promises)
      AdminErrorHandler.showSuccess(`${selectedItems.size} items deleted successfully`)
      setItems(items.filter((item) => !selectedItems.has(item._id)))
      setSelectedItems(new Set())
      setBulkDeleteDialogOpen(false)
    } catch (error) {
      AdminErrorHandler.handle(error, "Bulk delete failed")
    }
  }

  const openDeleteDialog = (item: WardrobeItem) => {
    setItemToDelete(item)
    setDeleteDialogOpen(true)
  }

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems)
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId)
    } else {
      newSelection.add(itemId)
    }
    setSelectedItems(newSelection)
  }

  const toggleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(items.map((item) => item._id)))
    }
  }

  const uniqueBrands = Array.from(new Set(items.map((item) => item.brand).filter(Boolean)))
  const filteredItems = items

  const handleExport = () => {
    if (items.length === 0) {
      AdminErrorHandler.handle(new Error("No items to export"))
      return
    }

    // Create CSV content
    const headers = ["ID", "Category", "Subcategory", "Brand", "User", "Colors", "Created"]
    const rows = items.map((item) => [
      item._id,
      item.category,
      item.subCategory || "",
      item.brand || "",
      getUserDisplayName(item.userId),
      (item.colors || []).join("; "),
      item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "",
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    // Download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `clothing-items-${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)

    AdminErrorHandler.showSuccess(`Exported ${items.length} items to CSV`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Clothing Management</h2>
          <p className="text-muted-foreground">Manage clothing items and wardrobe database</p>
        </div>
        <div className="flex gap-2">
          {selectedItems.size > 0 && (
            <Button variant="destructive" onClick={() => setBulkDeleteDialogOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete ({selectedItems.size})
            </Button>
          )}
          <Button onClick={onAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select
          value={selectedCategory}
          onValueChange={(value) => setSelectedCategory(value as Category | "ALL")}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedBrand} onValueChange={setSelectedBrand}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Brands</SelectItem>
            {uniqueBrands.map((brand) => (
              <SelectItem key={brand} value={brand!}>
                {brand}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shirt className="h-5 w-5" />
            Clothing Items ({filteredItems.length})
          </CardTitle>
          <CardDescription>Manage your clothing database with advanced filtering</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <Shirt className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">No clothing items found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm || selectedCategory !== "ALL" || selectedBrand !== "ALL"
                  ? "Try adjusting your search terms or filters"
                  : "Get started by adding your first clothing item"}
              </p>
              {!searchTerm && selectedCategory === "ALL" && selectedBrand === "ALL" && (
                <Button onClick={onAdd} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedItems.size === items.length && items.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.has(item._id)}
                        onCheckedChange={() => toggleItemSelection(item._id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img
                          src={item.processedImageUrl || item.imageUrl}
                          alt="Clothing item"
                          className="h-12 w-12 rounded object-cover"
                        />
                        <div>
                          <div className="font-medium">
                            {item.subCategory || categoryLabels[item.category]}
                          </div>
                          <div className="text-sm text-muted-foreground">ID: {item._id.slice(-8)}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={categoryColors[item.category]}>
                        {categoryLabels[item.category]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.brand ? (
                        <span className="font-medium">{item.brand}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{getUserDisplayName(item.userId)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.colors && item.colors.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {item.colors.map((color, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded border bg-card text-xs"
                            >
                              <div
                                className="w-3 h-3 rounded border"
                                style={{ backgroundColor: color }}
                              />
                              <span>{getClosestColorName(color)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(item)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(item)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Clothing Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this clothing item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Items</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedItems.size} clothing items? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete {selectedItems.size} Items
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
