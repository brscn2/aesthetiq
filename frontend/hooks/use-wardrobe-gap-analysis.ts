'use client'

import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/lib/api'
import { SmartGapAnalysis } from '@/types/wardrobe-intelligence'

interface GapAnalysisApiResponse {
  success: boolean
  data?: SmartGapAnalysis
  error?: string
}

export function useWardrobeGapAnalysis(enabled = true) {
  const { wardrobeApi } = useApi()

  const query = useQuery<GapAnalysisApiResponse>({
    queryKey: ['wardrobe-gap-analysis'],
    queryFn: async () => {
      const response = await wardrobeApi.getGapAnalysis()
      return response
    },
    enabled,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })

  return {
    data: query.data?.data,
    isLoading: query.isLoading,
    error: query.data?.error || (query.error ? 'Failed to load gap analysis' : undefined),
    isError: query.isError || !query.data?.success,
    refetch: query.refetch,
    isFetching: query.isFetching,
  }
}
