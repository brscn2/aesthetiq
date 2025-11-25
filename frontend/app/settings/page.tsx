"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { SettingsNav } from "@/components/settings/settings-nav"
import { SettingsPanel } from "@/components/settings/settings-panel"
import { PreferencesPanel } from "@/components/settings/preferences-panel"

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("Account")

  return (
    <DashboardLayout>
      <div className="flex h-full flex-col bg-background lg:flex-row">
        {/* Left Side: Vertical Navigation */}
        <div className="w-full border-b border-border p-6 lg:w-80 lg:border-b-0 lg:border-r">
          <SettingsNav activeSection={activeSection} onSectionChange={setActiveSection} />
        </div>

        {/* Right Side: Active Settings Panel */}
        <div className="flex-1 overflow-y-auto bg-background/50">
          {activeSection === "Preferences" ? <PreferencesPanel /> : <SettingsPanel />}
        </div>
      </div>
    </DashboardLayout>
  )
}
