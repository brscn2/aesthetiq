"use client"

import { User, Fingerprint, Sliders, Bell, CreditCard, Shield, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useUser } from "@/contexts/user-context"

const navItems = [
  {
    title: "Account",
    icon: User,
  },
  {
    title: "Biometric Privacy",
    icon: Fingerprint,
  },
  {
    title: "Preferences",
    icon: Sliders,
  },
  {
    title: "Notifications",
    icon: Bell,
  },
  {
    title: "Membership",
    icon: CreditCard,
  },
]

interface SettingsNavProps {
  activeSection: string
  onSectionChange: (section: string) => void
  onClose?: () => void
}

export function SettingsNav({ activeSection, onSectionChange, onClose }: SettingsNavProps) {
  const { user, isLoading } = useUser()

  // Get user initials for fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="flex h-full flex-col space-y-8">
      {/* User Snippet */}
      <div className="flex items-center gap-3 lg:flex-col lg:items-start lg:gap-2">
        {isLoading ? (
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-3 w-16 bg-muted animate-pulse rounded" />
            </div>
          </div>
        ) : (
          <>
            <div className="relative">
              <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full border-2 border-primary/20 overflow-hidden bg-muted flex items-center justify-center">
                {user?.avatarUrl ? (
                  <img 
                    src={user.avatarUrl} 
                    alt="User" 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-lg sm:text-xl font-medium text-foreground">
                    {user?.name ? getInitials(user.name) : 'U'}
                  </span>
                )}
              </div>
              {user?.subscriptionStatus === 'PRO' && (
                <div className="absolute -bottom-1 -right-1 flex h-5 items-center rounded-full bg-gradient-to-r from-purple-500 to-rose-500 px-1.5 text-[9px] font-bold text-white shadow-lg">
                  PRO
                </div>
              )}
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <h2 className="font-playfair text-base sm:text-lg font-semibold tracking-tight text-foreground truncate">
                {user?.name || 'User'}
              </h2>
              <p className="bg-gradient-to-r from-amber-200 to-yellow-500 bg-clip-text text-xs sm:text-sm font-medium text-transparent">
                {user?.subscriptionStatus === 'PRO' ? 'Pro Member' : 'Free Member'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex flex-1 flex-col space-y-1">
        {navItems.map((item) => (
          <Button
            key={item.title}
            variant="ghost"
            onClick={() => {
              onSectionChange(item.title)
              onClose?.()
            }}
            className={cn(
              "justify-start gap-2 sm:gap-3 rounded-full px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base font-medium transition-all duration-200",
              activeSection === item.title
                ? "bg-accent text-accent-foreground hover:bg-accent/80"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <item.icon className="h-4 w-4 sm:h-5 sm:w-5" />
            {item.title}
          </Button>
        ))}
      </nav>

      {/* Trust Indicator */}
      <div className="mt-auto flex items-center gap-2 rounded-lg border border-border bg-card/50 p-4 text-xs text-muted-foreground">
        <Shield className="h-4 w-4 text-emerald-500" />
        <span>Your data is encrypted and secure.</span>
      </div>
    </div>
  )
}
