"use client"

import { useState } from "react"
import { ClothingList } from "@/components/admin/clothing-list"
import { ClothingForm } from "@/components/admin/clothing-form"
import { WardrobeItem } from "@/lib/admin-api"

export default function ClothingPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null)

  const handleEdit = (item: WardrobeItem) => {
    setEditingItem(item)
    setFormOpen(true)
  }

  const handleAdd = () => {
    setEditingItem(null)
    setFormOpen(true)
  }

  const handleFormSuccess = (item: WardrobeItem) => {
    // The ClothingList component will refresh automatically
    // when the form closes successfully
  }

  const handleFormClose = (open: boolean) => {
    setFormOpen(open)
    if (!open) {
      setEditingItem(null)
    }
  }

  return (
    <>
      <ClothingList onEdit={handleEdit} onAdd={handleAdd} />
      <ClothingForm
        item={editingItem}
        open={formOpen}
        onOpenChange={handleFormClose}
        onSuccess={handleFormSuccess}
      />
    </>
  )
}