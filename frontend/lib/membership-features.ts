// Centralized membership features - used by landing page and settings
// Update this file to change features across the entire app

export interface MembershipFeature {
  title: string
  description: string
}

export const FREE_FEATURES: MembershipFeature[] = [
  { title: "Basic Color Analysis", description: "Discover your seasonal palette" },
  { title: "Virtual Wardrobe", description: "Up to 50 items" },
  { title: "AI Recommendations", description: "5 per month" },
]

export const PRO_FEATURES: MembershipFeature[] = [
  { title: "Advanced AI Analysis", description: "Complete style DNA profiling" },
  { title: "Unlimited Wardrobe", description: "No limits on items or categories" },
  { title: "Unlimited AI Stylist", description: "24/7 personalized recommendations" },
  { title: "Trend Forecasting", description: "Stay ahead of fashion trends" },
  { title: "Priority Support", description: "Direct access to style experts" },
]

export const PRO_PRICE = "$9.99"
export const PRO_PRICE_PERIOD = "per month"
