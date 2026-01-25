"use client"

import { useAuth } from "@clerk/nextjs"
import { useMemo } from "react"
import axios, { AxiosInstance } from "axios"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"

/**
 * Summary of a chat session for list views.
 */
export interface ChatSessionSummary {
  _id: string
  userId: string
  sessionId: string
  title: string
  createdAt: string
  updatedAt: string
  lastMessagePreview: string | null
}

/**
 * Detailed chat session with full message history.
 */
export interface ChatSessionDetail {
  _id: string
  userId: string
  sessionId: string
  title: string
  messages: Array<{
    role: "user" | "assistant"
    content: string
    timestamp: string
    metadata?: Record<string, any>
  }>
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

/**
 * Create an HTTP client with auth token injection.
 */
const createHttpClient = (getToken: () => Promise<string | null>): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
    },
  })

  client.interceptors.request.use(async (config) => {
    const token = await getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  return client
}

/**
 * React hook for chat session management API.
 */
export function useChatSessionsApi() {
  const { getToken } = useAuth()

  return useMemo(() => {
    const client = createHttpClient(getToken)

    return {
      /**
       * List all chat sessions for the current user.
       */
      listChatSessions: async (): Promise<ChatSessionSummary[]> => {
        const response = await client.get("/agent/sessions")
        return response.data
      },

      /**
       * Get full details of a chat session by sessionId.
       */
      getChatSession: async (sessionId: string): Promise<ChatSessionDetail> => {
        const response = await client.get(`/agent/sessions/${sessionId}`)
        return response.data
      },

      /**
       * Create a new chat session.
       */
      createChatSession: async (options?: {
        title?: string
        sessionId?: string
      }): Promise<ChatSessionSummary> => {
        const response = await client.post("/agent/sessions", {
          title: options?.title,
          sessionId: options?.sessionId,
        })
        return response.data
      },

      /**
       * Rename a chat session.
       */
      renameChatSession: async (sessionId: string, title: string): Promise<void> => {
        await client.patch(`/agent/sessions/${sessionId}`, { title })
      },

      /**
       * Delete a chat session.
       */
      deleteChatSession: async (sessionId: string): Promise<void> => {
        await client.delete(`/agent/sessions/${sessionId}`)
      },
    }
  }, [getToken])
}
