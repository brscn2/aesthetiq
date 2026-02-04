"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GenerateButtonProps {
  selectedItemsCount: number;
  isGenerating: boolean;
  onGenerate: () => void;
}

export function GenerateButton({
  selectedItemsCount,
  isGenerating,
  onGenerate,
}: GenerateButtonProps) {
  const isEnabled = selectedItemsCount > 0 && !isGenerating;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onGenerate}
            disabled={!isEnabled}
            size="default"
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Try-On
                {selectedItemsCount > 0 && (
                  <span className="ml-1 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs">
                    {selectedItemsCount}
                  </span>
                )}
              </>
            )}
          </Button>
        </TooltipTrigger>
        {!isEnabled && !isGenerating && (
          <TooltipContent>
            <p>Select at least one clothing item to generate</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
