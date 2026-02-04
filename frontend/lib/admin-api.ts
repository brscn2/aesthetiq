"use client"

import { useApi } from "./api"
import type {
  AuditLog,
  AuditLogFilters,
  AuditLogResponse,
  ChangeDetail,
  WardrobeItem,
  CreateWardrobeItemDto,
  UpdateWardrobeItemDto,
  Category,
  UploadResponse,
  SystemSettings,
  SystemInfo,
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
} from "./api"

/**
 * Admin-specific API hook with proper error handling and loading states
 */
export const useAdminApi = () => {
  const api = useApi()

  return {
    // Wardrobe Management
    wardrobe: {
      getAll: api.adminWardrobeApi.getAll,
      getById: api.adminWardrobeApi.getById,
      create: api.adminWardrobeApi.create,
      update: api.adminWardrobeApi.update,
      delete: api.adminWardrobeApi.delete,
      getByRetailer: api.adminWardrobeApi.getByRetailer,
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

    // Settings
    settings: {
      get: api.adminSettingsApi.get,
      update: api.adminSettingsApi.update,
      getSystemInfo: api.adminSettingsApi.getSystemInfo,
    },

    // File Upload
    upload: {
      uploadImage: api.uploadApi.uploadImage,
    },

    // Retailer Management
    retailers: {
      getAll: api.adminRetailersApi.getAll,
      getById: api.adminRetailersApi.getById,
      create: api.adminRetailersApi.create,
      update: api.adminRetailersApi.update,
      delete: api.adminRetailersApi.delete,
      getStats: api.adminRetailersApi.getStats,
    },

    // Commerce Item Management
    commerce: {
      getAll: api.adminCommerceApi.getAll,
      getById: api.adminCommerceApi.getById,
      create: api.adminCommerceApi.create,
      createBulk: api.adminCommerceApi.createBulk,
      update: api.adminCommerceApi.update,
      delete: api.adminCommerceApi.delete,
      getByRetailer: api.adminCommerceApi.getByRetailer,
      getStats: api.adminCommerceApi.getStats,
    },
  }
}

// Export types for use in components
export type {
  AuditLog,
  AuditLogFilters,
  AuditLogResponse,
  ChangeDetail,
  WardrobeItem,
  CreateWardrobeItemDto,
  UpdateWardrobeItemDto,
  Category,
  UploadResponse,
  SystemSettings,
  SystemInfo,
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
}
