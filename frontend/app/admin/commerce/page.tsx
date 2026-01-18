"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CommerceList } from "@/components/admin/commerce-list"
import { CommerceForm } from "@/components/admin/commerce-form"
import { CommerceItem } from "@/lib/admin-api"

export default function CommercePage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CommerceItem | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get("action") === "add") {
      setEditingItem(null)
      setFormOpen(true)
      router.replace("/admin/commerce")
    }
  }, [searchParams, router])

  const handleEdit = (item: CommerceItem) => {
    setEditingItem(item)
    setFormOpen(true)
  }

  const handleAdd = () => {
    setEditingItem(null)
    setFormOpen(true)
  }

  const handleFormSuccess = (item: CommerceItem) => {
    // The CommerceList component will refresh automatically
  }

  const handleFormClose = (open: boolean) => {
    setFormOpen(open)
    if (!open) {
      setEditingItem(null)
    }
  }

  return (
    <>
      <CommerceList onEdit={handleEdit} onAdd={handleAdd} />
      <CommerceForm
        item={editingItem}
        open={formOpen}
        onOpenChange={handleFormClose}
        onSuccess={handleFormSuccess}
      />
    </>
  )
}
