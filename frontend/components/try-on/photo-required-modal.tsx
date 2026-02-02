"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Settings } from "lucide-react";

interface PhotoRequiredModalProps {
  isOpen: boolean;
}

export function PhotoRequiredModal({ isOpen }: PhotoRequiredModalProps) {
  const router = useRouter();

  const handleGoToSettings = () => {
    router.push("/settings?tab=virtual-try-on");
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Camera className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">
            Photo Required for Virtual Try-On
          </DialogTitle>
          <DialogDescription className="text-center">
            To use the Virtual Try-On feature and generate outfit images, you
            need to upload a photo of yourself first.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-muted bg-muted/50 p-4">
          <div className="flex items-start gap-3">
            <Settings className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">How to add your photo:</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Go to Settings</li>
                <li>Navigate to Virtual Try-On section</li>
                <li>Upload a clear, full-body photo</li>
                <li>Return here to start creating outfits</li>
              </ol>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button onClick={handleGoToSettings} className="w-full sm:w-auto">
            <Settings className="mr-2 h-4 w-4" />
            Go to Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
