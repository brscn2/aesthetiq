"use client"

import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from "react"
import { Plus, MessageSquare, Edit2, Trash2, X, Check, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"
import { useChatSessionsApi, type ChatSessionSummary } from "@/lib/chat-sessions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface ChatSidebarProps {
  activeSessionId: string | null
  onSelectSession: (sessionId: string) => void
  onNewChat: () => void | Promise<void>
  onClose?: () => void
  className?: string
}

export interface ChatSidebarRef {
  refreshSessions: () => Promise<void>
}

export const ChatSidebar = forwardRef<ChatSidebarRef, ChatSidebarProps>(function ChatSidebar(
  {
    activeSessionId,
    onSelectSession,
    onNewChat,
    onClose,
    className,
  },
  ref
) {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const sessionsApi = useChatSessionsApi()

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("chat-sidebar-collapsed")
    if (saved !== null) {
      setIsCollapsed(saved === "true")
    }
  }, [])

  // Save collapsed state to localStorage
  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const newValue = !prev
      localStorage.setItem("chat-sidebar-collapsed", String(newValue))
      return newValue
    })
  }, [])

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true)
      const data = await sessionsApi.listChatSessions()
      setSessions(data)
    } catch (error) {
      console.error("Failed to load sessions:", error)
      toast.error("Failed to load chat history")
    } finally {
      setLoading(false)
    }
  }, [sessionsApi])

  // Expose refresh function via ref
  useImperativeHandle(ref, () => ({
    refreshSessions: loadSessions,
  }), [loadSessions])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const handleRenameStart = (session: ChatSessionSummary, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    setEditingId(session.sessionId)
    setEditTitle(session.title)
  }

  const handleDoubleClick = (session: ChatSessionSummary) => {
    if (editingId !== session.sessionId) {
      setEditingId(session.sessionId)
      setEditTitle(session.title)
    }
  }

  const handleRenameSave = async (sessionId: string) => {
    if (!editTitle.trim()) {
      toast.error("Title cannot be empty")
      return
    }

    try {
      await sessionsApi.renameChatSession(sessionId, editTitle.trim())
      setSessions((prev) =>
        prev.map((s) =>
          s.sessionId === sessionId ? { ...s, title: editTitle.trim() } : s
        )
      )
      setEditingId(null)
      setEditTitle("")
      toast.success("Session renamed")
    } catch (error) {
      console.error("Failed to rename session:", error)
      toast.error("Failed to rename session")
    }
  }

  const handleRenameCancel = () => {
    setEditingId(null)
    setEditTitle("")
  }

  const handleDeleteClick = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSessionToDelete(sessionId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!sessionToDelete) return

    try {
      await sessionsApi.deleteChatSession(sessionToDelete)
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionToDelete))
      if (activeSessionId === sessionToDelete) {
        onNewChat()
      }
      toast.success("Session deleted")
    } catch (error) {
      console.error("Failed to delete session:", error)
      toast.error("Failed to delete session")
    } finally {
      setDeleteDialogOpen(false)
      setSessionToDelete(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  const groupSessionsByDate = (sessions: ChatSessionSummary[]) => {
    const groups: Record<string, ChatSessionSummary[]> = {}
    sessions.forEach((session) => {
      const dateKey = formatDate(session.updatedAt)
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(session)
    })
    return groups
  }

  const groupedSessions = groupSessionsByDate(sessions)

  // Only allow collapse on desktop (lg and above)
  const shouldShowCollapsed = isCollapsed

  return (
    <div className={cn(
      "flex flex-col h-full bg-background border-r border-border transition-all duration-300",
      shouldShowCollapsed 
        ? "w-full sm:w-64 md:w-72 lg:w-16 xl:w-16" 
        : "w-full sm:w-64 md:w-72 lg:w-64 xl:w-72",
      className
    )}>
      {/* Header */}
      <div className="flex-shrink-0 p-3 sm:p-4 border-b border-border">
        <div className="flex items-center gap-2">
          {!shouldShowCollapsed ? (
            <>
              <Button
                onClick={onNewChat}
                className="flex-1 justify-start gap-2"
                variant="default"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Chat</span>
                <span className="sm:hidden">New</span>
              </Button>
              {onClose && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="lg:hidden h-9 w-9 flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCollapse}
                className="hidden lg:flex h-9 w-9 flex-shrink-0"
                title="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 w-full">
              <Button
                onClick={onNewChat}
                size="icon"
                className="w-full"
                variant="default"
                title="New Chat"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCollapse}
                className="h-9 w-9 flex-shrink-0"
                title="Expand sidebar"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Sessions List */}
      {!shouldShowCollapsed && (
        <ScrollArea className="flex-1 min-h-0">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading...</div>
          ) : sessions.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No conversations yet. Start a new chat!
            </div>
          ) : (
            <div className="p-2">
              {Object.entries(groupedSessions).map(([dateLabel, dateSessions]) => (
                <div key={dateLabel} className="mb-4">
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                    {dateLabel}
                  </div>
                  {dateSessions.map((session) => (
                    <div
                      key={session.sessionId}
                      className={cn(
                        "group relative flex items-center gap-2 p-2 sm:p-2.5 rounded-lg cursor-pointer transition-colors",
                        activeSessionId === session.sessionId
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-accent"
                      )}
                      onClick={() => onSelectSession(session.sessionId)}
                      onDoubleClick={() => handleDoubleClick(session)}
                    >
                      <MessageSquare className="h-4 w-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        {editingId === session.sessionId ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleRenameSave(session.sessionId)
                                } else if (e.key === "Escape") {
                                  handleRenameCancel()
                                }
                              }}
                              className="h-8 sm:h-7 text-sm"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 sm:h-7 sm:w-7 touch-manipulation"
                              onClick={() => handleRenameSave(session.sessionId)}
                            >
                              <Check className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 sm:h-7 sm:w-7 touch-manipulation"
                              onClick={handleRenameCancel}
                            >
                              <X className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="text-sm font-medium truncate pr-2">{session.title}</div>
                            {session.lastMessagePreview && (
                              <div className="text-xs text-muted-foreground line-clamp-2 break-words mt-0.5">
                                {session.lastMessagePreview}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      {editingId !== session.sessionId && (
                        <div
                          className={cn(
                            "flex items-center gap-1 flex-shrink-0 transition-opacity",
                            activeSessionId === session.sessionId
                              ? "opacity-100"
                              : "opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                          )}
                        >
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 sm:h-7 sm:w-7 touch-manipulation"
                            onClick={(e) => handleRenameStart(session, e)}
                            title="Rename conversation"
                          >
                            <Edit2 className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 sm:h-7 sm:w-7 text-destructive hover:text-destructive touch-manipulation"
                            onClick={(e) => handleDeleteClick(session.sessionId, e)}
                            title="Delete conversation"
                          >
                            <Trash2 className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      )}
      
      {/* Collapsed Sessions List - Show only icons */}
      {shouldShowCollapsed && (
        <ScrollArea className="flex-1 min-h-0">
          {loading ? (
            <div className="p-2 flex justify-center">
              <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-2 flex justify-center">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {sessions.map((session) => (
                <Button
                  key={session.sessionId}
                  variant={activeSessionId === session.sessionId ? "default" : "ghost"}
                  size="icon"
                  className={cn(
                    "w-full h-10",
                    activeSessionId === session.sessionId && "bg-primary/10 text-primary"
                  )}
                  onClick={() => onSelectSession(session.sessionId)}
                  title={session.title}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              ))}
            </div>
          )}
        </ScrollArea>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
})
