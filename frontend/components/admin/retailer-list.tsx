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
  Store,
  Globe,
  CheckCircle,
  XCircle
} from "lucide-react"
import { useAdminApi, Retailer } from "@/lib/admin-api"
import { useAdminLoading } from "@/hooks/use-admin-loading"
import { AdminErrorHandler } from "@/lib/admin-error-handler"

interface RetailerListProps {
  onEdit: (retailer: Retailer) => void
  onAdd: () => void
}

export function RetailerList({ onEdit, onAdd }: RetailerListProps) {
  const [retailers, setRetailers] = useState<Retailer[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [retailerToDelete, setRetailerToDelete] = useState<Retailer | null>(null)
  
  const api = useAdminApi()
  const { isLoading, execute } = useAdminLoading()
  const { execute: executeDelete } = useAdminLoading()

  const loadRetailers = async () => {
    const result = await execute(
      () => api.retailers.getAll({ search: searchTerm || undefined }),
      "Loading retailers"
    )
    if (result) {
      setRetailers(result.retailers)
    }
  }

  useEffect(() => {
    loadRetailers()
  }, [searchTerm])

  const handleDelete = async () => {
    if (!retailerToDelete) return

    const success = await executeDelete(
      () => api.retailers.delete(retailerToDelete._id),
      "Deleting retailer"
    )

    if (success !== null) {
      AdminErrorHandler.showSuccess("Retailer deleted successfully")
      setRetailers(retailers.filter(r => r._id !== retailerToDelete._id))
      setDeleteDialogOpen(false)
      setRetailerToDelete(null)
    }
  }

  const openDeleteDialog = (retailer: Retailer) => {
    setRetailerToDelete(retailer)
    setDeleteDialogOpen(true)
  }

  const filteredRetailers = retailers.filter(retailer =>
    retailer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    retailer.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    retailer.country?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Retailer Management</h2>
          <p className="text-muted-foreground">
            Manage online retailers and their information
          </p>
        </div>
        <Button onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Retailer
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search retailers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Retailer List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Retailers ({filteredRetailers.length})
          </CardTitle>
          <CardDescription>
            Manage your online retailer database
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredRetailers.length === 0 ? (
            <div className="text-center py-8">
              <Store className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">No retailers found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm ? "Try adjusting your search terms" : "Get started by adding your first retailer"}
              </p>
              {!searchTerm && (
                <Button onClick={onAdd} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Retailer
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Retailer</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRetailers.map((retailer) => (
                  <TableRow key={retailer._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {retailer.logoUrl ? (
                          <img
                            src={retailer.logoUrl}
                            alt={`${retailer.name} logo`}
                            className="h-8 w-8 rounded object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                            <Store className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{retailer.name}</div>
                          <div className="text-sm text-muted-foreground">
                            ID: {retailer._id.slice(-8)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate">
                        {retailer.description || "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {retailer.country ? (
                        <Badge variant="secondary">{retailer.country}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {retailer.isActive ? (
                        <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-red-500/10 text-red-600">
                          <XCircle className="mr-1 h-3 w-3" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {retailer.website ? (
                        <a
                          href={retailer.website}
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
                          <DropdownMenuItem onClick={() => onEdit(retailer)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(retailer)}
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
            <AlertDialogTitle>Delete Retailer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{retailerToDelete?.name}"? This action cannot be undone.
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
