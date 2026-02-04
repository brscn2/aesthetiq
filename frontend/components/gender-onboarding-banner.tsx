"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useUser } from "@/contexts/user-context"
import { useApi } from "@/lib/api"
import { Gender } from "@/types/api"
import { useToast } from "@/hooks/use-toast"

export function GenderOnboardingBanner() {
  const { user, isLoading, refetch } = useUser()
  const { userApi } = useApi()
  const { toast } = useToast()
  const [genderValue, setGenderValue] = useState<Gender | "">("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (user?.gender) {
      setGenderValue(user.gender)
    } else {
      setGenderValue("")
    }
  }, [user?.gender])

  if (isLoading || !user || user.gender) {
    return null
  }

  const handleSave = async () => {
    if (!genderValue) {
      toast({ title: "Please select a gender", variant: "destructive" })
      return
    }

    setIsSaving(true)
    try {
      await userApi.updateCurrentUser({ gender: genderValue as Gender })
      await refetch()
      toast({ title: "Profile updated" })
    } catch (error) {
      console.error("Failed to save gender:", error)
      toast({ title: "Failed to update profile", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="mb-6 border-border bg-card/80">
      <CardContent className="p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-[1fr_220px_auto] sm:items-end">
          <div className="space-y-1">
            <h2 className="font-medium text-lg">Complete your profile</h2>
            <p className="text-sm text-muted-foreground">
              Add a quick detail so we can personalize recommendations.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select
              value={genderValue}
              onValueChange={(value) => setGenderValue(value as Gender)}
              disabled={isSaving}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={Gender.MALE}>Male</SelectItem>
                <SelectItem value={Gender.FEMALE}>Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={!genderValue || isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
