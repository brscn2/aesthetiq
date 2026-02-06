"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TryOnRevealProps {
  imageBase64: string;
  onDownload: () => void;
  onReset: () => void;
}

export function TryOnReveal({ imageBase64, onDownload, onReset }: TryOnRevealProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsRevealed(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Card className="relative overflow-hidden border-primary/15 bg-card/40 shadow-2xl backdrop-blur-xl">
      <div className="absolute inset-0 luxury-texture opacity-40" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.08),_transparent_55%)]" />
      <CardContent className="relative p-6 sm:p-10">
        <div className="flex flex-col items-center gap-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-medium tracking-[0.3em] uppercase text-primary">
              The Reveal
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight">
              Your virtual try-on is ready
            </h2>
            <p className="text-sm text-muted-foreground">
              A moment of quiet luxury.
            </p>
          </div>

          <div
            className={cn(
              "relative w-full max-w-md overflow-hidden rounded-2xl border border-primary/10 bg-muted/40",
              "transition-all duration-1000",
              isRevealed ? "scale-100 opacity-100" : "scale-95 opacity-0",
            )}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(168,85,247,0.2),_transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,_rgba(168,85,247,0.2),_transparent_65%)] blur-2xl animate-mist-drift" />
            <div className="relative aspect-[3/4] w-full">
              <Image
                src={`data:image/png;base64,${imageBase64}`}
                alt="Virtual try-on result showing you wearing the selected clothing items"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="outline" onClick={onReset}>
              Create another look
            </Button>
            <Button onClick={onDownload} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Download Image
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
