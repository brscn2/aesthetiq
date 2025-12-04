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
  getByUserId: (): Promise<StyleProfile> => client.get(`/style-profile/user`).then((res) => res.data),
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
  uploadImage: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData()
    formData.append("file", file)

    const response = await client.post<UploadResponse>(
      "/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    )

    return response.data
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
      if (!isSignedIn) {
        throw new Error('User is not authenticated')
      }
      
      const token = await getToken()
      
      if (!token) {
        throw new Error('Failed to get authentication token')
      }
      
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
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

