"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ChatStylist } from "@/components/chat-stylist"
import { StyleDnaSummary } from "@/components/style-dna-summary"
import { StyleDnaPanel } from "@/components/style-dna-panel"
import { TrendsSidebar } from "@/components/trends-sidebar"
import { Button } from "@/components/ui/button"
import { TrendingUp, X, Palette } from "lucide-react"

export default function DashboardPage() {
  const [showTrends, setShowTrends] = useState(false)
  const [showStyleDna, setShowStyleDna] = useState(false)

  return (
    <DashboardLayout>
      <div className="flex h-full flex-col overflow-hidden">
        {/* Style DNA Summary - Compact Header */}
        {!showStyleDna && (
          <div className="flex-shrink-0 border-b border-border bg-background">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-0">
              <div
                onClick={() => setShowStyleDna(true)}
                className="flex-1 w-full sm:w-auto cursor-pointer hover:opacity-80 transition-opacity"
              >
                <StyleDnaSummary />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTrends(!showTrends)}
                className="border-border/50 w-full sm:w-auto"
              >
                {showTrends ? (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Hide Trends</span>
                    <span className="sm:hidden">Hide</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Show Trends</span>
                    <span className="sm:hidden">Trends</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Style DNA Panel - Toggle */}
          {showStyleDna && (
            <>
              {/* Mobile: Full Screen Modal */}
              <div className="lg:hidden fixed inset-0 z-50 bg-background overflow-hidden">
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between border-b border-border p-4">
                    <h2 className="font-serif text-xl font-bold text-foreground">Your Style DNA</h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowStyleDna(false)}
                      className="border-border/50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <StyleDnaPanel />
                  </div>
                </div>
              </div>
              {/* Desktop: Side Panel */}
              <div className="hidden lg:block w-2/5 border-r border-border overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-serif text-2xl font-bold text-foreground">Your Style DNA</h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowStyleDna(false)}
                      className="border-border/50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <StyleDnaPanel />
                </div>
              </div>
            </>
          )}

          {/* Chat Interface */}
          <div
            className={`flex-1 overflow-hidden min-h-0 transition-all ${
              showStyleDna ? "lg:w-3/5" : showTrends ? "lg:w-2/3" : "w-full"
            }`}
          >
            <ChatStylist />
          </div>

          {/* Trends Sidebar - Toggle */}
          {showTrends && (
            <>
              {/* Mobile: Full Screen Modal */}
              <div className="lg:hidden fixed inset-0 z-50 bg-background overflow-hidden">
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between border-b border-border p-4">
                    <h2 className="font-semibold text-foreground">Trending Now</h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTrends(false)}
                      className="border-border/50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <div className="mx-auto w-full max-w-md px-4">
                      <TrendsSidebar />
                    </div>
                  </div>
                </div>
              </div>
              {/* Desktop: Side Panel */}
              <div className="hidden lg:block w-80 border-l border-border">
                <TrendsSidebar />
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
