"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ChatStylist } from "@/components/chat-stylist"
import { StyleDnaSummary } from "@/components/style-dna-summary"
import { TrendsSidebar } from "@/components/trends-sidebar"
import { Button } from "@/components/ui/button"
import { TrendingUp, X } from "lucide-react"

export default function DashboardPage() {
  const [showTrends, setShowTrends] = useState(false)

  return (
    <DashboardLayout>
      <div className="flex h-full flex-col overflow-hidden">
        {/* Style DNA Summary - Compact Header */}
        <div className="flex-shrink-0 border-b border-border bg-background">
          <div className="flex items-center justify-between px-6">
            <StyleDnaSummary />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTrends(!showTrends)}
              className="border-border/50"
            >
              {showTrends ? (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Hide Trends
                </>
              ) : (
                <>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Show Trends
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Chat Interface */}
          <div className={`flex-1 overflow-hidden min-h-0 transition-all ${showTrends ? "lg:w-2/3" : "w-full"}`}>
            <ChatStylist />
          </div>

          {/* Trends Sidebar - Toggle */}
          {showTrends && (
            <div className="hidden lg:block w-80 border-l border-border">
              <TrendsSidebar />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
