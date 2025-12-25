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
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Plus,
  Package,
  Globe,
  Calendar
} from "lucide-react"
import { useAdminApi, Brand } from "@/lib/admin-api"
import { useAdminLoading } from "@/hooks/use-admin-loading"
import { AdminErrorHandler } from "@/lib/admin-error-handler"

interface BrandListProps {
  onEdit: (brand: Brand) => void
  onAdd: () => void
}

export function BrandList({ onEdit, onAdd }: BrandListProps) {
  const [brands, setBrands] = useState<Brand[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null)
  
  const api = useAdminApi()
  const { isLoading, execute } = useAdminLoading()
  const { execute: executeDelete } = useAdminLoading()

  const loadBrands = async () => {
    const result = await execute(
      () => api.brands.getAll({ search: searchTerm || undefined }),
      "Loading brands"
    )
    if (result) {
      setBrands(result.brands)
    }
  }

  useEffect(() => {
    loadBrands()
  }, [searchTerm])

  const handleDelete = async () => {
    if (!brandToDelete) return

    const success = await executeDelete(
      () => api.brands.delete(brandToDelete._id),
      "Deleting brand"
    )

    if (success !== null) {
      AdminErrorHandler.showSuccess("Brand deleted successfully")
      setBrands(brands.filter(b => b._id !== brandToDelete._id))
      setDeleteDialogOpen(false)
      setBrandToDelete(null)
    }
  }

  const openDeleteDialog = (brand: Brand) => {
    setBrandToDelete(brand)
    setDeleteDialogOpen(true)
  }

  const filteredBrands = brands.filter(brand =>
    brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    brand.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    brand.country?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Brand Management</h2>
          <p className="text-muted-foreground">
            Manage fashion brands and their information
          </p>
        </div>
        <Button onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Brand
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search brands..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Brand List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Brands ({filteredBrands.length})
          </CardTitle>
          <CardDescription>
            Manage your fashion brand database
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredBrands.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">No brands found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm ? "Try adjusting your search terms" : "Get started by adding your first brand"}
              </p>
              {!searchTerm && (
                <Button onClick={onAdd} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Brand
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Founded</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBrands.map((brand) => (
                  <TableRow key={brand._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {brand.logoUrl ? (
                          <img
                            src={brand.logoUrl}
                            alt={`${brand.name} logo`}
                            className="h-8 w-8 rounded object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{brand.name}</div>
                          <div className="text-sm text-muted-foreground">
                            ID: {brand._id.slice(-8)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate">
                        {brand.description || "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {brand.country ? (
                        <Badge variant="secondary">{brand.country}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {brand.foundedYear ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {brand.foundedYear}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {brand.website ? (
                        <a
                          href={brand.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                        >
                          <Globe className="h-3 w-3" />
                          Visit
                        </a>
                      ) : (
                        "—"
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
                          <DropdownMenuItem onClick={() => onEdit(brand)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(brand)}
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
            <AlertDialogTitle>Delete Brand</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{brandToDelete?.name}"? This action cannot be undone.
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