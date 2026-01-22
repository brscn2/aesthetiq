"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import type {
  ChatRequest,
  ChatResponse,
  StreamEvent,
  DoneEvent,
  ClarificationContext,
  ChatSessionState,
  StreamingProgress,
  ClothingItem,
} from "@/types/chat"

// =============================================================================
// Configuration
// =============================================================================

/**
 * Backend API URL (NestJS).
 * All agent requests go through the backend for authentication and logging.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"

/**
 * Agent API base path (relative to backend).
 */
const AGENT_API_PATH = "/agent"

// =============================================================================
// SSE Stream Parser
// =============================================================================

/**
 * Parse a Server-Sent Event line into a StreamEvent object.
 */
function parseSSELine(line: string): StreamEvent | null {
  // SSE format: "data: {json}"
  if (!line.startsWith("data: ")) {
    return null
  }

  const jsonStr = line.slice(6) // Remove "data: " prefix
  if (!jsonStr.trim()) {
    return null
  }

  try {
    const data = JSON.parse(jsonStr)
    return data as StreamEvent
  } catch (e) {
    console.error("Failed to parse SSE event:", e, jsonStr)
    return null
  }
}

/**
 * Type guard to check if an event is a DoneEvent.
 */
export function isDoneEvent(event: StreamEvent): event is DoneEvent {
  return event.type === "done"
}

// =============================================================================
// Chat API Client
// =============================================================================

export interface ChatApiCallbacks {
  onMetadata?: (sessionId: string, userId: string, traceId?: string) => void
  onStatus?: (message: string) => void
  onNodeStart?: (node: string, displayName: string) => void
  onNodeEnd?: (node: string) => void
  onIntent?: (intent: "general" | "clothing") => void
  onFilters?: (filters: Record<string, any> | null, scope: string | null) => void
  onItemsFound?: (count: number, sources: string[]) => void
  onAnalysis?: (decision: string, confidence: number | null) => void
  onToolCall?: (tool: string, input: string) => void
  onChunk?: (content: string) => void
  onDone?: (event: DoneEvent) => void
  onError?: (message: string) => void
}

/**
 * Send a streaming chat request to the conversational agent.
 * 
 * @param request - The chat request
 * @param token - Bearer token for authentication
 * @param callbacks - Callbacks for handling stream events
 * @param signal - AbortSignal for cancellation
 * @returns Promise that resolves when the stream completes
 */
export async function streamChat(
  request: ChatRequest,
  token: string | null,
  callbacks: ChatApiCallbacks,
  signal?: AbortSignal
): Promise<DoneEvent | null> {
  const url = `${API_BASE_URL}${AGENT_API_PATH}/chat/stream`

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "text/event-stream",
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Chat API error: ${response.status} - ${errorText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error("No response body reader available")
    }

    const decoder = new TextDecoder()
    let buffer = ""
    let doneEvent: DoneEvent | null = null

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      // Decode the chunk and add to buffer
      buffer += decoder.decode(value, { stream: true })

      // Process complete lines
      const lines = buffer.split("\n")
      buffer = lines.pop() || "" // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue

        const event = parseSSELine(trimmedLine)
        if (!event) continue

        // Dispatch to appropriate callback
        switch (event.type) {
          case "metadata":
            callbacks.onMetadata?.(event.session_id, event.user_id, event.trace_id)
            break
          case "status":
            callbacks.onStatus?.(event.message)
            break
          case "node_start":
            callbacks.onNodeStart?.(event.node, event.display_name)
            break
          case "node_end":
            callbacks.onNodeEnd?.(event.node)
            break
          case "intent":
            callbacks.onIntent?.(event.intent)
            break
          case "filters":
            callbacks.onFilters?.(event.filters, event.scope)
            break
          case "items_found":
            callbacks.onItemsFound?.(event.count, event.sources)
            break
          case "analysis":
            callbacks.onAnalysis?.(event.decision, event.confidence)
            break
          case "tool_call":
            callbacks.onToolCall?.(event.tool, event.input)
            break
          case "chunk":
            callbacks.onChunk?.(event.content)
            break
          case "done":
            doneEvent = event
            callbacks.onDone?.(event)
            break
          case "error":
            callbacks.onError?.(event.message)
            break
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      const event = parseSSELine(buffer.trim())
      if (event && event.type === "done") {
        doneEvent = event as DoneEvent
        callbacks.onDone?.(doneEvent)
      }
    }

    return doneEvent
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      // Request was cancelled, don't treat as error
      return null
    }
    throw error
  }
}

/**
 * Send a non-streaming chat request to the conversational agent.
 * 
 * @param request - The chat request
 * @param token - Bearer token for authentication
 * @returns Promise with the chat response
 */
export async function sendChat(
  request: ChatRequest,
  token: string | null
): Promise<ChatResponse> {
  const url = `${API_BASE_URL}${AGENT_API_PATH}/chat`

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Chat API error: ${response.status} - ${errorText}`)
  }

  return response.json()
}

// =============================================================================
// React Hook for Chat API
// =============================================================================

export interface UseChatApiOptions {
  onStreamStart?: () => void
  onStreamEnd?: (result: DoneEvent | null) => void
}

export interface UseChatApiReturn {
  /** Current session state */
  sessionState: ChatSessionState
  /** Current streaming progress */
  progress: StreamingProgress
  /** Accumulated response text during streaming */
  streamedText: string
  /** Items found during current request */
  foundItems: ClothingItem[]
  /** Send a message and stream the response */
  sendMessage: (message: string, sessionId?: string | null) => Promise<DoneEvent | null>
  /** Cancel the current request */
  cancelRequest: () => void
  /** Clear the current error */
  clearError: () => void
  /** Set pending clarification context (for multi-turn) */
  setPendingClarification: (context: ClarificationContext | null) => void
}

/**
 * React hook for using the conversational agent chat API.
 * Handles streaming, session management, and multi-turn conversations.
 */
export function useChatApi(options: UseChatApiOptions = {}): UseChatApiReturn {
  const { getToken } = useAuth()
  const abortControllerRef = useRef<AbortController | null>(null)

  // Session state
  const [sessionState, setSessionState] = useState<ChatSessionState>({
    sessionId: null,
    isLoading: false,
    isStreaming: false,
    currentStatus: null,
    currentNode: null,
    pendingClarification: null,
    error: null,
  })

  // Streaming progress
  const [progress, setProgress] = useState<StreamingProgress>({
    currentNode: null,
    displayName: null,
    completedNodes: [],
    intent: null,
    itemsFound: 0,
    sources: [],
    decision: null,
    toolCalls: [],
  })

  // Accumulated response text
  const [streamedText, setStreamedText] = useState("")

  // Found items
  const [foundItems, setFoundItems] = useState<ClothingItem[]>([])

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setSessionState((prev) => ({
      ...prev,
      isLoading: false,
      isStreaming: false,
    }))
  }, [])

  const clearError = useCallback(() => {
    setSessionState((prev) => ({ ...prev, error: null }))
  }, [])

  const setPendingClarification = useCallback((context: ClarificationContext | null) => {
    setSessionState((prev) => ({ ...prev, pendingClarification: context }))
  }, [])

  const sendMessage = useCallback(
    async (message: string, sessionId?: string | null): Promise<DoneEvent | null> => {
      // Cancel any existing request
      cancelRequest()

      // Create new abort controller
      abortControllerRef.current = new AbortController()

      // Reset state
      setStreamedText("")
      setFoundItems([])
      setProgress({
        currentNode: null,
        displayName: null,
        completedNodes: [],
        intent: null,
        itemsFound: 0,
        sources: [],
        decision: null,
        toolCalls: [],
      })

      setSessionState((prev) => ({
        ...prev,
        isLoading: true,
        isStreaming: true,
        currentStatus: "Connecting...",
        currentNode: null,
        error: null,
      }))

      options.onStreamStart?.()

      try {
        const token = await getToken()

        // Build request - user_id is injected by backend from auth token
        const request: ChatRequest = {
          message,
          sessionId: sessionId || sessionState.sessionId || undefined,
        }

        // Stream the response
        const result = await streamChat(
          request,
          token,
          {
            onMetadata: (sid, _uid, _traceId) => {
              setSessionState((prev) => ({ ...prev, sessionId: sid }))
            },
            onStatus: (statusMessage) => {
              setSessionState((prev) => ({ ...prev, currentStatus: statusMessage }))
            },
            onNodeStart: (node, displayName) => {
              setSessionState((prev) => ({ ...prev, currentNode: node }))
              setProgress((prev) => ({ ...prev, currentNode: node, displayName }))
            },
            onNodeEnd: (node) => {
              // Add to completed nodes and clear current node
              setProgress((prev) => {
                // Only add if we have a display name for this node
                const completedNode = prev.currentNode === node && prev.displayName
                  ? { node, displayName: prev.displayName }
                  : null
                
                return {
                  ...prev,
                  currentNode: null,
                  completedNodes: completedNode 
                    ? [...prev.completedNodes, completedNode]
                    : prev.completedNodes,
                }
              })
            },
            onIntent: (intent) => {
              setProgress((prev) => ({ ...prev, intent }))
            },
            onFilters: (_filters, _scope) => {
              // Could store filters in progress if needed
            },
            onItemsFound: (count, sources) => {
              setProgress((prev) => ({ ...prev, itemsFound: count, sources }))
            },
            onAnalysis: (decision, _confidence) => {
              setProgress((prev) => ({ ...prev, decision }))
            },
            onToolCall: (tool, input) => {
              // Track tool calls for progress display
              setProgress((prev) => ({
                ...prev,
                toolCalls: [...prev.toolCalls, { tool, input }],
              }))
            },
            onChunk: (content) => {
              setStreamedText((prev) => prev + content)
            },
            onDone: (event) => {
              setFoundItems(event.items || [])
              
              // Handle clarification context
              if (event.needs_clarification && event.clarification_question) {
                setSessionState((prev) => ({
                  ...prev,
                  pendingClarification: {
                    original_message: message,
                    clarification_question: event.clarification_question!,
                    extracted_filters: null,
                    search_scope: null,
                    retrieved_items: event.items || [],
                    iteration: 0,
                  },
                }))
              } else {
                setSessionState((prev) => ({ ...prev, pendingClarification: null }))
              }
            },
            onError: (errorMessage) => {
              setSessionState((prev) => ({ ...prev, error: errorMessage }))
            },
          },
          abortControllerRef.current.signal
        )

        setSessionState((prev) => ({
          ...prev,
          isLoading: false,
          isStreaming: false,
          currentStatus: null,
          currentNode: null,
        }))

        options.onStreamEnd?.(result)
        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
        setSessionState((prev) => ({
          ...prev,
          isLoading: false,
          isStreaming: false,
          currentStatus: null,
          currentNode: null,
          error: errorMessage,
        }))
        options.onStreamEnd?.(null)
        return null
      }
    },
    [getToken, sessionState.sessionId, progress.currentNode, cancelRequest, options]
  )

  return useMemo(
    () => ({
      sessionState,
      progress,
      streamedText,
      foundItems,
      sendMessage,
      cancelRequest,
      clearError,
      setPendingClarification,
    }),
    [
      sessionState,
      progress,
      streamedText,
      foundItems,
      sendMessage,
      cancelRequest,
      clearError,
      setPendingClarification,
    ]
  )
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate a unique message ID.
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Format items for display in chat messages.
 */
export function formatItemsForDisplay(items: ClothingItem[]): string {
  if (items.length === 0) return ""

  return items
    .slice(0, 5)
    .map((item, i) => {
      const parts = [`${i + 1}. ${item.name}`]
      if (item.brand) parts.push(`by ${item.brand}`)
      if (item.price) parts.push(`$${item.price}`)
      return parts.join(" ")
    })
    .join("\n")
}
