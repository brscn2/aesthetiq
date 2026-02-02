'use client'

import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/lib/api'
import { WardrobeIntelligence, IntelligenceApiResponse } from '@/types/wardrobe-intelligence'

/**
 * Hook for fetching wardrobe intelligence data
 * Uses TanStack Query for caching and automatic refetching
 */
export function useWardrobeIntelligence(enabled = true) {
  const { wardrobeApi } = useApi()

  const query = useQuery<IntelligenceApiResponse>({
    queryKey: ['wardrobe-intelligence'],
    queryFn: async () => {
      const response = await wardrobeApi.getIntelligence()
      return response
    },
    enabled,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 1 * 60 * 60 * 1000, // 1 hour (formerly cacheTime)
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })

  return {
    data: query.data?.data,
    isLoading: query.isLoading,
    error: query.data?.error || (query.error ? 'Failed to load wardrobe intelligence' : undefined),
    isError: query.isError || !query.data?.success,
    refetch: query.refetch,
    isFetching: query.isFetching,
  }
}
