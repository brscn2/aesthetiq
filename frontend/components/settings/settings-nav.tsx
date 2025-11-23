"use client"

import { User, Fingerprint, Sliders, Bell, CreditCard, Shield } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const navItems = [
  {
    title: "Account",
    icon: User,
    isActive: true,
  },
  {
    title: "Biometric Privacy",
    icon: Fingerprint,
    isActive: false,
  },
  {
    title: "Preferences",
    icon: Sliders,
    isActive: false,
  },
  {
    title: "Notifications",
    icon: Bell,
    isActive: false,
  },
  {
    title: "Membership",
    icon: CreditCard,
    isActive: false,
  },
]

export function SettingsNav() {
  return (
    <div className="flex h-full flex-col space-y-8">
      {/* User Snippet */}
      <div className="flex flex-col items-center space-y-3 text-center lg:items-start lg:text-left">
        <div className="relative">
          <Avatar className="h-20 w-20 border-2 border-primary/20">
            <AvatarImage src="/professional-portrait-photo-fashion.jpg" alt="User" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-2 -right-2 flex h-6 items-center rounded-full bg-gradient-to-r from-purple-500 to-rose-500 px-2 text-[10px] font-bold text-white shadow-lg">
            PRO
          </div>
        </div>
        <div className="space-y-1">
          <h2 className="font-playfair text-xl font-semibold tracking-tight text-foreground">Jane Doe</h2>
          <p className="bg-gradient-to-r from-amber-200 to-yellow-500 bg-clip-text text-sm font-medium text-transparent">
            Pro Member
          </p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex flex-1 flex-col space-y-1">
        {navItems.map((item) => (
          <Button
            key={item.title}
            variant="ghost"
            className={cn(
              "justify-start gap-3 rounded-full px-4 py-6 text-base font-medium transition-all duration-200",
              item.isActive
                ? "bg-accent text-accent-foreground hover:bg-accent/80"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <item.icon className="h-5 w-5" />
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
