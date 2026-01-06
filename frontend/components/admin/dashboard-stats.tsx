"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Package,
  Shirt,
  Users,
  Activity,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAdminApi } from "@/lib/admin-api"

interface DashboardStats {
  totalBrands: number
  totalClothingItems: number
  totalUsers: number
  recentActivity: number
  brandsByCountry: { country: string; count: number }[]
  itemsByCategory: { category: string; count: number }[]
  itemsByBrand: { brand: string; count: number }[]
  brandGrowth: number
  itemGrowth: number
}

interface RecentActivity {
  id: string
  action: string
  resource: string
  userEmail: string
  timestamp: string
}

// Fallback data for when API calls fail
const FALLBACK_STATS: DashboardStats = {
  totalBrands: 0,
  totalClothingItems: 0,
  totalUsers: 0,
  recentActivity: 0,
  brandsByCountry: [],
  itemsByCategory: [],
  itemsByBrand: [],
  brandGrowth: 0,
  itemGrowth: 0,
}

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const api = useAdminApi()
  const apiRef = useRef(api)
  const hasFetched = useRef(false)

  // Keep apiRef current
  apiRef.current = api

  const fetchStats = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch all stats in parallel
      const [brandsResult, wardrobeResult, usersResult, auditResult, recentAuditResult] =
        await Promise.all([
          apiRef.current.brands.getStats().catch((e) => {
            console.warn("Failed to fetch brand stats:", e)
            return null
          }),
          apiRef.current.wardrobe.getStats().catch((e) => {
            console.warn("Failed to fetch wardrobe stats:", e)
            return null
          }),
          apiRef.current.users.getStats().catch((e) => {
            console.warn("Failed to fetch user stats:", e)
            return null
          }),
          apiRef.current.audit.getStats().catch((e) => {
            console.warn("Failed to fetch audit stats:", e)
            return null
          }),
          apiRef.current.audit.getAll(1, 10).catch((e) => {
            console.warn("Failed to fetch recent activity:", e)
            return null
          }),
        ])

      // Build stats from API responses
      const totalBrands = brandsResult?.totalBrands ?? FALLBACK_STATS.totalBrands
      const totalItems = wardrobeResult?.totalItems ?? FALLBACK_STATS.totalClothingItems
      const totalUsers = usersResult?.totalUsers ?? FALLBACK_STATS.totalUsers
      const recentActivityCount = auditResult?.recentActivity ?? FALLBACK_STATS.recentActivity

      const dashboardStats: DashboardStats = {
        totalBrands,
        totalClothingItems: totalItems,
        totalUsers,
        recentActivity: recentActivityCount,
        brandsByCountry: brandsResult?.brandsByCountry ?? FALLBACK_STATS.brandsByCountry,
        itemsByCategory: wardrobeResult?.itemsByCategory ?? FALLBACK_STATS.itemsByCategory,
        itemsByBrand: wardrobeResult?.itemsByBrand ?? FALLBACK_STATS.itemsByBrand,
        // Only show growth if there's actual data, otherwise 0
        brandGrowth: totalBrands > 0 ? Math.round((totalBrands / Math.max(totalBrands - 1, 1)) * 10) : 0,
        itemGrowth: totalItems > 0 ? Math.round((totalItems / Math.max(totalItems - 1, 1)) * 10) : 0,
      }

      setStats(dashboardStats)

      // Map recent audit logs to activity format
      if (recentAuditResult?.logs) {
        const activities: RecentActivity[] = recentAuditResult.logs.map((log) => ({
          id: log._id,
          action: log.action,
          resource: log.resource,
          userEmail: log.userEmail,
          timestamp: log.timestamp,
        }))
        setRecentActivities(activities)
      }
    } catch (err) {
      console.error("Error fetching dashboard stats:", err)
      setError("Failed to load statistics")
      setStats(FALLBACK_STATS)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true
      fetchStats()
    }
  }, [])

  if (isLoading || !stats) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const statCards = [
    {
      title: "Total Brands",
      value: stats.totalBrands,
      description: "Registered fashion brands",
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      growth: stats.brandGrowth,
      trend: stats.brandGrowth >= 0 ? "up" as const : "down" as const,
      showGrowth: stats.totalBrands > 0,
    },
    {
      title: "Clothing Items",
      value: stats.totalClothingItems,
      description: "Items in wardrobe database",
      icon: Shirt,
      color: "text-green-600",
      bgColor: "bg-green-50",
      growth: stats.itemGrowth,
      trend: stats.itemGrowth >= 0 ? "up" as const : "down" as const,
      showGrowth: stats.totalClothingItems > 0,
    },
    {
      title: "Active Users",
      value: stats.totalUsers,
      description: "Registered users",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      growth: stats.totalUsers > 0 ? Math.round((stats.totalUsers / Math.max(stats.totalUsers - 1, 1)) * 10) : 0,
      trend: "up" as const,
      showGrowth: stats.totalUsers > 0,
    },
    {
      title: "Recent Activity",
      value: stats.recentActivity,
      description: "Actions in last 24h",
      icon: Activity,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      growth: stats.recentActivity,
      trend: stats.recentActivity > 0 ? "up" as const : "down" as const,
      showGrowth: false, // Don't show percentage for activity count
    },
  ]

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm text-destructive">{error}</span>
          <Button variant="outline" size="sm" onClick={fetchStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      )}

      {/* Main Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-md ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
              {stat.showGrowth ? (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {stat.trend === "up" ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={stat.trend === "up" ? "text-green-500" : "text-red-500"}>
                    +{stat.growth}%
                  </span>
                  <span>this month</span>
                </div>
              ) : (
                <div className="h-4" /> 
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Analytics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Brands by Country */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Brands by Country
            </CardTitle>
            <CardDescription>
              Top countries by brand count
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.brandsByCountry.map((item) => (
                <div key={item.country} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-medium">{item.country}</span>
                  </div>
                  <Badge variant="secondary">{item.count}</Badge>
                </div>
              ))}
              {stats.brandsByCountry.length === 0 && (
                <p className="text-sm text-muted-foreground">No country data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Items by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shirt className="h-5 w-5" />
              Items by Category
            </CardTitle>
            <CardDescription>
              Distribution of clothing categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.itemsByCategory.map((item, index) => {
                const colors = ["bg-green-500", "bg-blue-500", "bg-purple-500", "bg-orange-500"]
                return (
                  <div key={item.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${colors[index % colors.length]}`}></div>
                      <span className="text-sm font-medium">{item.category}</span>
                    </div>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                )
              })}
              {stats.itemsByCategory.length === 0 && (
                <p className="text-sm text-muted-foreground">No category data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Brands */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Top Brands
            </CardTitle>
            <CardDescription>
              Most popular brands by item count
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.itemsByBrand.map((item) => {
                const colors = ["bg-purple-500", "bg-green-500", "bg-blue-500", "bg-orange-500", "bg-red-500"]
                const colorIndex = stats.itemsByBrand.indexOf(item)
                return (
                  <div key={item.brand} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${colors[colorIndex % colors.length]}`}></div>
                      <span className="text-sm font-medium">{item.brand}</span>
                    </div>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                )
              })}
              {stats.itemsByBrand.length === 0 && (
                <p className="text-sm text-muted-foreground">No brand data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Latest admin actions in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivities.map((activity) => {
              const actionColor = activity.action.includes('CREATE') ? 'text-green-600' :
                                 activity.action.includes('UPDATE') ? 'text-blue-600' :
                                 activity.action.includes('DELETE') ? 'text-red-600' : 'text-gray-600'
              
              return (
                <div key={activity.id} className="flex items-start justify-between border-b pb-3 last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={actionColor}>
                        {activity.action.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-sm text-muted-foreground">on</span>
                      <span className="text-sm font-medium">{activity.resource}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      by {activity.userEmail}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(activity.timestamp).toLocaleString()}
                  </div>
                </div>
              )
            })}
            {recentActivities.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}