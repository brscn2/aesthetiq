"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TryOnGenerationLoaderProps {
  className?: string;
}

const generationStages = [
  { label: "Gathering atelier references", duration: 2800 },
  { label: "Sculpting the silhouette", duration: 3200 },
  { label: "Weaving light and texture", duration: 3000 },
  { label: "Aligning couture proportions", duration: 3400 },
  { label: "Sealing the reveal", duration: 3600 },
];

export function TryOnGenerationLoader({ className }: TryOnGenerationLoaderProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stageInterval = setInterval(() => {
      setCurrentStage((prev) => (prev + 1) % generationStages.length);
    }, generationStages[currentStage].duration);

    return () => clearInterval(stageInterval);
  }, [currentStage]);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const remaining = 92 - prev;
        const increment = Math.max(0.6, remaining * 0.02);
        return Math.min(92, prev + increment);
      });
    }, 120);

    return () => clearInterval(progressInterval);
  }, []);

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-primary/15 bg-card/40 shadow-2xl backdrop-blur-xl",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.12),_transparent_55%)]" />
      <div className="absolute inset-0 luxury-texture opacity-40" />
      <CardContent className="relative p-10 sm:p-12">
        <div className="flex flex-col items-center gap-12">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-medium tracking-[0.3em] uppercase text-primary shadow-[0_0_30px_rgba(168,85,247,0.12)]">
              Atelier AI
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              Preparing your virtual try-on
            </h1>
            <p className="text-sm text-muted-foreground">
              A quiet moment while couture takes form.
            </p>
          </div>

          <div className="relative flex h-56 w-56 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-primary/10 blur-3xl animate-pulse" />
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_20%,_rgba(168,85,247,0.25),_transparent_60%)] blur-2xl animate-mist-drift" />
            <div className="absolute inset-0 rounded-full border border-primary/20 animate-[spin_18s_linear_infinite]" />
            <div className="absolute inset-6 rounded-full border border-primary/30 animate-[spin_12s_linear_infinite_reverse]" />
            <div className="absolute inset-12 rounded-full border border-primary/40 animate-[spin_8s_linear_infinite]" />
            <div className="absolute inset-3 rounded-full border border-accent/20 animate-[spin_20s_linear_infinite_reverse]" />

            <div className="absolute top-6 right-10 h-1 w-1 rounded-full bg-primary/60 animate-[float_4s_ease-in-out_infinite]" />
            <div className="absolute bottom-10 left-6 h-1.5 w-1.5 rounded-full bg-accent/50 animate-[float_5s_ease-in-out_infinite_0.4s]" />
            <div className="absolute top-14 left-12 h-0.5 w-0.5 rounded-full bg-primary/40 animate-[float_6s_ease-in-out_infinite_0.8s]" />

            <div className="relative flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 blur-sm animate-pulse" />
              <div className="absolute inset-0 rounded-full border border-primary/40" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary/80 to-accent shadow-[0_0_25px_rgba(168,85,247,0.4)]">
                <Sparkles className="h-5 w-5 text-primary-foreground animate-pulse" />
              </div>
            </div>
          </div>

          <div className="flex w-full max-w-sm flex-col items-center gap-6">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium text-foreground/90 tracking-wide animate-pulse">
                {generationStages[currentStage].label}
              </p>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/70">
                Suspended in the atelier
              </p>
            </div>

            <div className="w-full space-y-2">
              <div className="h-1 w-full rounded-full bg-primary/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-primary transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[0.65rem] uppercase tracking-[0.4em] text-muted-foreground/60 text-center">
                {Math.round(progress)}% woven
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
