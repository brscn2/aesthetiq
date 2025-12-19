"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Package, 
  Shirt, 
  Users, 
  Activity,
  TrendingUp,
  AlertCircle,
  Plus
} from "lucide-react"
import Link from "next/link"
import { useApi } from "@/lib/api"

interface DashboardStats {
  totalBrands: number
  totalClothingItems: number
  totalUsers: number
  recentActivity: number
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalBrands: 0,
    totalClothingItems: 0,
    totalUsers: 0,
    recentActivity: 0,
  })
  const [loading, setLoading] = useState(true)
  const api = useApi()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // For now, we'll use placeholder data
        // In a real implementation, you'd call admin-specific endpoints
        setStats({
          totalBrands: 25,
          totalClothingItems: 1247,
          totalUsers: 89,
          recentActivity: 12,
        })
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [api])

  const statCards = [
    {
      title: "Total Brands",
      value: stats.totalBrands,
      description: "Registered fashion brands",
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      href: "/admin/brands",
    },
    {
      title: "Clothing Items",
      value: stats.totalClothingItems,
      description: "Items in wardrobe database",
      icon: Shirt,
      color: "text-green-600",
      bgColor: "bg-green-50",
      href: "/admin/clothing",
    },
    {
      title: "Active Users",
      value: stats.totalUsers,
      description: "Registered platform users",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      href: "/admin/users",
    },
    {
      title: "Recent Activity",
      value: stats.recentActivity,
      description: "Actions in last 24h",
      icon: Activity,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      href: "/admin/audit",
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>
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
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your fashion platform from here
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/admin/brands/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Brand
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
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
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest admin actions and system events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">New brand "Nike" added</p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
                <Badge variant="secondary">Brand</Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Clothing item updated</p>
                  <p className="text-xs text-muted-foreground">4 hours ago</p>
                </div>
                <Badge variant="secondary">Item</Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">User role updated</p>
                  <p className="text-xs text-muted-foreground">6 hours ago</p>
                </div>
                <Badge variant="secondary">User</Badge>
              </div>
            </div>
            <div className="mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/audit">
                  View All Activity
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              System Status
            </CardTitle>
            <CardDescription>
              Current system health and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Database</span>
                </div>
                <Badge variant="secondary" className="bg-green-50 text-green-700">
                  Healthy
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">API Services</span>
                </div>
                <Badge variant="secondary" className="bg-green-50 text-green-700">
                  Operational
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">File Storage</span>
                </div>
                <Badge variant="secondary" className="bg-yellow-50 text-yellow-700">
                  Monitoring
                </Badge>
              </div>
            </div>
            <div className="mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/settings">
                  System Settings
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common administrative tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" asChild>
              <Link href="/admin/brands/new" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Add New Brand
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/clothing/new" className="flex items-center gap-2">
                <Shirt className="h-4 w-4" />
                Add Clothing Item
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/audit" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                View Audit Logs
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}