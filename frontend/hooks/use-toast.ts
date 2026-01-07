"use client"

import { useState, useCallback } from "react"

interface ToastOptions {
  title: string
  description?: string
  variant?: "default" | "destructive"
}

// Simple toast implementation using console and alert for now
// Can be replaced with a proper toast library later
export function useToast() {
  const toast = useCallback(({ title, description, variant }: ToastOptions) => {
    // Log to console for debugging
    if (variant === "destructive") {
      console.error(`[Toast Error] ${title}${description ? `: ${description}` : ""}`)
    } else {
      console.log(`[Toast] ${title}${description ? `: ${description}` : ""}`)
    }
  }, [])

  return { toast }
}
