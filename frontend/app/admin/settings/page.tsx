"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Settings,
  Shield,
  Database,
  Bell,
  Globe,
  Palette,
  Save,
  RefreshCw,
  Server,
} from "lucide-react"
import { toast } from "sonner"
import { useAdminApi, SystemSettings, SystemInfo } from "@/lib/admin-api"

const defaultSettings: SystemSettings = {
  siteName: "AesthetIQ",
  siteDescription: "AI-powered fashion advisory platform",
  maintenanceMode: false,
  allowRegistration: true,
  requireEmailVerification: true,
  maxUploadSize: 10,
  defaultLanguage: "en",
  timezone: "Europe/Berlin",
  sessionTimeout: 30,
  enableAuditLogs: true,
  enableAnalytics: true,
  enableNotifications: true,
  smtpHost: "",
  smtpPort: 587,
  adminEmail: "",
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings)
  const [originalSettings, setOriginalSettings] = useState<SystemSettings>(defaultSettings)
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const api = useAdminApi()
  const apiRef = useRef(api)
  apiRef.current = api

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [settingsData, sysInfo] = await Promise.all([
          apiRef.current.settings.get(),
          apiRef.current.settings.getSystemInfo(),
        ])
        setSettings(settingsData)
        setOriginalSettings(settingsData)
        setSystemInfo(sysInfo)
      } catch (error) {
        console.error("Failed to load settings:", error)
        toast.error("Failed to load settings")
      } finally {
        setIsLoading(false)
      }
    }
    loadSettings()
  }, [])

  const updateSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updatedSettings = await apiRef.current.settings.update(settings)
      setSettings(updatedSettings)
      setOriginalSettings(updatedSettings)
      setHasChanges(false)
      toast.success("Settings saved successfully")
    } catch (error) {
      console.error("Failed to save settings:", error)
      toast.error("Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setSettings(originalSettings)
    setHasChanges(false)
    toast.info("Settings reset to last saved state")
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Settings</h1>
            <p className="text-muted-foreground">Configure system settings and preferences</p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-1/3"></div>
                <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-10 bg-muted rounded"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Settings</h1>
          <p className="text-muted-foreground">Configure system settings and preferences</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            Unsaved Changes
          </Badge>
          <span className="text-sm text-yellow-800">
            You have unsaved changes. Click &quot;Save Changes&quot; to apply them.
          </span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              General Settings
            </CardTitle>
            <CardDescription>Basic site configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">Site Name</Label>
              <Input
                id="siteName"
                value={settings.siteName}
                onChange={(e) => updateSetting("siteName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteDescription">Site Description</Label>
              <Input
                id="siteDescription"
                value={settings.siteDescription}
                onChange={(e) => updateSetting("siteDescription", e.target.value)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Disable site access for non-admins
                </p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => updateSetting("maintenanceMode", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Settings
            </CardTitle>
            <CardDescription>Authentication and access control</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Registration</Label>
                <p className="text-sm text-muted-foreground">Allow new users to sign up</p>
              </div>
              <Switch
                checked={settings.allowRegistration}
                onCheckedChange={(checked) => updateSetting("allowRegistration", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Verification</Label>
                <p className="text-sm text-muted-foreground">Require email verification</p>
              </div>
              <Switch
                checked={settings.requireEmailVerification}
                onCheckedChange={(checked) => updateSetting("requireEmailVerification", checked)}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => updateSetting("sessionTimeout", parseInt(e.target.value) || 30)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Storage Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Storage Settings
            </CardTitle>
            <CardDescription>File upload and storage configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maxUploadSize">Max Upload Size (MB)</Label>
              <Input
                id="maxUploadSize"
                type="number"
                value={settings.maxUploadSize}
                onChange={(e) => updateSetting("maxUploadSize", parseInt(e.target.value) || 10)}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Storage Provider</Label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Azure Blob Storage</Badge>
                <span className="text-sm text-green-600">Connected</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Database</Label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">MongoDB Atlas</Badge>
                <span className="text-sm text-green-600">Connected</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Localization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Localization
            </CardTitle>
            <CardDescription>Language and regional settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultLanguage">Default Language</Label>
              <Select
                value={settings.defaultLanguage}
                onValueChange={(value) => updateSetting("defaultLanguage", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="tr">Turkish</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={settings.timezone}
                onValueChange={(value) => updateSetting("timezone", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Europe/Berlin">Europe/Berlin (CET)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                  <SelectItem value="America/New_York">America/New York (EST)</SelectItem>
                  <SelectItem value="America/Los_Angeles">America/Los Angeles (PST)</SelectItem>
                  <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Email and notification settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Notifications</Label>
                <p className="text-sm text-muted-foreground">Send system notifications</p>
              </div>
              <Switch
                checked={settings.enableNotifications}
                onCheckedChange={(checked) => updateSetting("enableNotifications", checked)}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Admin Email</Label>
              <Input
                id="adminEmail"
                type="email"
                value={settings.adminEmail}
                onChange={(e) => updateSetting("adminEmail", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtpHost">SMTP Host</Label>
                <Input
                  id="smtpHost"
                  value={settings.smtpHost}
                  onChange={(e) => updateSetting("smtpHost", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPort">SMTP Port</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  value={settings.smtpPort}
                  onChange={(e) => updateSetting("smtpPort", parseInt(e.target.value) || 587)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Features
            </CardTitle>
            <CardDescription>Enable or disable platform features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Audit Logs</Label>
                <p className="text-sm text-muted-foreground">Track admin actions</p>
              </div>
              <Switch
                checked={settings.enableAuditLogs}
                onCheckedChange={(checked) => updateSetting("enableAuditLogs", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Analytics</Label>
                <p className="text-sm text-muted-foreground">Collect usage statistics</p>
              </div>
              <Switch
                checked={settings.enableAnalytics}
                onCheckedChange={(checked) => updateSetting("enableAnalytics", checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            System Information
          </CardTitle>
          <CardDescription>Current system status and version info</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Version</p>
              <p className="font-medium">{systemInfo?.version || "1.0.0"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Environment</p>
              <Badge variant="outline">{systemInfo?.environment || "development"}</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">API Status</p>
              <Badge className="bg-green-100 text-green-800">
                {systemInfo?.apiStatus || "healthy"}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Last Deployment</p>
              <p className="font-medium">
                {systemInfo?.lastDeployment
                  ? new Date(systemInfo.lastDeployment).toLocaleDateString()
                  : new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
