"use client"

import { useAuth, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminErrorBoundary } from "@/components/admin/admin-error-boundary"
import { Loader2 } from "lucide-react"

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn) {
      router.push("/")
      return
    }

    // TEMPORARY: Allow all authenticated users to access admin for testing
    // TODO: Re-enable proper admin role checking once user roles are set up
    setIsAdmin(true)

    // Check if user has admin role
    // const userRole = user?.publicMetadata?.role as string
    // const hasAdminRole = userRole === "ADMIN"
    
    // setIsAdmin(hasAdminRole)

    // if (!hasAdminRole) {
    //   // Redirect non-admin users to dashboard
    //   router.push("/")
    //   return
    // }
  }, [isLoaded, isSignedIn, user, router])

  // Loading state
  if (!isLoaded || isAdmin === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  // Access denied state
  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access the admin panel.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <AdminErrorBoundary>
        <div className="flex h-screen bg-background">
          {/* Admin Sidebar */}
          <div className="hidden lg:flex lg:w-64 lg:flex-col">
            <AdminSidebar />
          </div>

          {/* Main Content */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Mobile Header */}
            <div className="lg:hidden border-b border-border bg-background p-4">
              <h1 className="font-serif text-xl font-bold">
                Admin Dashboard
              </h1>
            </div>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto p-6">
              {children}
            </main>
          </div>
        </div>
      </AdminErrorBoundary>
    </>
  )
}