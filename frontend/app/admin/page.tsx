"use client"

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
  Plus,
  Database,
  Server,
  HardDrive,
  Wifi
} from "lucide-react"
import Link from "next/link"
import { DashboardStats } from "@/components/admin/dashboard-stats"

export default function AdminDashboardPage() {
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
            <Link href="/admin/brands">
              <Plus className="mr-2 h-4 w-4" />
              Add Brand
            </Link>
          </Button>
        </div>
      </div>

      {/* Dashboard Statistics */}
      <DashboardStats />

      {/* System Health & Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              System Health
            </CardTitle>
            <CardDescription>
              Current system status and performance indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Database Connection</span>
                </div>
                <Badge variant="secondary" className="bg-green-50 text-green-700">
                  Healthy
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-green-600" />
                  <span className="text-sm">API Services</span>
                </div>
                <Badge variant="secondary" className="bg-green-50 text-green-700">
                  Operational
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">File Storage</span>
                </div>
                <Badge variant="secondary" className="bg-yellow-50 text-yellow-700">
                  Monitoring
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-green-600" />
                  <span className="text-sm">External APIs</span>
                </div>
                <Badge variant="secondary" className="bg-green-50 text-green-700">
                  Connected
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

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common administrative tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Button variant="outline" asChild className="justify-start">
                <Link href="/admin/brands" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Manage Brands
                </Link>
              </Button>
              <Button variant="outline" asChild className="justify-start">
                <Link href="/admin/clothing" className="flex items-center gap-2">
                  <Shirt className="h-4 w-4" />
                  Manage Clothing Items
                </Link>
              </Button>
              <Button variant="outline" asChild className="justify-start">
                <Link href="/admin/users" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  View Users
                </Link>
              </Button>
              <Button variant="outline" asChild className="justify-start">
                <Link href="/admin/audit" className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  View Audit Logs
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}