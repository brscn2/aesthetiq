"use client"

import { AxiosError } from "axios"
import { toast } from "sonner"

export interface AdminError {
  message: string
  code?: string
  details?: any
}

export class AdminErrorHandler {
  static handle(error: unknown, context?: string): AdminError {
    console.error(`Admin Error${context ? ` in ${context}` : ""}:`, error)

    if (error instanceof AxiosError) {
      return this.handleAxiosError(error, context)
    }

    if (error instanceof Error) {
      return this.handleGenericError(error, context)
    }

    return {
      message: "An unexpected error occurred",
      code: "UNKNOWN_ERROR",
      details: error,
    }
  }

  private static handleAxiosError(error: AxiosError, context?: string): AdminError {
    const status = error.response?.status
    const data = error.response?.data as any

    // Handle specific HTTP status codes
    switch (status) {
      case 401:
        toast.error("Authentication required", {
          description: "Please sign in to access admin features",
        })
        return {
          message: "Authentication required",
          code: "UNAUTHORIZED",
          details: data,
        }

      case 403:
        toast.error("Access denied", {
          description: "You don't have permission to perform this action",
        })
        return {
          message: "Access denied",
          code: "FORBIDDEN",
          details: data,
        }

      case 404:
        toast.error("Resource not found", {
          description: data?.message || "The requested resource was not found",
        })
        return {
          message: data?.message || "Resource not found",
          code: "NOT_FOUND",
          details: data,
        }

      case 409:
        toast.error("Conflict", {
          description: data?.message || "A conflict occurred while processing your request",
        })
        return {
          message: data?.message || "Conflict occurred",
          code: "CONFLICT",
          details: data,
        }

      case 422:
        toast.error("Validation error", {
          description: data?.message || "Please check your input and try again",
        })
        return {
          message: data?.message || "Validation error",
          code: "VALIDATION_ERROR",
          details: data,
        }

      case 500:
        toast.error("Server error", {
          description: "An internal server error occurred. Please try again later.",
        })
        return {
          message: "Internal server error",
          code: "INTERNAL_ERROR",
          details: data,
        }

      default:
        const message = data?.message || error.message || "An error occurred"
        toast.error("Error", {
          description: message,
        })
        return {
          message,
          code: `HTTP_${status}`,
          details: data,
        }
    }
  }

  private static handleGenericError(error: Error, context?: string): AdminError {
    toast.error("Error", {
      description: error.message,
    })

    return {
      message: error.message,
      code: "GENERIC_ERROR",
      details: error,
    }
  }

  static showSuccess(message: string, description?: string) {
    toast.success(message, {
      description,
    })
  }

  static showInfo(message: string, description?: string) {
    toast.info(message, {
      description,
    })
  }

  static showWarning(message: string, description?: string) {
    toast.warning(message, {
      description,
    })
  }
}