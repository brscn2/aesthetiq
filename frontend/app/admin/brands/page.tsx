"use client"

import { useState } from "react"
import { BrandList } from "@/components/admin/brand-list"
import { BrandForm } from "@/components/admin/brand-form"
import { Brand } from "@/lib/admin-api"

export default function BrandsPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand)
    setFormOpen(true)
  }

  const handleAdd = () => {
    setEditingBrand(null)
    setFormOpen(true)
  }

  const handleFormSuccess = (brand: Brand) => {
    // The BrandList component will refresh automatically
    // when the form closes successfully
  }

  const handleFormClose = (open: boolean) => {
    setFormOpen(open)
    if (!open) {
      setEditingBrand(null)
    }
  }

  return (
    <>
      <BrandList onEdit={handleEdit} onAdd={handleAdd} />
      <BrandForm
        brand={editingBrand}
        open={formOpen}
        onOpenChange={handleFormClose}
        onSuccess={handleFormSuccess}
      />
    </>
  )
}