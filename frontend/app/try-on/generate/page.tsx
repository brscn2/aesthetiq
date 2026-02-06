"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { TryOnGenerationLoader } from "@/components/try-on/try-on-generation-loader";
import { TryOnReveal } from "@/components/try-on/try-on-reveal";
import { generateTryOn } from "@/lib/try-on-api";

const demoImageBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAWgAAAHgCAIAAAD2C0z1AAAACXBIWXMAAAsSAAALEgHS3X78AAAB9UlEQVR4nO3SMQ0AAAgDINc/9K3hHBQYxraAtJYw9w0Z7l8w+8JBAQkJCSkpKSkpKSkpKSkrJZfVx8XvG3d4y5eXl5f3oL2zR6C8vLy83c/JZgP8u7u7t1tY2fV4+fJkqZp2sJt9vlZl8Z5c1C7d8ybrc8j8r6A4dYtqk2D6v2J+Xz4CqgKJ3C4lW1a8lq3mVn2Jg8c2H1k9g2cF2v4eKp8lF5d0C9mFQ5i2a0QKqg0c4x+fJgXz3J1QwGm0g+Qy0r1yWQqB41dO0h0Xl2O9W1x1o9b6Jp6e1L7G3pV0mQ9wzJQ5uXoG3yQWQ0o1X7bR+v1mW7nC3l8U8l2u5Y8m8D3M9a3Gzj2d5X0a4Q3s9P8l5tH8S7t6zqkQ+gkGv9G9P0h8rVg2u0mF3yQWb7y6L0f1n0a7Dk0o2Q9xX4O4E1v1K4fX1c6i9H2L7Z+v2hQ7xV+Q0OQn4i6n0a3D9g4R0v3o7b2m9H0Y9V8B8i4D7L0xk4b5s0b1o/6G2t7R8M2g4ZgQkJCSkpKSkpKSkpKSkpKT0b3YB7g8g9cGZC2gAAAABJRU5ErkJggg==";

const demoItems = [
  {
    id: "demo-top",
    name: "Architectural Blazer",
    imageUrl: "/architectural-blazer-beige.jpg",
  },
  {
    id: "demo-bottom",
    name: "Wide-Leg Trousers",
    imageUrl: "/wide-leg-trousers-grey.jpg",
  },
  {
    id: "demo-footwear",
    name: "Minimalist Sneakers",
    imageUrl: "/minimalist-white-sneakers.jpg",
  },
];

export default function TryOnGeneratePage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "1";

  const [isGenerating, setIsGenerating] = useState(true);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, any>>({});
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [isSessionReady, setIsSessionReady] = useState(false);

  useEffect(() => {
    const storedItems = sessionStorage.getItem("try-on:selected-items");
    const storedPhoto = sessionStorage.getItem("try-on:user-photo");
    if (storedItems) {
      setSelectedItems(JSON.parse(storedItems));
    }
    if (storedPhoto) {
      setUserPhotoUrl(storedPhoto);
    }
    setIsSessionReady(true);
  }, []);

  useEffect(() => {
    if (!isGenerating) return;

    if (!isSessionReady) return;

    if (isDemo) {
      const timer = setTimeout(() => {
        setImageBase64(demoImageBase64);
        setIsGenerating(false);
      }, 5200);
      return () => clearTimeout(timer);
    }

    const generateImage = async () => {
      try {
        const token = await getToken();
        if (!token) {
          setError("Authentication required");
          setIsGenerating(false);
          return;
        }

        if (!userPhotoUrl) {
          setError("Missing user photo for try-on generation");
          setIsGenerating(false);
          return;
        }

        const response = await generateTryOn(token, userPhotoUrl, selectedItems);
        if (response.success && response.imageBase64) {
          setImageBase64(response.imageBase64);
        } else {
          setError(response.error || "Failed to generate try-on image");
        }
      } catch (err: any) {
        setError(err.message || "Failed to generate try-on image");
      } finally {
        setIsGenerating(false);
      }
    };

    generateImage();
  }, [getToken, isDemo, isGenerating, isSessionReady, selectedItems, userPhotoUrl]);

  const previewItems = useMemo(() => {
    const entries = Object.values(selectedItems);
    if (entries.length > 0) return entries;
    return demoItems;
  }, [selectedItems]);

  const handleDownload = () => {
    if (!imageBase64) return;
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${imageBase64}`;
    link.download = `try-on-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    router.push("/find-your-style");
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-10">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
                Virtual Try-On
              </h1>
              <p className="text-muted-foreground">
                AesthetIQ is tailoring your look behind the curtain.
              </p>
            </div>
            <Button variant="outline" onClick={handleReset}>
              Back to selection
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              {error && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                  {error}
                </div>
              )}
              {isGenerating && !error && <TryOnGenerationLoader />}
              {!isGenerating && imageBase64 && !error && (
                <TryOnReveal
                  imageBase64={imageBase64}
                  onDownload={handleDownload}
                  onReset={handleReset}
                />
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-primary/10 bg-card/40 p-5 shadow-lg backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Selected pieces
                </p>
                <div className="mt-4 space-y-3">
                  {previewItems.map((item: any) => {
                    const imageUrl =
                      item.imageUrl ||
                      item.processedImageUrl ||
                      (item.imageUrls && item.imageUrls[0]) ||
                      item.primaryImageUrl ||
                      "/placeholder.png";

                    return (
                      <div
                        key={item._id || item.id || item.name}
                        className="flex items-center gap-3 rounded-lg border border-primary/10 bg-muted/40 p-3"
                      >
                        <div className="relative h-14 w-14 overflow-hidden rounded-md border border-primary/10 bg-muted">
                          <Image
                            src={imageUrl}
                            alt={item.name || item.subCategory || "Item"}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {item.name || item.subCategory || "Item"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.category || "Curated selection"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {isDemo && (
                <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Studio note
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Demo mode is active. Remove <span className="font-medium">?demo=1</span> to
                    generate a real image.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
