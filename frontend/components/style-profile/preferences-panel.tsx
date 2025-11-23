"use client"

import { useState } from "react"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, X, Ban } from "lucide-react"

export function PreferencesPanel() {
  const [noGoItem, setNoGoItem] = useState("")
  const [noGos, setNoGos] = useState(["No Leather", "No High Heels", "No Yellow"])

  const addNoGo = () => {
    if (noGoItem.trim()) {
      setNoGos([...noGos, noGoItem.trim()])
      setNoGoItem("")
    }
  }

  const removeNoGo = (index: number) => {
    setNoGos(noGos.filter((_, i) => i !== index))
  }

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      {/* Fit & Style Sliders */}
      <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Fit & Budget Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-4">
            <div className="flex justify-between text-sm font-medium">
              <span>Fit Preference</span>
              <span className="text-muted-foreground">Slightly Oversized</span>
            </div>
            <Slider defaultValue={[70]} max={100} step={1} className="[&>.relative>.absolute]:bg-primary" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Tight</span>
              <span>Oversized</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-sm font-medium">
              <span>Experimentation</span>
              <span className="text-muted-foreground">Balanced</span>
            </div>
            <Slider defaultValue={[50]} max={100} step={1} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Safe</span>
              <span>Bold</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-sm font-medium">
              <span>Budget Range</span>
              <span className="text-muted-foreground">Premium</span>
            </div>
            <Slider defaultValue={[65]} max={100} step={1} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Economy</span>
              <span>Luxury</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No-Go List */}
      <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-serif text-xl">The "No-Go" List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Ban className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="e.g. No Polyester"
                className="pl-9"
                value={noGoItem}
                onChange={(e) => setNoGoItem(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNoGo()}
              />
            </div>
            <Button onClick={addNoGo} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {noGos.map((item, index) => (
              <Badge
                key={index}
                variant="outline"
                className="gap-1 border-destructive/40 bg-destructive/10 px-3 py-1.5 text-destructive hover:bg-destructive/20"
              >
                {item}
                <button onClick={() => removeNoGo(index)} className="ml-1 hover:text-foreground">
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove {item}</span>
                </button>
              </Badge>
            ))}
            {noGos.length === 0 && <p className="text-sm text-muted-foreground italic">No constraints added yet.</p>}
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            AesthetIQ will automatically filter out recommendations containing these attributes.
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
