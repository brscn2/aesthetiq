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

// Re-export types for admin use
export type {
  Category,
  WardrobeItem,
  CreateWardrobeItemDto,
  UpdateWardrobeItemDto,
}

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
  // Current user endpoints (authenticated)
  getCurrentUser: (): Promise<User> => client.get("/users/me").then((res) => res.data),
  getCurrentUserSettings: (): Promise<User['settings']> => client.get("/users/me/settings").then((res) => res.data),
  updateCurrentUserSettings: (data: Partial<User['settings']>): Promise<User['settings']> => 
    client.patch("/users/me/settings", data).then((res) => res.data),
  
  // Admin endpoints (by ID)
  getAll: (): Promise<User[]> => client.get("/users").then((res) => res.data),
  getStats: (): Promise<{
    totalUsers: number;
    usersByRole: { role: string; count: number }[];
    recentSignups: number;
  }> => client.get("/users/stats").then((res) => res.data),
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

export interface Brand {
  _id: string
  name: string
  description?: string
  logoUrl?: string
  website?: string
  foundedYear?: number
  country?: string
  createdAt: string
  updatedAt: string
}

export interface CreateBrandDto {
  name: string
  description?: string
  logoUrl?: string
  website?: string
  foundedYear?: number
  country?: string
}

export interface UpdateBrandDto {
  name?: string
  description?: string
  logoUrl?: string
  website?: string
  foundedYear?: number
  country?: string
}

export interface BrandSearchOptions {
  search?: string
  country?: string
  foundedYear?: number
  limit?: number
  offset?: number
}

export interface BrandStats {
  totalBrands: number
  brandsByCountry: { country: string; count: number }[]
  brandsByDecade: { decade: string; count: number }[]
}

export interface ChangeDetail {
  field: string
  oldValue: any
  newValue: any
  displayName: string
}

export interface AuditLog {
  _id: string
  userId: string
  userEmail: string
  action: string
  resource: string
  resourceId?: string
  oldData?: Record<string, any>
  newData?: Record<string, any>
  changeDetails?: ChangeDetail[]
  changeSummary?: string
  ipAddress?: string
  userAgent?: string
  timestamp: string
}

export interface AuditLogFilters {
  userId?: string
  resource?: string
  action?: string
  startDate?: string
  endDate?: string
}

export interface AuditLogResponse {
  logs: AuditLog[]
  total: number
  page: number
  totalPages: number
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
  
  // Admin upload endpoints
  uploadBrandLogo: async (file: File, brandName?: string): Promise<UploadResponse & { brandName?: string; originalName: string; size: number; mimeType: string }> => {
    const formData = new FormData()
    formData.append("file", file)
    if (brandName) {
      formData.append("brandName", brandName)
    }

    const response = await client.post(
      "/admin/upload/brand-logo",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000,
      },
    )

    return response.data
  },
})

// Admin API endpoints
const createAdminBrandsApi = (client: AxiosInstance) => ({
  getAll: (options?: BrandSearchOptions): Promise<{ brands: Brand[]; total: number }> => {
    const params = new URLSearchParams()
    if (options?.search) params.append("search", options.search)
    if (options?.country) params.append("country", options.country)
    if (options?.foundedYear) params.append("foundedYear", options.foundedYear.toString())
    if (options?.limit) params.append("limit", options.limit.toString())
    if (options?.offset) params.append("offset", options.offset.toString())
    
    const queryString = params.toString()
    return client.get(`/admin/brands${queryString ? `?${queryString}` : ""}`).then((res) => res.data)
  },
  getById: (id: string): Promise<Brand> => client.get(`/admin/brands/${id}`).then((res) => res.data),
  create: (data: CreateBrandDto): Promise<Brand> => client.post("/admin/brands", data).then((res) => res.data),
  update: (id: string, data: UpdateBrandDto): Promise<Brand> => client.patch(`/admin/brands/${id}`, data).then((res) => res.data),
  delete: (id: string): Promise<void> => client.delete(`/admin/brands/${id}`).then(() => undefined),
  getStats: (): Promise<BrandStats> => client.get("/admin/brands/stats").then((res) => res.data),
})

const createAdminWardrobeApi = (client: AxiosInstance) => ({
  getAll: (options?: {
    userId?: string
    category?: Category
    colorHex?: string
    brandId?: string
    brand?: string
    search?: string
    limit?: number
    offset?: number
  }): Promise<{ items: WardrobeItem[]; total: number }> => {
    const params = new URLSearchParams()
    if (options?.userId) params.append("userId", options.userId)
    if (options?.category) params.append("category", options.category)
    if (options?.colorHex) params.append("colorHex", options.colorHex)
    if (options?.brandId) params.append("brandId", options.brandId)
    if (options?.brand) params.append("brand", options.brand)
    if (options?.search) params.append("search", options.search)
    if (options?.limit) params.append("limit", options.limit.toString())
    if (options?.offset) params.append("offset", options.offset.toString())
    
    const queryString = params.toString()
    return client.get(`/admin/wardrobe${queryString ? `?${queryString}` : ""}`).then((res) => res.data)
  },
  getById: (id: string): Promise<WardrobeItem> => client.get(`/admin/wardrobe/${id}`).then((res) => res.data),
  create: (data: CreateWardrobeItemDto & { userId: string }): Promise<WardrobeItem> => 
    client.post("/admin/wardrobe", data).then((res) => res.data),
  update: (id: string, data: UpdateWardrobeItemDto): Promise<WardrobeItem> => 
    client.patch(`/admin/wardrobe/${id}`, data).then((res) => res.data),
  delete: (id: string): Promise<void> => client.delete(`/admin/wardrobe/${id}`).then(() => undefined),
  getByBrand: (brandId: string): Promise<WardrobeItem[]> => 
    client.get(`/admin/wardrobe/by-brand/${brandId}`).then((res) => res.data),
  getStats: (): Promise<{
    totalItems: number
    itemsByCategory: { category: string; count: number }[]
    itemsByBrand: { brand: string; count: number }[]
    itemsByUser: { userId: string; count: number }[]
  }> => client.get("/admin/wardrobe/stats").then((res) => res.data),
})

const createAdminAuditApi = (client: AxiosInstance) => ({
  getAll: (page = 1, limit = 50, filters?: AuditLogFilters): Promise<AuditLogResponse> => {
    const params = new URLSearchParams()
    params.append("page", page.toString())
    params.append("limit", limit.toString())
    if (filters?.userId) params.append("userId", filters.userId)
    if (filters?.resource) params.append("resource", filters.resource)
    if (filters?.action) params.append("action", filters.action)
    if (filters?.startDate) params.append("startDate", filters.startDate)
    if (filters?.endDate) params.append("endDate", filters.endDate)
    
    return client.get(`/admin/audit?${params.toString()}`).then((res) => res.data)
  },
  getStats: (): Promise<{
    totalLogs: number;
    logsByAction: { action: string; count: number }[];
    logsByResource: { resource: string; count: number }[];
    recentActivity: number;
  }> => client.get("/admin/audit/stats").then((res) => res.data),
  getByResource: (resource: string, resourceId: string): Promise<AuditLog[]> => 
    client.get(`/admin/audit/resource?resource=${resource}&resourceId=${resourceId}`).then((res) => res.data),
  getByUser: (userId: string): Promise<AuditLog[]> => 
    client.get(`/admin/audit/user?userId=${userId}`).then((res) => res.data),
})

export interface SystemSettings {
  siteName: string
  siteDescription: string
  maintenanceMode: boolean
  allowRegistration: boolean
  requireEmailVerification: boolean
  maxUploadSize: number
  defaultLanguage: string
  timezone: string
  sessionTimeout: number
  enableAuditLogs: boolean
  enableAnalytics: boolean
  enableNotifications: boolean
  smtpHost: string
  smtpPort: number
  adminEmail: string
}

export interface SystemInfo {
  version: string
  environment: string
  apiStatus: string
  lastDeployment: string
}

const createAdminSettingsApi = (client: AxiosInstance) => ({
  get: (): Promise<SystemSettings> => client.get("/admin/settings").then((res) => res.data),
  update: (data: Partial<SystemSettings>): Promise<SystemSettings> => 
    client.patch("/admin/settings", data).then((res) => res.data),
  getSystemInfo: (): Promise<SystemInfo> => 
    client.get("/admin/settings/system-info").then((res) => res.data),
})

const createApiHelpers = (client: AxiosInstance) => ({
  userApi: createUserApi(client),
  wardrobeApi: createWardrobeApi(client),
  analysisApi: createAnalysisApi(client),
  styleProfileApi: createStyleProfileApi(client),
  chatApi: createChatApi(client),
  uploadApi: createUploadApi(client),
  // Admin APIs
  adminBrandsApi: createAdminBrandsApi(client),
  adminWardrobeApi: createAdminWardrobeApi(client),
  adminAuditApi: createAdminAuditApi(client),
  adminSettingsApi: createAdminSettingsApi(client),
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

