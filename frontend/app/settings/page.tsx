"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { SettingsNav } from "@/components/settings/settings-nav"
import { SettingsPanel } from "@/components/settings/settings-panel"
import { PreferencesPanel } from "@/components/settings/preferences-panel"
import { Button } from "@/components/ui/button"
import { Settings as SettingsIcon, X } from "lucide-react"

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("Account")
  const [navOpen, setNavOpen] = useState(false)

  return (
    <DashboardLayout>
      <div className="flex h-full flex-col bg-background lg:flex-row">

        {/* Mobile Header */}
        <div className="flex h-14 items-center border-b border-border bg-background px-4 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setNavOpen(!navOpen)}
            className="mr-2"
          >
            {navOpen ? <X className="h-5 w-5" /> : <SettingsIcon className="h-5 w-5" />}
          </Button>
          <h1 className="font-serif text-lg font-bold tracking-tight text-foreground">
            Settings
          </h1>
        </div>

        {/* Mobile Overlay */}
        {navOpen && (
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setNavOpen(false)}
          />
        )}

        {/* Left Navigation (Desktop) + Drawer (Mobile) */}
        <div
          className={`fixed inset-y-0 left-0 z-50 w-80 transform border-r border-border bg-sidebar transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0 ${navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        >
          <div className="flex h-full flex-col p-4 sm:p-6">
            <SettingsNav
              activeSection={activeSection}
              onSectionChange={(section) => {
                setActiveSection(section)
                setNavOpen(false) // mobile drawer kapanır
              }}
              onClose={() => setNavOpen(false)}
            />
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 overflow-y-auto bg-background/50">
          {activeSection === "Preferences" ? <PreferencesPanel /> : <SettingsPanel />}
        </div>

      </div>
    </DashboardLayout>
  )
}
