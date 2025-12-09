 "use client"

import { useMemo } from "react"
import { useAuth } from "@clerk/nextjs"
import axios, { AxiosError, AxiosInstance } from "axios"
import type {
  AddMessageDto,
  Category,
  ChatSession,
  ColorAnalysis,
  CreateChatSessionDto,
  CreateColorAnalysisDto,
  CreateStyleProfileDto,
  CreateUserDto,
  CreateWardrobeItemDto,
  StyleProfile,
  UpdateChatSessionDto,
  UpdateStyleProfileDto,
  UpdateUserDto,
  UpdateWardrobeItemDto,
  User,
  WardrobeItem,
} from "@/types/api"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"

const createHttpClient = () => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
    },
  })

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        // Clerk middleware will handle redirecting unauthenticated users.
      }
      return Promise.reject(error)
    },
  )

  return client
}

const createUserApi = (client: AxiosInstance) => ({
  getAll: (): Promise<User[]> => client.get("/users").then((res) => res.data),
  getById: (id: string): Promise<User> => client.get(`/users/${id}`).then((res) => res.data),
  create: (data: CreateUserDto): Promise<User> => client.post("/users", data).then((res) => res.data),
  update: (id: string, data: UpdateUserDto): Promise<User> => client.patch(`/users/${id}`, data).then((res) => res.data),
  delete: (id: string): Promise<void> => client.delete(`/users/${id}`).then(() => undefined),
})

const createWardrobeApi = (client: AxiosInstance) => ({
  getAll: (userId: string, category?: Category, colorHex?: string): Promise<WardrobeItem[]> => {
    const params = new URLSearchParams({ userId })
    if (category) params.append("category", category)
    if (colorHex) params.append("colorHex", colorHex)
    return client.get(`/wardrobe?${params.toString()}`).then((res) => res.data)
  },
  getById: (id: string): Promise<WardrobeItem> => client.get(`/wardrobe/${id}`).then((res) => res.data),
  create: (data: CreateWardrobeItemDto): Promise<WardrobeItem> => client.post("/wardrobe", data).then((res) => res.data),
  update: (id: string, data: UpdateWardrobeItemDto): Promise<WardrobeItem> => client.patch(`/wardrobe/${id}`, data).then((res) => res.data),
  delete: (id: string): Promise<void> => client.delete(`/wardrobe/${id}`).then(() => undefined),
})

const createAnalysisApi = (client: AxiosInstance) => ({
  getLatest: (userId: string): Promise<ColorAnalysis> => client.get(`/analysis/latest?userId=${userId}`).then((res) => res.data),
  getAllByUserId: (userId: string): Promise<ColorAnalysis[]> => client.get(`/analysis/user/${userId}`).then((res) => res.data),
  getById: (id: string): Promise<ColorAnalysis> => client.get(`/analysis/${id}`).then((res) => res.data),
  create: (data: CreateColorAnalysisDto): Promise<ColorAnalysis> => client.post("/analysis", data).then((res) => res.data),
  delete: (id: string): Promise<void> => client.delete(`/analysis/${id}`).then(() => undefined),
})

const createStyleProfileApi = (client: AxiosInstance) => ({
  getByUserId: async (): Promise<StyleProfile | null> => {
    try {
      const res = await client.get(`/style-profile/user`)
      return res.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null
      }
      throw error
    }
  },
  getById: (id: string): Promise<StyleProfile> => client.get(`/style-profile/${id}`).then((res) => res.data),
  create: (data: CreateStyleProfileDto): Promise<StyleProfile> => client.post("/style-profile", data).then((res) => res.data),
  update: (id: string, data: UpdateStyleProfileDto): Promise<StyleProfile> => client.patch(`/style-profile/${id}`, data).then((res) => res.data),
  updateByUserId: (data: UpdateStyleProfileDto): Promise<StyleProfile> => client.patch(`/style-profile/user`, data).then((res) => res.data),
  delete: (id: string): Promise<void> => client.delete(`/style-profile/${id}`).then(() => undefined),
})

const createChatApi = (client: AxiosInstance) => ({
  getAllByUserId: (userId: string): Promise<ChatSession[]> => client.get(`/chat/user/${userId}`).then((res) => res.data),
  getBySessionId: (sessionId: string): Promise<ChatSession> => client.get(`/chat/session/${sessionId}`).then((res) => res.data),
  getById: (id: string): Promise<ChatSession> => client.get(`/chat/${id}`).then((res) => res.data),
  create: (data: CreateChatSessionDto): Promise<ChatSession> => client.post("/chat", data).then((res) => res.data),
  update: (id: string, data: UpdateChatSessionDto): Promise<ChatSession> => client.patch(`/chat/${id}`, data).then((res) => res.data),
  addMessage: (sessionId: string, data: AddMessageDto): Promise<ChatSession> => client.post(`/chat/${sessionId}/message`, data).then((res) => res.data),
  delete: (id: string): Promise<void> => client.delete(`/chat/${id}`).then(() => undefined),
})

export interface UploadResponse {
  url: string
}

const createUploadApi = (client: AxiosInstance) => ({
  uploadImage: async (file: File, retries = 2): Promise<UploadResponse> => {
    const formData = new FormData()
    formData.append("file", file)

    let lastError: any

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await client.post<UploadResponse>(
          "/upload",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
            timeout: 30000, // 30 second timeout
          },
        )

        return response.data
      } catch (error: any) {
        lastError = error

        // Don't retry on client errors (4xx) - only on network/server errors
        if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
          throw error
        }

        // If this wasn't the last attempt, wait before retrying
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000) // Exponential backoff, max 5s
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    // All retries failed
    throw lastError
  },
})

const createApiHelpers = (client: AxiosInstance) => ({
  userApi: createUserApi(client),
  wardrobeApi: createWardrobeApi(client),
  analysisApi: createAnalysisApi(client),
  styleProfileApi: createStyleProfileApi(client),
  chatApi: createChatApi(client),
  uploadApi: createUploadApi(client),
})

export const useApiClient = () => {
  const { getToken, isSignedIn } = useAuth()

  return useMemo(() => {
    const client = createHttpClient()

    client.interceptors.request.use(async (config) => {
      // Get JWT token for backend verification
      // getToken() returns a JWT token that can be verified by the backend
      // No template needed - Clerk generates a JWT by default
      const token = await getToken()
      
      if (!token) {
        console.warn('No token available for request to:', config.url)
      } else {
        config.headers.Authorization = `Bearer ${token}`
      }
      
      return config
    })

    return client
  }, [getToken, isSignedIn])
}

export const useApi = () => {
  const client = useApiClient()

  return useMemo(() => createApiHelpers(client), [client])
}

