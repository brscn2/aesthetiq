"use client"

import { useState } from "react"
import { WardrobeItem } from "@/types/api"
import { Button } from "@/components/ui/button"
import { Shirt } from "lucide-react"
import { VirtualTryOn } from "./virtual-tryon"

interface SingleItemTryOnProps {
  item: WardrobeItem
  personImageUrl?: string
}

export function SingleItemTryOn({ item, personImageUrl }: SingleItemTryOnProps) {
  const [showTryOn, setShowTryOn] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowTryOn(true)}
        className="flex items-center gap-2"
      >
        <Shirt className="h-4 w-4" />
        Try On
      </Button>

      {showTryOn && (
        <VirtualTryOn
          singleItem={item}
          onClose={() => setShowTryOn(false)}
          personImageUrl={personImageUrl}
        />
      )}
    </>
  )
}