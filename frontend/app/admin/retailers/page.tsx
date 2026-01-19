"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { RetailerList } from "@/components/admin/retailer-list"
import { RetailerForm } from "@/components/admin/retailer-form"
import { Retailer } from "@/lib/admin-api"

export default function RetailersPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editingRetailer, setEditingRetailer] = useState<Retailer | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get("action") === "add") {
      setEditingRetailer(null)
      setFormOpen(true)
      router.replace("/admin/retailers")
    }
  }, [searchParams, router])

  const handleEdit = (retailer: Retailer) => {
    setEditingRetailer(retailer)
    setFormOpen(true)
  }

  const handleAdd = () => {
    setEditingRetailer(null)
    setFormOpen(true)
  }

  const handleFormSuccess = (retailer: Retailer) => {
    // The RetailerList component will refresh automatically
  }

  const handleFormClose = (open: boolean) => {
    setFormOpen(open)
    if (!open) {
      setEditingRetailer(null)
    }
  }

  return (
    <>
      <RetailerList onEdit={handleEdit} onAdd={handleAdd} />
      <RetailerForm
        retailer={editingRetailer}
        open={formOpen}
        onOpenChange={handleFormClose}
        onSuccess={handleFormSuccess}
      />
    </>
  )
}
