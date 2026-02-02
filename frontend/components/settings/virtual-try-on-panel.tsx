"use client";

import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Camera, Loader2, Upload, X, Info } from "lucide-react";
import { useUser } from "@/contexts/user-context";
import { useApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function VirtualTryOnPanel() {
  const { user, isLoading: userLoading, refetch: refetchUser } = useUser();
  const { uploadApi, userApi } = useApi();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);

  const displayPhotoUrl = localPhotoUrl ?? user?.tryOnPhotoUrl;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Please use JPG, PNG, or WebP format",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Image must be less than 10MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);

    try {
      // Upload to Azure
      const { url } = await uploadApi.uploadImage(file);

      // Update user profile with try-on photo
      await userApi.updateTryOnPhoto(url);

      // Set local state immediately for instant feedback
      setLocalPhotoUrl(url);

      // Refresh user data in background
      await refetchUser();

      toast({ title: "Virtual try-on photo updated!" });
    } catch (error) {
      console.error("Try-on photo upload error:", error);
      toast({ title: "Failed to upload photo", variant: "destructive" });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemovePhoto = async () => {
    try {
      await userApi.updateTryOnPhoto("");
      setLocalPhotoUrl("");
      await refetchUser();
      toast({ title: "Virtual try-on photo removed" });
    } catch (error) {
      toast({ title: "Failed to remove photo", variant: "destructive" });
    }
  };

  if (userLoading) {
    return (
      <div className="mx-auto max-w-3xl flex items-center justify-center p-8">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="font-playfair text-2xl sm:text-3xl font-medium tracking-tight text-foreground">
          Virtual Try-On
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload a full-body photo to see how clothing items look on you using
          AI.
        </p>
      </div>

      {/* Info Card */}
      <Card className="border-blue-900/30 bg-blue-950/10">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-blue-500/10 p-2 flex-shrink-0">
              <Info className="h-5 w-5 text-blue-400" />
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-blue-300">Photo Guidelines</p>
              <ul className="space-y-1 text-blue-200/80 list-disc list-inside">
                <li>Use a clear, well-lit photo showing your full body</li>
                <li>Stand straight facing the camera</li>
                <li>Wear form-fitting clothes for best results</li>
                <li>Plain background works best</li>
                <li>Supported formats: JPG, PNG, WebP (max 10MB)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Photo Upload Section */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-playfair text-xl sm:text-2xl font-medium">
            Your Photo
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            This photo will be used to generate virtual try-on images.
          </p>
        </div>

        <Card className="border-border">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Photo Preview */}
              <div className="relative">
                <div className="h-48 w-32 rounded-lg border-2 border-border overflow-hidden bg-muted flex items-center justify-center">
                  {displayPhotoUrl ? (
                    <img
                      src={displayPhotoUrl}
                      alt="Virtual try-on photo"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Camera className="h-8 w-8" />
                      <span className="text-xs">No photo</span>
                    </div>
                  )}
                </div>
                {displayPhotoUrl && (
                  <button
                    onClick={handleRemovePhoto}
                    className="absolute -top-2 -right-2 rounded-full bg-destructive p-1.5 text-destructive-foreground shadow-lg hover:bg-destructive/90 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 text-center sm:text-left space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium text-lg">
                    {displayPhotoUrl
                      ? "Update Your Photo"
                      : "Upload Your Photo"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {displayPhotoUrl
                      ? "Replace your current photo with a new one"
                      : "Upload a full-body photo to start using virtual try-on"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <Button
                    variant="default"
                    size="default"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        {displayPhotoUrl ? "Change Photo" : "Upload Photo"}
                      </>
                    )}
                  </Button>

                  {displayPhotoUrl && (
                    <Button
                      variant="outline"
                      size="default"
                      onClick={handleRemovePhoto}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      Remove Photo
                    </Button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* How It Works */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-playfair text-xl sm:text-2xl font-medium">
            How It Works
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border">
            <CardContent className="p-4 space-y-2">
              <div className="rounded-full bg-primary/10 p-3 w-fit">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-medium">1. Upload Photo</h3>
              <p className="text-sm text-muted-foreground">
                Upload a clear full-body photo of yourself
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 space-y-2">
              <div className="rounded-full bg-primary/10 p-3 w-fit">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-medium">2. Select Items</h3>
              <p className="text-sm text-muted-foreground">
                Browse and select clothing items you want to try on
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 space-y-2">
              <div className="rounded-full bg-primary/10 p-3 w-fit">
                <Info className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-medium">3. Generate</h3>
              <p className="text-sm text-muted-foreground">
                AI creates a realistic image of you wearing the items
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
