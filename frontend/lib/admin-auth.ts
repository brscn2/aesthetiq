"use client"

import { useAuth, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export interface AdminAuthState {
  isLoading: boolean
  isAdmin: boolean
  isAuthenticated: boolean
  user: any
}

/**
 * Hook to check admin authentication and authorization
 */
export const useAdminAuth = (): AdminAuthState => {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!isLoaded) return

    if (isSignedIn && user) {
      // Check if user has admin role in public metadata
      const userRole = user.publicMetadata?.role as string
      setIsAdmin(userRole === "ADMIN")
    } else {
      setIsAdmin(false)
    }
  }, [isLoaded, isSignedIn, user])

  return {
    isLoading: !isLoaded,
    isAdmin,
    isAuthenticated: isSignedIn || false,
    user,
  }
}

/**
 * Hook to redirect non-admin users
 */
export const useAdminRedirect = () => {
  const router = useRouter()
  const { isLoading, isAdmin, isAuthenticated } = useAdminAuth()

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.push("/")
      return
    }

    if (!isAdmin) {
      router.push("/")
      return
    }
  }, [isLoading, isAdmin, isAuthenticated, router])

  return { isLoading, isAdmin, isAuthenticated }
}