"use client"

import { useState, useCallback } from "react"
import { AdminErrorHandler, AdminError } from "@/lib/admin-error-handler"

export interface AdminLoadingState {
  isLoading: boolean
  error: AdminError | null
  data: any
}

export interface AdminLoadingActions {
  setLoading: (loading: boolean) => void
  setError: (error: AdminError | null) => void
  setData: (data: any) => void
  reset: () => void
  execute: <T>(
    asyncFn: () => Promise<T>,
    context?: string
  ) => Promise<T | null>
  executeWithRetry: <T>(
    asyncFn: () => Promise<T>,
    context?: string,
    maxRetries?: number
  ) => Promise<T | null>
}

/**
 * Hook for managing loading states in admin components
 */
export const useAdminLoading = (initialData?: any): AdminLoadingState & AdminLoadingActions => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<AdminError | null>(null)
  const [data, setData] = useState(initialData || null)

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading)
    if (loading) {
      setError(null) // Clear error when starting new operation
    }
  }, [])

  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
    setData(initialData || null)
  }, [initialData])

  const execute = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    context?: string
  ): Promise<T | null> => {
    setLoading(true)
    
    try {
      const result = await asyncFn()
      setData(result)
      return result
    } catch (err) {
      const adminError = AdminErrorHandler.handle(err, context)
      setError(adminError)
      return null
    } finally {
      setLoading(false)
    }
  }, [setLoading])

  const executeWithRetry = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    context?: string,
    maxRetries: number = 3
  ): Promise<T | null> => {
    setLoading(true)
    
    try {
      const result = await AdminErrorHandler.withRetry(asyncFn, maxRetries, 1000, context)
      setData(result)
      return result
    } catch (err) {
      const adminError = AdminErrorHandler.handle(err, context)
      setError(adminError)
      return null
    } finally {
      setLoading(false)
    }
  }, [setLoading])

  return {
    isLoading,
    error,
    data,
    setLoading,
    setError,
    setData,
    reset,
    execute,
    executeWithRetry,
  }
}

/**
 * Hook for managing multiple loading states (e.g., for different operations)
 */
export const useAdminMultiLoading = () => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, AdminError>>({})

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }))
    if (loading) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[key]
        return newErrors
      })
    }
  }, [])

  const setError = useCallback((key: string, error: AdminError) => {
    setErrors(prev => ({ ...prev, [key]: error }))
    setLoadingStates(prev => ({ ...prev, [key]: false }))
  }, [])

  const execute = useCallback(async <T>(
    key: string,
    asyncFn: () => Promise<T>,
    context?: string
  ): Promise<T | null> => {
    setLoading(key, true)
    
    try {
      const result = await asyncFn()
      return result
    } catch (err) {
      const adminError = AdminErrorHandler.handle(err, context)
      setError(key, adminError)
      return null
    } finally {
      setLoading(key, false)
    }
  }, [setLoading, setError])

  const isLoading = useCallback((key: string) => loadingStates[key] || false, [loadingStates])
  const getError = useCallback((key: string) => errors[key] || null, [errors])
  const isAnyLoading = useCallback(() => Object.values(loadingStates).some(Boolean), [loadingStates])

  return {
    isLoading,
    getError,
    isAnyLoading,
    execute,
    setLoading,
    setError,
  }
}