"use client"

import { useApi } from "./api"
import type {
  Brand,
  CreateBrandDto,
  UpdateBrandDto,
  BrandSearchOptions,
  BrandStats,
  AuditLog,
  AuditLogFilters,
  AuditLogResponse,
  WardrobeItem,
  CreateWardrobeItemDto,
  UpdateWardrobeItemDto,
  Category,
  UploadResponse,
} from "./api"

/**
 * Admin-specific API hook with proper error handling and loading states
 */
export const useAdminApi = () => {
  const api = useApi()

  return {
    // Brand Management
    brands: {
      getAll: api.adminBrandsApi.getAll,
      getById: api.adminBrandsApi.getById,
      create: api.adminBrandsApi.create,
      update: api.adminBrandsApi.update,
      delete: api.adminBrandsApi.delete,
      getStats: api.adminBrandsApi.getStats,
    },

    // Wardrobe Management
    wardrobe: {
      getAll: api.adminWardrobeApi.getAll,
      getById: api.adminWardrobeApi.getById,
      create: api.adminWardrobeApi.create,
      update: api.adminWardrobeApi.update,
      delete: api.adminWardrobeApi.delete,
      getByBrand: api.adminWardrobeApi.getByBrand,
      getStats: api.adminWardrobeApi.getStats,
    },

    // User Management
    users: {
      getAll: api.userApi.getAll,
      getById: api.userApi.getById,
      getStats: api.userApi.getStats,
    },

    // Audit Logs
    audit: {
      getAll: api.adminAuditApi.getAll,
      getByResource: api.adminAuditApi.getByResource,
      getByUser: api.adminAuditApi.getByUser,
      getStats: api.adminAuditApi.getStats,
    },

    // File Upload
    upload: {
      brandLogo: api.uploadApi.uploadBrandLogo,
      uploadImage: api.uploadApi.uploadImage,
    },
  }
}

// Export types for use in components
export type {
  Brand,
  CreateBrandDto,
  UpdateBrandDto,
  BrandSearchOptions,
  BrandStats,
  AuditLog,
  AuditLogFilters,
  AuditLogResponse,
  WardrobeItem,
  CreateWardrobeItemDto,
  UpdateWardrobeItemDto,
  Category,
  UploadResponse,
}