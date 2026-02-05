"use client"

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs"
import { Home, Palette, Shirt, User, Settings, Sparkles, Heart } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "My Color Analysis", href: "/color-analysis", icon: Palette },
  { name: "Virtual Wardrobe", href: "/virtual-wardrobe", icon: Shirt },
  { name: "Wishlist", href: "/wishlist", icon: Heart },
  { name: "Find Your Own Style", href: "/find-your-style", icon: Sparkles },
  { name: "Style Profile", href: "/style-profile", icon: User },
  { name: "Settings", href: "/settings", icon: Settings },
]

interface DashboardSidebarProps {
  onClose?: () => void
}

export function DashboardSidebar({ onClose }: DashboardSidebarProps) {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-full flex-col bg-sidebar" suppressHydrationWarning>
      {/* Logo - click to go to dashboard */}
      <Link
        href="/"
        onClick={onClose}
        className="flex h-16 items-center border-b border-sidebar-border px-6 hover:opacity-90 transition-opacity"
        suppressHydrationWarning
      >
        <h1 className="font-serif text-2xl font-bold tracking-tight text-sidebar-foreground">
          Aesthet<span className="text-gradient-ai">IQ</span>
        </h1>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-6">
        {navigation.map((item) => {
          const isActive = pathname === item.href
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

      {/* User Section */}
      <div className="border-t border-sidebar-border p-4" suppressHydrationWarning>
        <SignedIn>
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <p className="text-sm font-medium text-sidebar-foreground">Signed in</p>
              <p className="text-xs text-sidebar-foreground/60">Manage your profile</p>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-sidebar-foreground/60">Theme</span>
            <ThemeToggle />
          </div>
        </SignedIn>

        <SignedOut>
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-sidebar-foreground/80">Access your personalized wardrobe</p>
            <SignInButton mode="modal">
              <button className="rounded-md bg-sidebar-accent px-3 py-2 text-sm font-medium text-sidebar-accent-foreground transition hover:opacity-90">
                Sign in
              </button>
            </SignInButton>
          </div>
        </SignedOut>
      </div>
    </div>
  )
}
