"use client";

import { useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import axios, { AxiosError, AxiosInstance } from "axios";
import { getClerkJwt } from "./clerk-token";
import type {
  AddMessageDto,
  AnalyzeClothingResponse,
  Brand,
  BrandSearchOptions,
  Category,
  ChatSession,
  ColorAnalysis,
  CreateChatSessionDto,
  CreateColorAnalysisDto,
  CreateOutfitDto,
  CreateStyleProfileDto,
  CreateUserDto,
  CreateWardrobeItemDto,
  Outfit,
  StyleProfile,
  UpdateChatSessionDto,
  UpdateOutfitDto,
  UpdateStyleProfileDto,
  UpdateUserDto,
  UpdateWardrobeItemDto,
  User,
  WardrobeItem,
  PersonaAnalysisStatus,
} from "@/types/api";

// Re-export types for admin use
export type {
  Category,
  WardrobeItem,
  CreateWardrobeItemDto,
  UpdateWardrobeItemDto,
};

// Import additional types for admin
import type {
  Retailer,
  CreateRetailerDto,
  UpdateRetailerDto,
  RetailerSearchOptions,
  RetailerStats,
  CommerceItem,
  CreateCommerceItemDto,
  UpdateCommerceItemDto,
  CommerceSearchOptions,
  CommerceStats,
} from "@/types/api";

// Re-export commerce and retailer types
export type {
  Retailer,
  CreateRetailerDto,
  UpdateRetailerDto,
  RetailerSearchOptions,
  RetailerStats,
  CommerceItem,
  CreateCommerceItemDto,
  UpdateCommerceItemDto,
  CommerceSearchOptions,
  CommerceStats,
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

const createHttpClient = () => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        // Clerk middleware will handle redirecting unauthenticated users.
      }
      return Promise.reject(error);
    },
  );

  return client;
};

const createUserApi = (client: AxiosInstance) => ({
  // Current user endpoints (authenticated)
  getCurrentUser: (): Promise<User> =>
    client.get("/users/me").then((res) => res.data),
  getCurrentUserSettings: (): Promise<User["settings"]> =>
    client.get("/users/me/settings").then((res) => res.data),
  updateCurrentUserSettings: (
    data: Partial<User["settings"]>,
  ): Promise<User["settings"]> =>
    client.patch("/users/me/settings", data).then((res) => res.data),
  updateCurrentUser: (data: {
    name?: string;
    avatarUrl?: string;
  }): Promise<User> => client.patch("/users/me", data).then((res) => res.data),

  // Admin endpoints (by ID)
  getAll: (): Promise<User[]> => client.get("/users").then((res) => res.data),
  getStats: (): Promise<{
    totalUsers: number;
    usersByRole: { role: string; count: number }[];
    recentSignups: number;
  }> => client.get("/users/stats").then((res) => res.data),
  getById: (id: string): Promise<User> =>
    client.get(`/users/${id}`).then((res) => res.data),
  create: (data: CreateUserDto): Promise<User> =>
    client.post("/users", data).then((res) => res.data),
  update: (id: string, data: UpdateUserDto): Promise<User> =>
    client.patch(`/users/${id}`, data).then((res) => res.data),
  delete: (id: string): Promise<void> =>
    client.delete(`/users/${id}`).then(() => undefined),
});

const createWardrobeApi = (client: AxiosInstance) => ({
  getAll: (
    userId: string,
    category?: Category,
    colorHex?: string,
    search?: string,
  ): Promise<WardrobeItem[]> => {
    const params = new URLSearchParams({ userId });
    if (category) params.append("category", category);
    if (colorHex) params.append("colorHex", colorHex);
    if (search) params.append("search", search);
    return client.get(`/wardrobe?${params.toString()}`).then((res) => res.data);
  },
  getById: (id: string): Promise<WardrobeItem> =>
    client.get(`/wardrobe/${id}`).then((res) => res.data),
  create: (data: CreateWardrobeItemDto): Promise<WardrobeItem> =>
    client.post("/wardrobe", data).then((res) => res.data),
  update: (id: string, data: UpdateWardrobeItemDto): Promise<WardrobeItem> =>
    client.patch(`/wardrobe/${id}`, data).then((res) => res.data),
  delete: (id: string): Promise<void> =>
    client.delete(`/wardrobe/${id}`).then(() => undefined),
});

const createAnalysisApi = (client: AxiosInstance) => ({
  getLatest: (): Promise<ColorAnalysis> =>
    client.get(`/analysis/latest`).then((res) => res.data),
  getAllByUserId: (): Promise<ColorAnalysis[]> =>
    client.get(`/analysis/user`).then((res) => res.data),
  getById: (id: string): Promise<ColorAnalysis> =>
    client.get(`/analysis/${id}`).then((res) => res.data),
  create: (data: CreateColorAnalysisDto): Promise<ColorAnalysis> =>
    client.post("/analysis", data).then((res) => res.data),
  analyzeImage: (file: File): Promise<ColorAnalysis> => {
    const formData = new FormData();
    formData.append("file", file);
    return client
      .post("/analysis/analyze-image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 60000, // 60 second timeout for analysis
      })
      .then((res) => res.data);
  },
  delete: (id: string): Promise<void> =>
    client.delete(`/analysis/${id}`).then(() => undefined),
});

const createStyleProfileApi = (client: AxiosInstance) => ({
  getByUserId: async (): Promise<StyleProfile | null> => {
    try {
      const res = await client.get(`/style-profile/user`);
      return res.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },
  getById: (id: string): Promise<StyleProfile> =>
    client.get(`/style-profile/${id}`).then((res) => res.data),
  create: (data: CreateStyleProfileDto): Promise<StyleProfile> =>
    client.post("/style-profile", data).then((res) => res.data),
  update: (id: string, data: UpdateStyleProfileDto): Promise<StyleProfile> =>
    client.patch(`/style-profile/${id}`, data).then((res) => res.data),
  updateByUserId: (data: UpdateStyleProfileDto): Promise<StyleProfile> =>
    client.patch(`/style-profile/user`, data).then((res) => res.data),
  delete: (id: string): Promise<void> =>
    client.delete(`/style-profile/${id}`).then(() => undefined),
  analyzePersona: (): Promise<{ jobId: string }> =>
    client.post("/style-profile/analyze-persona").then((res) => res.data),
  getPersonaAnalysisStatus: async (): Promise<PersonaAnalysisStatus | null> => {
    try {
      const res = await client.get("/style-profile/persona-analysis/status");
      return res.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },
});

const createChatApi = (client: AxiosInstance) => ({
  getAllByUserId: (userId: string): Promise<ChatSession[]> =>
    client.get(`/chat/user/${userId}`).then((res) => res.data),
  getBySessionId: (sessionId: string): Promise<ChatSession> =>
    client.get(`/chat/session/${sessionId}`).then((res) => res.data),
  getById: (id: string): Promise<ChatSession> =>
    client.get(`/chat/${id}`).then((res) => res.data),
  create: (data: CreateChatSessionDto): Promise<ChatSession> =>
    client.post("/chat", data).then((res) => res.data),
  update: (id: string, data: UpdateChatSessionDto): Promise<ChatSession> =>
    client.patch(`/chat/${id}`, data).then((res) => res.data),
  addMessage: (sessionId: string, data: AddMessageDto): Promise<ChatSession> =>
    client.post(`/chat/${sessionId}/message`, data).then((res) => res.data),
  delete: (id: string): Promise<void> =>
    client.delete(`/chat/${id}`).then(() => undefined),
});

const createOutfitApi = (client: AxiosInstance) => ({
  getAll: (): Promise<Outfit[]> =>
    client.get("/outfits").then((res) => res.data),
  getById: (id: string): Promise<Outfit> =>
    client.get(`/outfits/${id}`).then((res) => res.data),
  create: (data: CreateOutfitDto): Promise<Outfit> =>
    client.post("/outfits", data).then((res) => res.data),
  update: (id: string, data: UpdateOutfitDto): Promise<Outfit> =>
    client.patch(`/outfits/${id}`, data).then((res) => res.data),
  delete: (id: string): Promise<void> =>
    client.delete(`/outfits/${id}`).then(() => undefined),
  toggleFavorite: (id: string): Promise<Outfit> =>
    client.patch(`/outfits/${id}/favorite`).then((res) => res.data),
});

const createBrandsApi = (client: AxiosInstance) => ({
  getAll: (
    options?: BrandSearchOptions,
  ): Promise<{ brands: Brand[]; total: number }> => {
    const params = new URLSearchParams();
    if (options?.search) params.append("search", options.search);
    if (options?.limit) params.append("limit", options.limit.toString());

    const queryString = params.toString();
    return client
      .get(`/brands${queryString ? `?${queryString}` : ""}`)
      .then((res) => res.data);
  },
});

export interface UploadResponse {
  url: string;
}

export interface ChangeDetail {
  field: string;
  oldValue: any;
  newValue: any;
  type: "added" | "modified" | "removed";
}

export interface AuditLog {
  _id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  changeDetails?: ChangeDetail[];
  changeSummary?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface AuditLogFilters {
  userId?: string;
  resource?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditLogResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  totalPages: number;
}

const createUploadApi = (client: AxiosInstance) => ({
  uploadImage: async (file: File, retries = 2): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    let lastError: any;

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
        );

        return response.data;
      } catch (error: any) {
        lastError = error;

        // Don't retry on client errors (4xx) - only on network/server errors
        if (
          error.response?.status &&
          error.response.status >= 400 &&
          error.response.status < 500
        ) {
          throw error;
        }

        // If this wasn't the last attempt, wait before retrying
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff, max 5s
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    throw lastError;
  },

  // Admin upload endpoints
  uploadBrandLogo: async (
    file: File,
    brandName?: string,
  ): Promise<
    UploadResponse & {
      brandName?: string;
      originalName: string;
      size: number;
      mimeType: string;
    }
  > => {
    const formData = new FormData();
    formData.append("file", file);
    if (brandName) {
      formData.append("brandName", brandName);
    }

    const response = await client.post("/admin/upload/brand-logo", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 30000,
    });

    return response.data;
  },
});

// Admin API endpoints
const createAdminWardrobeApi = (client: AxiosInstance) => ({
  getAll: (options?: {
    userId?: string;
    category?: Category;
    colorHex?: string;
    retailerId?: string;
    brand?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: WardrobeItem[]; total: number }> => {
    const params = new URLSearchParams();
    if (options?.userId) params.append("userId", options.userId);
    if (options?.category) params.append("category", options.category);
    if (options?.colorHex) params.append("colorHex", options.colorHex);
    if (options?.retailerId) params.append("retailerId", options.retailerId);
    if (options?.brand) params.append("brand", options.brand);
    if (options?.search) params.append("search", options.search);
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());

    const queryString = params.toString();
    return client
      .get(`/admin/wardrobe${queryString ? `?${queryString}` : ""}`)
      .then((res) => res.data);
  },
  getById: (id: string): Promise<WardrobeItem> =>
    client.get(`/admin/wardrobe/${id}`).then((res) => res.data),
  create: (
    data: CreateWardrobeItemDto & { userId: string },
  ): Promise<WardrobeItem> =>
    client.post("/admin/wardrobe", data).then((res) => res.data),
  update: (id: string, data: UpdateWardrobeItemDto): Promise<WardrobeItem> =>
    client.patch(`/admin/wardrobe/${id}`, data).then((res) => res.data),
  delete: (id: string): Promise<void> =>
    client.delete(`/admin/wardrobe/${id}`).then(() => undefined),
  getByRetailer: (retailerId: string): Promise<WardrobeItem[]> =>
    client
      .get(`/admin/wardrobe/by-retailer/${retailerId}`)
      .then((res) => res.data),
  getStats: (): Promise<{
    totalItems: number;
    itemsByCategory: { category: string; count: number }[];
    itemsByBrand: { brand: string; count: number }[];
    itemsByUser: { userId: string; count: number }[];
  }> => client.get("/admin/wardrobe/stats").then((res) => res.data),
});

const createAdminAuditApi = (client: AxiosInstance) => ({
  getAll: (
    page = 1,
    limit = 50,
    filters?: AuditLogFilters,
  ): Promise<AuditLogResponse> => {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    if (filters?.userId) params.append("userId", filters.userId);
    if (filters?.resource) params.append("resource", filters.resource);
    if (filters?.action) params.append("action", filters.action);
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);

    return client
      .get(`/admin/audit?${params.toString()}`)
      .then((res) => res.data);
  },
  getStats: (): Promise<{
    totalLogs: number;
    logsByAction: { action: string; count: number }[];
    logsByResource: { resource: string; count: number }[];
    recentActivity: number;
  }> => client.get("/admin/audit/stats").then((res) => res.data),
  getByResource: (resource: string, resourceId: string): Promise<AuditLog[]> =>
    client
      .get(
        `/admin/audit/resource?resource=${resource}&resourceId=${resourceId}`,
      )
      .then((res) => res.data),
  getByUser: (userId: string): Promise<AuditLog[]> =>
    client.get(`/admin/audit/user?userId=${userId}`).then((res) => res.data),
});

export interface SystemSettings {
  siteName: string;
  siteDescription: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  maxUploadSize: number;
  defaultLanguage: string;
  timezone: string;
  sessionTimeout: number;
  enableAuditLogs: boolean;
  enableAnalytics: boolean;
  enableNotifications: boolean;
  smtpHost: string;
  smtpPort: number;
  adminEmail: string;
}

export interface SystemInfo {
  version: string;
  environment: string;
  apiStatus: string;
  lastDeployment: string;
}

const createAdminSettingsApi = (client: AxiosInstance) => ({
  get: (): Promise<SystemSettings> =>
    client.get("/admin/settings").then((res) => res.data),
  update: (data: Partial<SystemSettings>): Promise<SystemSettings> =>
    client.patch("/admin/settings", data).then((res) => res.data),
  getSystemInfo: (): Promise<SystemInfo> =>
    client.get("/admin/settings/system-info").then((res) => res.data),
});

const createAdminRetailersApi = (client: AxiosInstance) => ({
  getAll: (
    options?: RetailerSearchOptions,
  ): Promise<{ retailers: Retailer[]; total: number }> => {
    const params = new URLSearchParams();
    if (options?.search) params.append("search", options.search);
    if (options?.country) params.append("country", options.country);
    if (options?.isActive !== undefined)
      params.append("isActive", options.isActive.toString());
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());

    const queryString = params.toString();
    return client
      .get(`/admin/retailers${queryString ? `?${queryString}` : ""}`)
      .then((res) => res.data);
  },
  getById: (id: string): Promise<Retailer> =>
    client.get(`/admin/retailers/${id}`).then((res) => res.data),
  create: (data: CreateRetailerDto): Promise<Retailer> =>
    client.post("/admin/retailers", data).then((res) => res.data),
  update: (id: string, data: UpdateRetailerDto): Promise<Retailer> =>
    client.patch(`/admin/retailers/${id}`, data).then((res) => res.data),
  delete: (id: string): Promise<void> =>
    client.delete(`/admin/retailers/${id}`).then(() => undefined),
  getStats: (): Promise<RetailerStats> =>
    client.get("/admin/retailers/stats").then((res) => res.data),
});

const createAdminCommerceApi = (client: AxiosInstance) => ({
  getAll: (
    options?: CommerceSearchOptions,
  ): Promise<{ items: CommerceItem[]; total: number }> => {
    const params = new URLSearchParams();
    if (options?.search) params.append("search", options.search);
    if (options?.category) params.append("category", options.category);
    if (options?.brandId) params.append("brandId", options.brandId);
    if (options?.retailerId) params.append("retailerId", options.retailerId);
    if (options?.color) params.append("color", options.color);
    if (options?.priceMin !== undefined)
      params.append("priceMin", options.priceMin.toString());
    if (options?.priceMax !== undefined)
      params.append("priceMax", options.priceMax.toString());
    if (options?.tags) params.append("tags", options.tags.join(","));
    if (options?.inStock !== undefined)
      params.append("inStock", options.inStock.toString());
    if (options?.seasonalPalette)
      params.append("seasonalPalette", options.seasonalPalette);
    if (options?.minPaletteScore !== undefined)
      params.append("minPaletteScore", options.minPaletteScore.toString());
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());

    const queryString = params.toString();
    return client
      .get(`/admin/commerce${queryString ? `?${queryString}` : ""}`)
      .then((res) => res.data);
  },
  getById: (id: string): Promise<CommerceItem> =>
    client.get(`/admin/commerce/${id}`).then((res) => res.data),
  create: (data: CreateCommerceItemDto): Promise<CommerceItem> =>
    client.post("/admin/commerce", data).then((res) => res.data),
  createBulk: (
    items: CreateCommerceItemDto[],
  ): Promise<{ created: number; errors: { index: number; error: string }[] }> =>
    client.post("/admin/commerce/bulk", items).then((res) => res.data),
  update: (id: string, data: UpdateCommerceItemDto): Promise<CommerceItem> =>
    client.patch(`/admin/commerce/${id}`, data).then((res) => res.data),
  delete: (id: string): Promise<void> =>
    client.delete(`/admin/commerce/${id}`).then(() => undefined),
  getByRetailer: (retailerId: string): Promise<CommerceItem[]> =>
    client
      .get(`/admin/commerce/by-retailer/${retailerId}`)
      .then((res) => res.data),
  getStats: (): Promise<CommerceStats> =>
    client.get("/admin/commerce/stats").then((res) => res.data),
});

// Public Commerce API (for authenticated users to browse products)
const createCommerceApi = (client: AxiosInstance) => ({
  getAll: (
    options?: CommerceSearchOptions,
  ): Promise<{ items: CommerceItem[]; total: number }> => {
    const params = new URLSearchParams();
    if (options?.search) params.append("search", options.search);
    if (options?.category) params.append("category", options.category);
    if (options?.brandId) params.append("brandId", options.brandId);
    if (options?.retailerId) params.append("retailerId", options.retailerId);
    if (options?.color) params.append("color", options.color);
    if (options?.priceMin !== undefined)
      params.append("priceMin", options.priceMin.toString());
    if (options?.priceMax !== undefined)
      params.append("priceMax", options.priceMax.toString());
    if (options?.tags) params.append("tags", options.tags.join(","));
    if (options?.inStock !== undefined)
      params.append("inStock", options.inStock.toString());
    if (options?.seasonalPalette)
      params.append("seasonalPalette", options.seasonalPalette);
    if (options?.minPaletteScore !== undefined)
      params.append("minPaletteScore", options.minPaletteScore.toString());
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());

    const queryString = params.toString();
    return client
      .get(`/commerce${queryString ? `?${queryString}` : ""}`)
      .then((res) => res.data);
  },
  getById: (id: string): Promise<CommerceItem> =>
    client.get(`/commerce/${id}`).then((res) => res.data),
});

// AI API (for clothing analysis)
const createAiApi = (client: AxiosInstance) => ({
  analyzeClothing: (
    imageUrl?: string,
    imageBase64?: string,
  ): Promise<AnalyzeClothingResponse> => {
    return client
      .post("/ai/analyze-clothing", { imageUrl, imageBase64 })
      .then((res) => res.data);
  },
  removeBackground: (
    imageBase64: string,
  ): Promise<{ success: boolean; data?: string; error?: string }> => {
    return client
      .post("/ai/remove-background", { imageBase64 })
      .then((res) => res.data);
  },
});

const createApiHelpers = (client: AxiosInstance) => ({
  userApi: createUserApi(client),
  wardrobeApi: createWardrobeApi(client),
  analysisApi: createAnalysisApi(client),
  styleProfileApi: createStyleProfileApi(client),
  chatApi: createChatApi(client),
  outfitApi: createOutfitApi(client),
  uploadApi: createUploadApi(client),
  aiApi: createAiApi(client),
  commerceApi: createCommerceApi(client),
  brandsApi: createBrandsApi(client),
  // Admin APIs
  adminWardrobeApi: createAdminWardrobeApi(client),
  adminAuditApi: createAdminAuditApi(client),
  adminSettingsApi: createAdminSettingsApi(client),
  adminRetailersApi: createAdminRetailersApi(client),
  adminCommerceApi: createAdminCommerceApi(client),
});

export const useApiClient = () => {
  const { getToken, isSignedIn } = useAuth();

  return useMemo(() => {
    const client = createHttpClient();

    client.interceptors.request.use(async (config) => {
      // Get JWT token for backend verification
      const token = await getClerkJwt(getToken);

      if (!token) {
        console.warn("No token available for request to:", config.url);
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    });

    return client;
  }, [getToken, isSignedIn]);
};

export const useApi = () => {
  const client = useApiClient();

  return useMemo(() => createApiHelpers(client), [client]);
};
