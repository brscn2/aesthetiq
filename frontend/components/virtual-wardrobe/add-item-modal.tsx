import type React from "react"
import { Upload, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface AddItemModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AddItemModal({ isOpen, onClose }: AddItemModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl border-white/10 bg-[#1a1a1a] text-white sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-light">Add New Item</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Upload a photo and let our AI analyze the details.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid gap-8 md:grid-cols-2">
          {/* Left Column: Image Preview */}
          <div className="space-y-4">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border-2 border-dashed border-white/10 bg-black/20">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
                <img
                  src="/cashmere-sweater-no-background.jpg"
                  alt="Preview"
                  className="absolute inset-0 h-full w-full object-contain p-4"
                />
                {/* Simulated scanning effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-purple-500/0 via-purple-500/10 to-purple-500/0 opacity-50 transition-transform duration-[3s]" />
              </div>
              <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-md">
                <Switch id="bg-remove" checked={true} />
                <Label htmlFor="bg-remove" className="text-xs text-white">
                  Remove BG
                </Label>
              </div>
            </div>
            <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/5 bg-transparent">
              <Upload className="mr-2 h-4 w-4" />
              Change Photo
            </Button>
          </div>

          {/* Right Column: AI Form */}
          <div className="space-y-5">
            <div className="mb-2 flex items-center gap-2 rounded-md bg-purple-500/10 px-3 py-2 text-sm text-purple-300">
              <SparklesIcon className="h-4 w-4" />
              <span>AI Analysis Complete</span>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Category</Label>
              <Select defaultValue="tops">
                <SelectTrigger className="border-white/10 bg-white/5 text-white">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#1a1a1a] text-white">
                  <SelectItem value="tops">Tops</SelectItem>
                  <SelectItem value="bottoms">Bottoms</SelectItem>
                  <SelectItem value="footwear">Footwear</SelectItem>
                  <SelectItem value="accessories">Accessories</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Brand</Label>
              <Input defaultValue="Vince" className="border-white/10 bg-white/5 text-white" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Material</Label>
              <Input defaultValue="100% Cashmere" className="border-white/10 bg-white/5 text-white" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Color</Label>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full border border-white/20 bg-[#C2B280]" />
                <span className="text-sm">Camel / Beige</span>
              </div>
            </div>

            <div className="pt-4">
              <Button className="w-full bg-white text-black hover:bg-white/90">
                <Check className="mr-2 h-4 w-4" />
                Save to Wardrobe
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  )
}
