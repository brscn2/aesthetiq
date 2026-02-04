"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Camera, Settings } from "lucide-react";

interface PhotoRequiredModalProps {
  isOpen: boolean;
}

export function PhotoRequiredModal({ isOpen }: PhotoRequiredModalProps) {
  const router = useRouter();

  const handleGoToSettings = () => {
    router.push("/settings?tab=virtual-try-on");
  };

  if (!isOpen) return null;

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Camera className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            Photo Required for Virtual Try-On
          </CardTitle>
          <CardDescription>
            To use the Virtual Try-On feature and generate outfit images, you
            need to upload a photo of yourself first.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="rounded-lg border border-muted bg-muted/50 p-4">
            <div className="flex items-start gap-3">
              <Settings className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
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
        </CardContent>

        <CardFooter className="flex justify-center">
          <Button onClick={handleGoToSettings} size="lg">
            <Settings className="mr-2 h-4 w-4" />
            Go to Settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
