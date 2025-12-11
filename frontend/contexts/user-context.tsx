"use client"

import React, { createContext, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/lib/api'
import { User } from '@/types/api'

interface UserContextType {
  user: User | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { userApi } = useApi()

  // Fetch current user
  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: () => userApi.getCurrentUser(),
    retry: 1,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  const contextValue: UserContextType = {
    user: user || null,
    isLoading,
    error: error as Error | null,
    refetch,
  }

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}