"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, ArrowRight } from "lucide-react"
import { useApi } from "@/lib/api"
import { CreateStyleProfileDto } from "@/types/api"

export function CreateStyleProfile({ onCreated }: { onCreated: () => void }) {
  const { styleProfileApi } = useApi()
  const [isCreating, setIsCreating] = useState(false)

  const createPlaceholderProfile = async () => {
    setIsCreating(true)
    try {
      // Create a placeholder style profile with default values
      const placeholderData: CreateStyleProfileDto = {
        archetype: "Urban Minimalist",
        sliders: {
          formal: 50,
          colorful: 20,
          casual: 80,
          trendy: 60,
          classic: 70,
          comfort: 75,
          bold: 40,
          professional: 65,
        },
        inspirationImageUrls: [
          "/minimalist-fashion-street-style.jpg",
          "/architectural-blazer-beige.jpg",
          "/black-monochrome-outfit-texture.jpg",
        ],
        negativeConstraints: ["No Leather", "No High Heels"],
        sizes: {
          top: "M",
          bottom: "32",
          footwear: "9",
        },
      }

      await styleProfileApi.create(placeholderData)
      onCreated()
    } catch (error) {
      console.error("Failed to create style profile:", error)
      alert("Failed to create style profile. Please try again.")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-primary/20 bg-card/30 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto rounded-full bg-primary/10 p-4 w-fit">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <CardTitle className="font-serif text-3xl md:text-4xl">
              Create Your Style Profile
            </CardTitle>
            <p className="text-muted-foreground text-lg">
              Let's build your personalized fashion profile. We'll start with a placeholder profile that you can refine later.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-border/50 bg-muted/20 p-6 space-y-4">
            <h3 className="font-semibold text-lg">What you'll get:</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Your style archetype and persona</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Personalized style preferences and sliders</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Inspiration board for your aesthetic</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Brand sizing and fit preferences</span>
              </li>
            </ul>
          </div>
          <div className="flex justify-center">
            <Button
              onClick={createPlaceholderProfile}
              disabled={isCreating}
              size="lg"
              className="gap-2"
            >
              {isCreating ? (
                "Creating Profile..."
              ) : (
                <>
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            In the future, this will be generated using AI based on your preferences and wardrobe.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
