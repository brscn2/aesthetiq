"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { SettingsNav } from "@/components/settings/settings-nav";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { VirtualTryOnPanel } from "@/components/settings/virtual-try-on-panel";
import { PreferencesPanel } from "@/components/settings/preferences-panel";
import { BiometricPrivacyPanel } from "@/components/settings/biometric-privacy-panel";
import { NotificationsPanel } from "@/components/settings/notifications-panel";
import { MembershipPanel } from "@/components/settings/membership-panel";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, X } from "lucide-react";

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  // Map tab parameter to section name
  const getInitialSection = () => {
    if (tabParam === "virtual-try-on") return "Virtual Try-On";
    return "Account";
  };

  const [activeSection, setActiveSection] = useState(getInitialSection());
  const [navOpen, setNavOpen] = useState(false);

  // Update active section when tab parameter changes
  useEffect(() => {
    if (tabParam === "virtual-try-on") {
      setActiveSection("Virtual Try-On");
    }
  }, [tabParam]);

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
            {navOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <SettingsIcon className="h-5 w-5" />
            )}
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
                setActiveSection(section);
                setNavOpen(false); // mobile drawer kapanır
              }}
              onClose={() => setNavOpen(false)}
            />
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 overflow-y-auto bg-background/50">
          {activeSection === "Account" && <SettingsPanel />}
          {activeSection === "Virtual Try-On" && <VirtualTryOnPanel />}
          {activeSection === "Biometric Privacy" && <BiometricPrivacyPanel />}
          {activeSection === "Preferences" && <PreferencesPanel />}
          {activeSection === "Notifications" && <NotificationsPanel />}
          {activeSection === "Membership" && <MembershipPanel />}
        </div>
      </div>
    </DashboardLayout>
  );
}
