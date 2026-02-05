"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useUser } from "@/contexts/user-context"

export function GenderOnboardingBanner() {
  const { user, isLoading } = useUser()

  if (isLoading || !user) {
    return null
  }

  const needsProfile = !user.gender || !user.birthDate
  if (!needsProfile) {
    return null
  }

  return (
    <Card className="mb-6 border-border bg-card/80">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="font-medium text-lg">Complete your profile</h2>
            <p className="text-sm text-muted-foreground">
              Add your gender and birth date for more personalized recommendations.
            </p>
          </div>
          <Button
            asChild
            className="bg-purple-600 text-white hover:bg-purple-700"
          >
            <Link href="/settings#profile-basics">Complete your profile</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
