import { Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import VirtualWardrobeContent from "./virtual-wardrobe-content"

export default function VirtualWardrobePage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="flex h-full items-center justify-center">Loading wardrobe...</div>}>
        <VirtualWardrobeContent />
      </Suspense>
    </DashboardLayout>
  )
}
