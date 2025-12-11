"use client"

import { useState } from "react"
import type React from "react"
import { DashboardSidebar } from "./dashboard-sidebar"
import { Button } from "@/components/ui/button"
import { Menu, X, Sparkles } from "lucide-react"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-sidebar transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <DashboardSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="flex h-14 items-center border-b border-border bg-background px-4 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mr-2"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-purple-500 to-rose-500 rounded-lg p-1.5 shadow-lg shadow-purple-500/25">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-playfair text-lg font-bold bg-gradient-to-r from-purple-600 to-rose-600 bg-clip-text text-transparent">
              AesthetIQ
            </span>
          </div>
        </div>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
