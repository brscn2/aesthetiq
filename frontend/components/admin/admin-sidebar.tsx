"use client"

import { SignedIn, UserButton } from "@clerk/nextjs"
import { 
  LayoutDashboard, 
  Package, 
  Shirt, 
  Users, 
  FileText, 
  Settings,
  Shield
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Brand Management", href: "/admin/brands", icon: Package },
  { name: "Clothing Items", href: "/admin/clothing", icon: Shirt },
  { name: "User Management", href: "/admin/users", icon: Users },
  { name: "Audit Logs", href: "/admin/audit", icon: FileText },
  { name: "Settings", href: "/admin/settings", icon: Settings },
]

interface AdminSidebarProps {
  onClose?: () => void
}

export function AdminSidebar({ onClose }: AdminSidebarProps) {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-full flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-sidebar-accent-foreground" />
          <div>
            <h1 className="font-serif text-lg font-bold tracking-tight text-sidebar-foreground">
              Admin Panel
            </h1>
            <p className="text-xs text-sidebar-foreground/60">Aesthet<span className="text-gradient-ai">IQ</span></p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-6">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Quick Actions */}
      <div className="border-t border-sidebar-border px-3 py-4">
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider mb-2">
            Quick Actions
          </h3>
          <div className="space-y-1">
            <Link
              href="/admin/brands?action=add"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
            >
              <Package className="h-3 w-3" />
              Add Brand
            </Link>
            <Link
              href="/admin/clothing?action=add"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
            >
              <Shirt className="h-3 w-3" />
              Add Item
            </Link>
          </div>
        </div>
      </div>

      {/* User Section */}
      <div className="border-t border-sidebar-border p-4">
        <SignedIn>
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <p className="text-sm font-medium text-sidebar-foreground">Admin User</p>
              <p className="text-xs text-sidebar-foreground/60">System Administrator</p>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-sidebar-foreground/60">Theme</span>
            <ThemeToggle />
          </div>
        </SignedIn>
      </div>
    </div>
  )
}