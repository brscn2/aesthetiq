"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ChatStylist } from "@/components/chat-stylist"
import { ChatSidebar, type ChatSidebarRef } from "@/components/chat-sidebar"
import { StyleDnaSummary } from "@/components/style-dna-summary"
import { StyleDnaPanel } from "@/components/style-dna-panel"
import { Button } from "@/components/ui/button"
import { X, Menu } from "lucide-react"
import { useChatSessionsApi, type ChatSessionDetail } from "@/lib/chat-sessions"

export default function DashboardPage() {
  const [showStyleDna, setShowStyleDna] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [activeSessionMessages, setActiveSessionMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string; timestamp?: string }>
  >([])
  const [resetTrigger, setResetTrigger] = useState(0)
  const sessionsApi = useChatSessionsApi()
  const sidebarRef = useRef<ChatSidebarRef>(null)
  const desktopSidebarRef = useRef<ChatSidebarRef>(null)

  const handleSelectSession = useCallback(
    async (sessionId: string) => {
      try {
        const session: ChatSessionDetail = await sessionsApi.getChatSession(sessionId)
        setActiveSessionId(sessionId)
        setActiveSessionMessages(
          session.messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
                timestamp: msg.timestamp,
                items: msg.metadata?.items,
                metadata: msg.metadata,
          }))
        )
      } catch (error) {
        console.error("Failed to load session:", error)
      }
    },
    [sessionsApi]
  )

  const handleNewChat = useCallback(() => {
    try {
      // Immediate synchronous state updates for instant UI feedback
      setActiveSessionId(null)
      setActiveSessionMessages([])
      
      // Force reset in ChatStylist by incrementing resetTrigger
      // This ensures resetSession is called even if activeSessionId was already null
      setResetTrigger((prev) => prev + 1)
      
      // Handle async sidebar refresh separately (non-blocking)
      // Sessions are automatically created/updated by the backend when messages are sent
      // Use a small delay to ensure backend has processed the session save
      setTimeout(async () => {
        try {
          await sidebarRef.current?.refreshSessions()
          await desktopSidebarRef.current?.refreshSessions()
        } catch (error) {
          console.error("Failed to refresh sidebar:", error)
          // Don't throw - sidebar refresh failure shouldn't break the new chat functionality
        }
      }, 500)
    } catch (error) {
      console.error("Error in handleNewChat:", error)
      // Even if there's an error, ensure state is cleared
      setActiveSessionId(null)
      setActiveSessionMessages([])
      setResetTrigger((prev) => prev + 1)
    }
  }, [])

  const handleSessionUpdated = useCallback(
    async (sessionId: string, lastMessage: string) => {
      // Session was updated, refresh the sidebar to show the updated session
      // Add a delay to ensure backend has processed the title update (smart naming)
      // Increased to 1000ms to give backend more time to complete title update
      setTimeout(async () => {
        try {
          await sidebarRef.current?.refreshSessions()
          await desktopSidebarRef.current?.refreshSessions()
        } catch (error) {
          console.error("Failed to refresh sidebar after session update:", error)
        }
      }, 2000)
    },
    []
  )

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
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Chat Sidebar */}
          {showSidebar && (
            <>
              {/* Mobile: Slide-over drawer */}
              <div className="lg:hidden fixed inset-0 z-50 bg-background">
                <div className="flex h-full">
                  <div className="w-full sm:w-64 md:w-72 border-r border-border">
                    <ChatSidebar
                      ref={sidebarRef}
                      activeSessionId={activeSessionId}
                      onSelectSession={(id) => {
                        handleSelectSession(id)
                        setShowSidebar(false)
                      }}
                      onNewChat={() => {
                        handleNewChat()
                        setShowSidebar(false)
                      }}
                      onClose={() => setShowSidebar(false)}
                    />
                  </div>
                  <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setShowSidebar(false)} />
                </div>
              </div>
              {/* Desktop: Persistent sidebar */}
              <div className="hidden lg:block flex-shrink-0">
                <ChatSidebar
                  ref={desktopSidebarRef}
                  activeSessionId={activeSessionId}
                  onSelectSession={handleSelectSession}
                  onNewChat={handleNewChat}
                />
              </div>
            </>
          )}

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
              showStyleDna ? "lg:w-3/5" : "w-full"
            }`}
          >
            {/* Mobile sidebar toggle button */}
            {!showSidebar && (
              <div className="lg:hidden absolute top-4 left-4 z-10">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setShowSidebar(true)}
                  className="bg-background/80 backdrop-blur-sm"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </div>
            )}
            <ChatStylist
              activeSessionId={activeSessionId}
              initialMessages={activeSessionMessages}
              onSessionUpdated={handleSessionUpdated}
              resetTrigger={resetTrigger}
            />
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
}