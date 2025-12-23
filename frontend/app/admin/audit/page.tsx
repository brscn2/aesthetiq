"use client"

import { useState, useEffect, useRef } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FileText,
  Search,
  RefreshCw,
  Calendar,
  User,
  Activity,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useAdminApi, AuditLog } from "@/lib/admin-api"
import { toast } from "sonner"

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [resourceFilter, setResourceFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const api = useAdminApi()
  const apiRef = useRef(api)

  apiRef.current = api

  const fetchLogs = async (pageNum: number = 1) => {
    setIsLoading(true)
    try {
      const filters: Record<string, string> = {}
      if (actionFilter !== "all") filters.action = actionFilter
      if (resourceFilter !== "all") filters.resource = resourceFilter
      if (searchQuery) filters.userId = searchQuery

      const result = await apiRef.current.audit.getAll(pageNum, 20, filters)
      setLogs(result.logs)
      setTotalPages(result.totalPages)
      setTotal(result.total)
      setPage(result.page)
    } catch (error) {
      console.error("Failed to fetch audit logs:", error)
      toast.error("Failed to load audit logs")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs(1)
  }, [actionFilter, resourceFilter])

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      CREATE: "bg-green-100 text-green-700",
      UPDATE: "bg-blue-100 text-blue-700",
      DELETE: "bg-red-100 text-red-700",
      LOGIN: "bg-purple-100 text-purple-700",
    }

    const actionType = action.split("_")[0]
    const colorClass = colors[actionType] || "bg-gray-100 text-gray-700"

    return (
      <Badge className={`${colorClass} hover:${colorClass}`}>
        {action.replace(/_/g, " ")}
      </Badge>
    )
  }

  const getResourceBadge = (resource: string) => {
    const colors: Record<string, string> = {
      brand: "bg-orange-100 text-orange-700",
      "wardrobe-item": "bg-cyan-100 text-cyan-700",
      user: "bg-purple-100 text-purple-700",
    }

    const colorClass = colors[resource] || "bg-gray-100 text-gray-700"

    return (
      <Badge variant="outline" className={colorClass}>
        {resource}
      </Badge>
    )
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">
            View and analyze administrative actions
          </p>
        </div>
        <Button onClick={() => fetchLogs(page)} variant="outline" disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground">Audit entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {logs.filter((l) => l.action.includes("CREATE")).length}
            </div>
            <p className="text-xs text-muted-foreground">Create actions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {logs.filter((l) => l.action.includes("UPDATE")).length}
            </div>
            <p className="text-xs text-muted-foreground">Update actions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Deleted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {logs.filter((l) => l.action.includes("DELETE")).length}
            </div>
            <p className="text-xs text-muted-foreground">Delete actions</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Activity Log
          </CardTitle>
          <CardDescription>
            Page {page} of {totalPages} ({total} entries)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchLogs(1)}
                className="pl-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="CREATE_BRAND">Brand Created</SelectItem>
                <SelectItem value="UPDATE_BRAND">Brand Updated</SelectItem>
                <SelectItem value="DELETE_BRAND">Brand Deleted</SelectItem>
                <SelectItem value="CREATE_WARDROBE_ITEM">Item Created</SelectItem>
                <SelectItem value="UPDATE_WARDROBE_ITEM">Item Updated</SelectItem>
                <SelectItem value="DELETE_WARDROBE_ITEM">Item Deleted</SelectItem>
              </SelectContent>
            </Select>
            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                <SelectItem value="brand">Brands</SelectItem>
                <SelectItem value="wardrobe-item">Wardrobe Items</SelectItem>
                <SelectItem value="user">Users</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Logs Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit logs found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log._id}>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {formatDateTime(log.timestamp)}
                        </div>
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell>{getResourceBadge(log.resource)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {(() => {
                              const display = log.userEmail || log.userId || "Unknown"
                              // If it looks like a Clerk ID, show a friendlier name
                              if (display.startsWith("user_")) {
                                return "Unknown User"
                              }
                              return display
                            })()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.resourceId && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {log.resourceId.slice(0, 12)}...
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchLogs(page - 1)}
                    disabled={page <= 1 || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchLogs(page + 1)}
                    disabled={page >= totalPages || isLoading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
