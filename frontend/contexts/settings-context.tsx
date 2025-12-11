"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/lib/api'
import { UserSettings } from '@/types/api'
import { toast } from 'sonner'

interface SettingsContextType {
  settings: UserSettings | null
  isLoading: boolean
  error: Error | null
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>
  refetch: () => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { userApi } = useApi()
  const queryClient = useQueryClient()

  // Fetch current user settings
  const {
    data: settings,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['user', 'settings'],
    queryFn: () => userApi.getCurrentUserSettings(),
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: Partial<UserSettings>) =>
      userApi.updateCurrentUserSettings(newSettings),
    onMutate: async (newSettings) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['user', 'settings'] })

      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData(['user', 'settings'])

      // Optimistically update to the new value
      queryClient.setQueryData(['user', 'settings'], (old: UserSettings | undefined) => ({
        ...old,
        ...newSettings,
      }))

      // Return a context object with the snapshotted value
      return { previousSettings }
    },
    onError: (err, newSettings, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['user', 'settings'], context?.previousSettings)
      
      toast.error('Failed to update settings', {
        description: 'Please try again or check your connection.',
      })
    },
    onSuccess: () => {
      toast.success('Settings updated successfully!')
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['user', 'settings'] })
    },
  })

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    await updateSettingsMutation.mutateAsync(newSettings)
  }

  const contextValue: SettingsContextType = {
    settings: settings || null,
    isLoading,
    error: error as Error | null,
    updateSettings,
    refetch,
  }

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

// Convenience hooks for specific settings
export function useTheme() {
  const { settings, updateSettings } = useSettings()
  
  return {
    theme: settings?.theme || 'SYSTEM',
    setTheme: (theme: UserSettings['theme']) => updateSettings({ theme }),
  }
}

export function useUnits() {
  const { settings, updateSettings } = useSettings()
  
  return {
    units: settings?.units || 'IMPERIAL',
    setUnits: (units: UserSettings['units']) => updateSettings({ units }),
  }
}

export function useCurrency() {
  const { settings, updateSettings } = useSettings()
  
  return {
    currency: settings?.currency || 'USD',
    setCurrency: (currency: UserSettings['currency']) => updateSettings({ currency }),
  }
}