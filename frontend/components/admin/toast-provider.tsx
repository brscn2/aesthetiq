"use client"

import { Toaster } from "sonner"
import { useTheme } from "next-themes"

export function AdminToastProvider() {
  const { theme } = useTheme()

  return (
    <Toaster
      theme={theme as "light" | "dark" | "system"}
      position="top-right"
      expand={true}
      richColors={true}
      closeButton={true}
      toastOptions={{
        duration: 4000,
        style: {
          background: "hsl(var(--background))",
          color: "hsl(var(--foreground))",
          border: "1px solid hsl(var(--border))",
        },
        className: "admin-toast",
      }}
    />
  )
}