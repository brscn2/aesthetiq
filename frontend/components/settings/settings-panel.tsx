"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, Sparkles, Eye, History, Share2, CheckCircle2, Circle, Loader2, Camera } from "lucide-react"
import { useSettings } from "@/contexts/settings-context"
import { useUser } from "@/contexts/user-context"
import { useApi } from "@/lib/api"
import { Currency, ShoppingRegion, Units, Gender } from "@/types/api"
import { useToast } from "@/hooks/use-toast"
import { AvatarCropper } from "./avatar-cropper"

export function SettingsPanel() {
  const { user, isLoading: userLoading, refetch: refetchUser } = useUser()
  const { settings, isLoading: settingsLoading, updateSettings } = useSettings()
  const { uploadApi, userApi } = useApi()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null)
  const [cropperImage, setCropperImage] = useState<string | null>(null)
  const [genderValue, setGenderValue] = useState<Gender | "">("")
  const [isUpdatingGender, setIsUpdatingGender] = useState(false)
  const [birthYear, setBirthYear] = useState("")
  const [birthMonth, setBirthMonth] = useState("")
  const [birthDay, setBirthDay] = useState("")
  const [isUpdatingBirthDate, setIsUpdatingBirthDate] = useState(false)

  const isLoading = userLoading || settingsLoading
  
  // Use local avatar if set, otherwise use user's avatar
  const displayAvatarUrl = localAvatarUrl ?? user?.avatarUrl

  useEffect(() => {
    if (user?.gender) {
      setGenderValue(user.gender)
    } else {
      setGenderValue("")
    }
  }, [user?.gender])

  useEffect(() => {
    if (user?.birthDate) {
      const datePart = user.birthDate.slice(0, 10)
      const [year, month, day] = datePart.split("-")
      setBirthYear(year || "")
      setBirthMonth(month || "")
      setBirthDay(day || "")
    } else {
      setBirthYear("")
      setBirthMonth("")
      setBirthDay("")
    }
  }, [user?.birthDate])

  const birthDateValue =
    birthYear && birthMonth && birthDay
      ? `${birthYear}-${birthMonth}-${birthDay}`
      : ""

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 100 }, (_, index) =>
    String(currentYear - index)
  )

  const months = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ]

  const daysInMonth =
    birthYear && birthMonth
      ? new Date(Number(birthYear), Number(birthMonth), 0).getDate()
      : 31
  const days = Array.from({ length: daysInMonth }, (_, index) =>
    String(index + 1).padStart(2, "0")
  )

  useEffect(() => {
    if (!birthDay) {
      return
    }
    const numericDay = Number(birthDay)
    if (numericDay > daysInMonth) {
      setBirthDay("")
    }
  }, [birthDay, daysInMonth])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type - only common web formats (no HEIC)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Please use JPG, PNG, WebP or GIF format", variant: "destructive" })
      return
    }

    // Validate file size (max 10MB for cropping, will be compressed after)
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Image must be less than 10MB", variant: "destructive" })
      return
    }

    // Create object URL for cropper
    const imageUrl = URL.createObjectURL(file)
    setCropperImage(imageUrl)
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropperImage(null)
    setIsUploadingAvatar(true)
    
    try {
      // Create file from blob
      const file = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" })
      
      // Upload to Azure
      const { url } = await uploadApi.uploadImage(file)
      
      // Update user profile
      await userApi.updateCurrentUser({ avatarUrl: url })
      
      // Set local state immediately for instant feedback
      setLocalAvatarUrl(url)
      
      // Refresh user data in background
      await refetchUser()
      
      toast({ title: "Profile picture updated!" })
    } catch (error) {
      console.error('Avatar upload error:', error)
      toast({ title: "Failed to upload profile picture", variant: "destructive" })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleCropCancel = () => {
    if (cropperImage) {
      URL.revokeObjectURL(cropperImage)
    }
    setCropperImage(null)
  }

  const handleRemoveAvatar = async () => {
    try {
      await userApi.updateCurrentUser({ avatarUrl: '' })
      setLocalAvatarUrl('')
      await refetchUser()
      toast({ title: "Profile picture removed" })
    } catch (error) {
      toast({ title: "Failed to remove profile picture", variant: "destructive" })
    }
  }

  const handleGenderChange = async (value: string) => {
    const gender = value as Gender
    setGenderValue(gender)
    setIsUpdatingGender(true)
    try {
      await userApi.updateCurrentUser({ gender })
      await refetchUser()
      toast({ title: "Gender updated" })
    } catch (error) {
      console.error("Failed to update gender:", error)
      setGenderValue(user?.gender ?? "")
      toast({ title: "Failed to update gender", variant: "destructive" })
    } finally {
      setIsUpdatingGender(false)
    }
  }

  useEffect(() => {
    const previousBirthDate = user?.birthDate ? user.birthDate.slice(0, 10) : ""
    if (!birthDateValue || birthDateValue === previousBirthDate) {
      return
    }

    const updateBirthDate = async () => {
      setIsUpdatingBirthDate(true)
      try {
        await userApi.updateCurrentUser({ birthDate: birthDateValue })
        await refetchUser()
        toast({ title: "Birth date updated" })
      } catch (error) {
        console.error("Failed to update birth date:", error)
        const [year, month, day] = previousBirthDate.split("-")
        setBirthYear(year || "")
        setBirthMonth(month || "")
        setBirthDay(day || "")
        toast({ title: "Failed to update birth date", variant: "destructive" })
      } finally {
        setIsUpdatingBirthDate(false)
      }
    }

    updateBirthDate()
  }, [
    birthDateValue,
    refetchUser,
    toast,
    user?.birthDate,
    userApi,
  ])

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl flex items-center justify-center p-8">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading settings...</span>
        </div>
      </div>
    )
  }
  return (
    <>
    {/* Avatar Cropper Modal */}
    {cropperImage && (
      <AvatarCropper
        imageSrc={cropperImage}
        onCropComplete={handleCropComplete}
        onCancel={handleCropCancel}
      />
    )}
    
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="font-playfair text-2xl sm:text-3xl font-medium tracking-tight text-foreground">Account & Privacy</h1>
        <p className="text-sm text-muted-foreground">Manage your subscription, privacy settings, and global preferences.</p>
      </div>

      {/* Profile Picture Section */}
      <Card className="border-border">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <div className="h-24 w-24 rounded-full border-2 border-border overflow-hidden bg-muted flex items-center justify-center">
                {displayAvatarUrl ? (
                  <img 
                    src={displayAvatarUrl} 
                    alt={user?.name || 'Profile'} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-medium text-foreground">
                    {user?.name?.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2) || 'U'}
                  </span>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute bottom-0 right-0 rounded-full bg-primary p-2 text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            <div className="flex-1 text-center sm:text-left space-y-2">
              <h3 className="font-medium text-lg">{user?.name || 'User'}</h3>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? 'Uploading...' : 'Change Photo'}
                </Button>
                {displayAvatarUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveAvatar}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Basics */}
      <Card className="border-border" id="profile-basics">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h3 className="font-medium text-lg">Profile Basics</h3>
              <p className="text-sm text-muted-foreground">
                Used to personalize recommendations and sizing.
              </p>
            </div>
            <div className="w-full sm:w-96 space-y-4">
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={genderValue || undefined}
                  onValueChange={handleGenderChange}
                  disabled={isUpdatingGender}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Gender.MALE}>Male</SelectItem>
                    <SelectItem value={Gender.FEMALE}>Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Birth Date</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Select
                    value={birthMonth || undefined}
                    onValueChange={setBirthMonth}
                    disabled={isUpdatingBirthDate}
                  >
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={birthDay || undefined}
                    onValueChange={setBirthDay}
                    disabled={isUpdatingBirthDate}
                  >
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectContent>
                      {days.map((day) => (
                        <SelectItem key={day} value={day}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={birthYear || undefined}
                    onValueChange={setBirthYear}
                    disabled={isUpdatingBirthDate}
                  >
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zone A: Membership & Status */}
      <Card className="relative overflow-hidden border-none bg-gradient-to-br from-[#2D1B36] to-[#1A1025]">
        {/* Decorative background glow */}
        <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl" />

        <CardContent className="relative flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center sm:p-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-rose-300">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Current Plan</span>
            </div>
            <h3 className="font-playfair text-xl sm:text-2xl text-white">
              AesthetIQ {user?.subscriptionStatus === 'PRO' ? 'Pro' : 'Free'}
            </h3>
            <p className="text-xs sm:text-sm text-purple-200/80">
              {user?.subscriptionStatus === 'PRO' ? 'Next billing: Nov 24, 2025' : 'Upgrade to unlock premium features'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white w-full sm:w-auto"
          >
            Manage Subscription
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Zone B: Biometric & Data Privacy */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-playfair text-xl sm:text-2xl font-medium">Data & Privacy</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Control how your biometric data and preferences are used.</p>
        </div>

        <div className="grid gap-4">
          <div 
            className="flex items-center justify-between space-x-3 rounded-lg border border-border bg-card/50 p-3 sm:p-4 cursor-pointer hover:bg-card/70 transition-colors"
            onClick={() => updateSettings({ allowFacialAnalysis: !settings?.allowFacialAnalysis })}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5 rounded-full bg-primary/10 p-1.5 sm:p-2 flex-shrink-0">
                <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <Label className="text-sm sm:text-base cursor-pointer">Allow Facial Feature Analysis</Label>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Enables AI to analyze your face shape and skin tone for personalized recommendations.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">
              {settings?.allowFacialAnalysis ? (
                <CheckCircle2 className="h-6 w-6 text-primary" />
              ) : (
                <Circle className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
          </div>

          <div 
            className="flex items-center justify-between space-x-3 rounded-lg border border-border bg-card/50 p-3 sm:p-4 cursor-pointer hover:bg-card/70 transition-colors"
            onClick={() => updateSettings({ storeColorHistory: !settings?.storeColorHistory })}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5 rounded-full bg-primary/10 p-1.5 sm:p-2 flex-shrink-0">
                <History className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <Label className="text-sm sm:text-base cursor-pointer">Store Color Palette History</Label>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Keep a record of your seasonal color analysis results over time.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">
              {settings?.storeColorHistory ? (
                <CheckCircle2 className="h-6 w-6 text-primary" />
              ) : (
                <Circle className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
          </div>

          <div 
            className="flex items-center justify-between space-x-3 rounded-lg border border-border bg-card/50 p-3 sm:p-4 cursor-pointer hover:bg-card/70 transition-colors"
            onClick={() => updateSettings({ contributeToTrendLearning: !settings?.contributeToTrendLearning })}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5 rounded-full bg-primary/10 p-1.5 sm:p-2 flex-shrink-0">
                <Share2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <Label className="text-sm sm:text-base cursor-pointer">Contribute to Trend Learning</Label>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Anonymously share style preferences to help improve trend forecasting.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">
              {settings?.contributeToTrendLearning ? (
                <CheckCircle2 className="h-6 w-6 text-primary" />
              ) : (
                <Circle className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-4 rounded-lg border border-red-900/30 bg-red-950/10 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <h3 className="text-sm sm:text-base font-medium">Delete Biometric Data</h3>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Permanently remove all facial scans and color analysis data. This action cannot be undone.
              </p>
            </div>
            <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-950/30 hover:text-red-300 w-full sm:w-auto">
              Delete All Data
            </Button>
          </div>
        </div>
      </section>

      <Separator />

      {/* Zone C: Global Preferences */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-playfair text-xl sm:text-2xl font-medium">Global Preferences</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Customize your regional and measurement settings.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Measurement Units</Label>
            <Select 
              value={settings?.units || Units.IMPERIAL} 
              onValueChange={(value) => updateSettings({ units: value as Units })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select units" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={Units.IMPERIAL}>Imperial (in/lbs)</SelectItem>
                <SelectItem value={Units.METRIC}>Metric (cm/kg)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Shopping Region</Label>
            <Select 
              value={settings?.shoppingRegion || ShoppingRegion.USA}
              onValueChange={(value) => updateSettings({ shoppingRegion: value as ShoppingRegion })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ShoppingRegion.USA}>United States</SelectItem>
                <SelectItem value={ShoppingRegion.UK}>United Kingdom</SelectItem>
                <SelectItem value={ShoppingRegion.EU}>Europe</SelectItem>
                <SelectItem value={ShoppingRegion.APAC}>Asia Pacific</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <Select 
              value={settings?.currency || Currency.USD}
              onValueChange={(value) => updateSettings({ currency: value as Currency })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={Currency.USD}>USD ($)</SelectItem>
                <SelectItem value={Currency.GBP}>GBP (£)</SelectItem>
                <SelectItem value={Currency.EUR}>EUR (€)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>
    </div>
    </>
  )
}
