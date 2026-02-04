import { Suspense } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import SettingsContent from "./settings-content";

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="flex h-full items-center justify-center">Loading settings...</div>}>
        <SettingsContent />
      </Suspense>
    </DashboardLayout>
  );
}
