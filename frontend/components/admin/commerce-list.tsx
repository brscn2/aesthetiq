"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Plus,
  ShoppingBag,
  ExternalLink,
  CheckCircle,
  XCircle,
  Store
} from "lucide-react"
import { useAdminApi, CommerceItem, Retailer, Category } from "@/lib/admin-api"
import { useAdminLoading } from "@/hooks/use-admin-loading"
import { AdminErrorHandler } from "@/lib/admin-error-handler"

interface CommerceListProps {
  onEdit: (item: CommerceItem) => void
  onAdd: () => void
}

export function CommerceList({ onEdit, onAdd }: CommerceListProps) {
  const [items, setItems] = useState<CommerceItem[]>([])
  const [retailers, setRetailers] = useState<Retailer[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [retailerFilter, setRetailerFilter] = useState<string>("all")
  const [stockFilter, setStockFilter] = useState<string>("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<CommerceItem | null>(null)
  
  const api = useAdminApi()
  const { isLoading, execute } = useAdminLoading()
  const { execute: executeDelete } = useAdminLoading()

  const loadItems = async () => {
    const result = await execute(
      () => api.commerce.getAll({
        search: searchTerm || undefined,
        category: categoryFilter !== "all" ? categoryFilter as Category : undefined,
        retailerId: retailerFilter !== "all" ? retailerFilter : undefined,
        inStock: stockFilter !== "all" ? stockFilter === "inStock" : undefined,
        limit: 100,
      }),
      "Loading commerce items"
    )
    if (result) {
      setItems(result.items)
    }
  }

  const loadRetailers = async () => {
    const result = await api.retailers.getAll({ isActive: true, limit: 100 })
    if (result) {
      setRetailers(result.retailers)
    }
  }

  useEffect(() => {
    loadRetailers()
  }, [])

  useEffect(() => {
    loadItems()
  }, [searchTerm, categoryFilter, retailerFilter, stockFilter])

  const handleDelete = async () => {
    if (!itemToDelete) return

    const success = await executeDelete(
      () => api.commerce.delete(itemToDelete._id),
      "Deleting commerce item"
    )

    if (success !== null) {
      AdminErrorHandler.showSuccess("Commerce item deleted successfully")
      setItems(items.filter(i => i._id !== itemToDelete._id))
      setDeleteDialogOpen(false)
      setItemToDelete(null)
    }
  }

  const openDeleteDialog = (item: CommerceItem) => {
    setItemToDelete(item)
    setDeleteDialogOpen(true)
  }

  const formatPrice = (price?: number, currency?: string) => {
    if (price === undefined) return "—"
    const amount = price / 100
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount)
  }

  const getRetailerName = (retailerId: string | Retailer) => {
    if (typeof retailerId === 'object' && retailerId.name) {
      return retailerId.name
    }
    const retailer = retailers.find(r => r._id === retailerId)
    return retailer?.name || 'Unknown'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Commerce Items</h2>
          <p className="text-muted-foreground">
            Manage products from online retailers
          </p>
        </div>
        <Button onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[150px]">
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

        <Select value={retailerFilter} onValueChange={setRetailerFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Retailer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Retailers</SelectItem>
            {retailers.map((retailer) => (
              <SelectItem key={retailer._id} value={retailer._id}>
                {retailer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Stock" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock</SelectItem>
            <SelectItem value="inStock">In Stock</SelectItem>
            <SelectItem value="outOfStock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Items List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Products ({items.length})
          </CardTitle>
          <CardDescription>
            Browse and manage commerce items from retailers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">No items found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm || categoryFilter !== "all" || retailerFilter !== "all" 
                  ? "Try adjusting your filters" 
                  : "Get started by adding your first commerce item"}
              </p>
              {!searchTerm && categoryFilter === "all" && retailerFilter === "all" && (
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
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Retailer</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-10 w-10 rounded object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium max-w-[200px] truncate">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.brand || "No brand"} • {item.sku || "No SKU"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {item.category}
                        {item.subCategory && ` / ${item.subCategory}`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Store className="h-3 w-3 text-muted-foreground" />
                        {getRetailerName(item.retailerId)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatPrice(item.price, item.currency)}
                    </TableCell>
                    <TableCell>
                      {item.inStock ? (
                        <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          In Stock
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-red-500/10 text-red-600">
                          <XCircle className="mr-1 h-3 w-3" />
                          Out of Stock
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <a
                        href={item.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View
                      </a>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Commerce Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
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
    </div>
  )
}
