"use client"

import { useState, useCallback, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ClothingList } from "@/components/admin/clothing-list"
import { ClothingForm } from "@/components/admin/clothing-form"
import { WardrobeItem } from "@/lib/admin-api"

export default function ClothingPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const searchParams = useSearchParams()
  const router = useRouter()

  // Auto-open dialog if action=add in URL
  useEffect(() => {
    if (searchParams.get("action") === "add") {
      setEditingItem(null)
      setFormOpen(true)
      // Remove query param from URL
      router.replace("/admin/clothing")
    }
  }, [searchParams, router])

  const handleEdit = (item: WardrobeItem) => {
    setEditingItem(item)
    setFormOpen(true)
  }

  const handleAdd = () => {
    setEditingItem(null)
    setFormOpen(true)
  }

  const handleFormSuccess = useCallback(() => {
    // Increment key to force ClothingList to remount and reload data
    setRefreshKey((prev) => prev + 1)
  }, [])

  const handleFormClose = (open: boolean) => {
    setFormOpen(open)
    if (!open) {
      setEditingItem(null)
    }
  }

  return (
    <>
      <ClothingList key={refreshKey} onEdit={handleEdit} onAdd={handleAdd} />
      <ClothingForm
        item={editingItem}
        open={formOpen}
        onOpenChange={handleFormClose}
        onSuccess={handleFormSuccess}
      />
    </>
  )
}
