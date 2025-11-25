import { Badge } from "@/components/ui/badge"
import { CloudSun, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function WardrobeIntelligence() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-1 bg-gradient-to-r from-purple-400 to-rose-400 dark:from-purple-200 dark:to-rose-200 bg-clip-text font-serif text-2xl text-transparent">
          Wardrobe Intelligence
        </h2>
        <p className="text-sm text-muted-foreground">AI-driven analysis of your closet</p>
      </div>

      {/* Wardrobe Balance */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Wardrobe Balance</h3>
        <div className="relative flex items-center justify-center py-4">
          {/* Custom circular progress visualization using SVG */}
          <div className="relative h-40 w-40">
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle className="stroke-muted" strokeWidth="8" fill="transparent" r="40" cx="50" cy="50" />
              <circle
                className="stroke-purple-500"
                strokeWidth="8"
                strokeLinecap="round"
                fill="transparent"
                r="40"
                cx="50"
                cy="50"
                strokeDasharray="251.2"
                strokeDashoffset="75.36" // 70% filled
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-bold text-foreground">70%</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Basics</span>
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-purple-500" />
            <span>70% Basics</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-muted" />
            <span>30% Statement</span>
          </div>
        </div>
      </div>

      {/* Gap Analysis */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">Missing Essentials</h3>
          <span className="text-xs text-purple-400">2 Items Identified</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-dashed border-white/20 bg-transparent transition-colors hover:border-white/40 hover:bg-white/5">
            <CardContent className="flex flex-col items-center justify-center gap-2 p-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-muted-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-foreground">White Tee</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-full text-[10px] text-purple-400 hover:text-purple-300"
              >
                Find <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
          <Card className="border-dashed border-white/20 bg-transparent transition-colors hover:border-white/40 hover:bg-white/5">
            <CardContent className="flex flex-col items-center justify-center gap-2 p-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-muted-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v11H6z" />
                  <path d="m2 9 4-4" />
                  <path d="m22 9-4-4" />
                </svg>
              </div>
              <span className="text-xs font-medium text-foreground">Black Blazer</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-full text-[10px] text-purple-400 hover:text-purple-300"
              >
                Find <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Daily Pick */}
      <Card className="overflow-hidden border-none bg-gradient-to-br from-purple-100 to-rose-100 dark:from-purple-900/40 dark:to-slate-900/40">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <Badge variant="outline" className="border-purple-400/30 text-purple-600 dark:text-purple-300">
              Daily Pick
            </Badge>
            <CloudSun className="h-4 w-4 text-purple-600 dark:text-purple-300" />
          </div>
          <p className="mb-4 font-serif text-lg leading-snug text-foreground">
            Wear your <span className="font-italic text-purple-600 dark:text-purple-300">Blue Silk Shirt</span> today - It matches the mild
            weather.
          </p>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-md bg-muted">
              <img
                src="/blue-silk-shirt.jpg"
                alt="Blue Silk Shirt"
                className="h-full w-full object-cover opacity-80"
              />
            </div>
            <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90">
              View Outfit
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
