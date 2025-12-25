"use client"

import { AxiosError } from "axios"
import { toast } from "sonner"

export interface AdminError {
  message: string
  code?: string
  details?: any
  validationErrors?: ValidationError[]
  timestamp?: string
  path?: string
}

export interface ValidationError {
  field: string
  value: any
  constraints: string[]
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
      case 400:
        // Handle validation errors with detailed field information
        if (data?.validationErrors) {
          const fieldErrors = data.validationErrors.map((err: any) => 
            `${err.field}: ${err.constraints.join(', ')}`
          ).join('; ')
          
          toast.error("Validation Error", {
            description: fieldErrors,
            duration: 5000,
          })
          
          return {
            message: "Validation failed",
            code: "VALIDATION_ERROR",
            details: data,
            validationErrors: data.validationErrors,
            timestamp: data.timestamp,
            path: data.path,
          }
        }
        
        toast.error("Bad Request", {
          description: data?.message || "Invalid request data",
        })
        return {
          message: data?.message || "Bad request",
          code: "BAD_REQUEST",
          details: data,
          timestamp: data?.timestamp,
          path: data?.path,
        }

      case 401:
        toast.error("Authentication required", {
          description: "Please sign in to access admin features",
        })
        return {
          message: "Authentication required",
          code: "UNAUTHORIZED",
          details: data,
          timestamp: data?.timestamp,
          path: data?.path,
        }

      case 403:
        toast.error("Access denied", {
          description: "You don't have permission to perform this action",
        })
        return {
          message: "Access denied",
          code: "FORBIDDEN",
          details: data,
          timestamp: data?.timestamp,
          path: data?.path,
        }

      case 404:
        toast.error("Resource not found", {
          description: data?.message || "The requested resource was not found",
        })
        return {
          message: data?.message || "Resource not found",
          code: "NOT_FOUND",
          details: data,
          timestamp: data?.timestamp,
          path: data?.path,
        }

      case 409:
        toast.error("Conflict", {
          description: data?.message || "A conflict occurred while processing your request",
        })
        return {
          message: data?.message || "Conflict occurred",
          code: "CONFLICT",
          details: data,
          timestamp: data?.timestamp,
          path: data?.path,
        }

      case 422:
        toast.error("Validation error", {
          description: data?.message || "Please check your input and try again",
        })
        return {
          message: data?.message || "Validation error",
          code: "VALIDATION_ERROR",
          details: data,
          timestamp: data?.timestamp,
          path: data?.path,
        }

      case 500:
        toast.error("Server error", {
          description: "An internal server error occurred. Please try again later.",
        })
        return {
          message: "Internal server error",
          code: "INTERNAL_ERROR",
          details: data,
          timestamp: data?.timestamp,
          path: data?.path,
        }

      case 503:
        toast.error("Service unavailable", {
          description: "The service is temporarily unavailable. Please try again later.",
        })
        return {
          message: "Service unavailable",
          code: "SERVICE_UNAVAILABLE",
          details: data,
          timestamp: data?.timestamp,
          path: data?.path,
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
          timestamp: data?.timestamp,
          path: data?.path,
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

  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
    context?: string
  ): Promise<T> {
    let lastError: unknown

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        
        // Don't retry on client errors (4xx) except for 408 (timeout) and 429 (rate limit)
        if (error instanceof AxiosError) {
          const status = error.response?.status
          if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
            throw error
          }
        }

        if (attempt === maxRetries) {
          break
        }

        // Show retry notification
        toast.info(`Retrying operation (${attempt}/${maxRetries})`, {
          description: `Attempt ${attempt} failed, retrying in ${delay}ms...`,
          duration: 2000,
        })

        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)))
      }
    }

    // All retries failed, handle the error
    this.handle(lastError, context)
    throw lastError
  }

  static isRetryableError(error: unknown): boolean {
    if (error instanceof AxiosError) {
      const status = error.response?.status
      // Retry on network errors, timeouts, and server errors
      return !status || status >= 500 || status === 408 || status === 429
    }
    
    // Retry on network errors
    if (error instanceof Error) {
      return error.message.includes('Network Error') || 
             error.message.includes('timeout') ||
             error.message.includes('ECONNREFUSED')
    }
    
    return false
  }
}