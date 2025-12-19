"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Shirt } from "lucide-react"
import Link from "next/link"

export default function ClothingPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clothing Management</h1>
          <p className="text-muted-foreground">
            Manage clothing items and wardrobe database
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/clothing/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Link>
        </Button>
      </div>

      {/* Coming Soon Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shirt className="h-5 w-5" />
            Clothing Management Interface
          </CardTitle>
          <CardDescription>
            This feature will be implemented in Task 8
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            The clothing management interface will include:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Clothing item list with advanced filtering</li>
            <li>Create and edit clothing item forms</li>
            <li>Brand association and management</li>
            <li>Image upload and processing</li>
            <li>Bulk operations and export functionality</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}