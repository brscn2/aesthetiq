import { CardTemplate } from "@/types/api"

export interface CardTemplateConfig {
  name: string
  background: string
  textColor: string
  accentColor: string
  borderRadius: number
  padding: number
  fontFamily: string
}

export const CARD_TEMPLATES: Record<CardTemplate, CardTemplateConfig> = {
  minimal: {
    name: "Minimal",
    background: "#FFFFFF",
    textColor: "#1A1A1A",
    accentColor: "#666666",
    borderRadius: 0,
    padding: 40,
    fontFamily: "system-ui, sans-serif",
  },
  elegant: {
    name: "Elegant",
    background: "#F5F0EB",
    textColor: "#2C2C2C",
    accentColor: "#8B7355",
    borderRadius: 16,
    padding: 48,
    fontFamily: "Georgia, serif",
  },
  bold: {
    name: "Bold",
    background: "#1A1A1A",
    textColor: "#FFFFFF",
    accentColor: "#9333EA",
    borderRadius: 24,
    padding: 40,
    fontFamily: "system-ui, sans-serif",
  },
}

export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1350
