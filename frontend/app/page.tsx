import { DashboardLayout } from "@/components/dashboard-layout"
import { StyleDnaPanel } from "@/components/style-dna-panel"
import { ChatStylist } from "@/components/chat-stylist"
import { TrendsSidebar } from "@/components/trends-sidebar"

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="flex h-screen overflow-hidden">
        {/* Main Content - Split View */}
        <div className="flex flex-1 flex-col lg:flex-row">
          {/* Left Panel - Style DNA (Identity Context) */}
          <div className="w-full overflow-y-auto border-b border-border lg:w-2/5 lg:border-b-0 lg:border-r">
            <StyleDnaPanel />
          </div>

          {/* Right Panel - Conversational Stylist (Chat Interface) */}
          <div className="flex-1 overflow-hidden">
            <ChatStylist />
          </div>
        </div>

        {/* Right Sidebar - Trends & Wardrobe */}
        <TrendsSidebar />
      </div>
    </DashboardLayout>
  )
}
