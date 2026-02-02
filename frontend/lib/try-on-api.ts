import { StyleItem } from "./style-api";
import { WardrobeItem } from "@/types/api";

export interface TryOnItem {
  id: string;
  name?: string;
  description?: string;
  imageUrl: string;
  processedImageUrl?: string;
  color?: string;
  colors?: string[];
  category: string;
  subCategory?: string;
  material?: string;
  brand?: string;
  notes?: string;
  colorHex?: string;
}

export interface GenerateTryOnRequest {
  userPhotoUrl: string;
  items: Record<string, TryOnItem>;
}

export interface GenerateTryOnResponse {
  success: boolean;
  imageBase64?: string;
  metadata?: {
    user_id: string;
    items_count: number;
    categories: string[];
  };
  error?: string;
}

export async function generateTryOn(
  token: string,
  userPhotoUrl: string,
  items: Record<string, StyleItem | WardrobeItem>,
): Promise<GenerateTryOnResponse> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

  // Convert StyleItems or WardrobeItems to TryOnItem format
  const formattedItems: Record<string, TryOnItem> = {};
  for (const [category, item] of Object.entries(items)) {
    // Check if it's a StyleItem or WardrobeItem
    const isStyleItem = "name" in item;

    if (isStyleItem) {
      // StyleItem
      formattedItems[category] = {
        id: item._id,
        name: item.name,
        description: item.description,
        imageUrl: item.imageUrls?.[0] || item.primaryImageUrl || "",
        color: item.color,
        colorHex: item.colorHex,
        category: item.category,
        subCategory: item.subCategory,
        material: item.material,
        brand: item.brand,
      };
    } else {
      // WardrobeItem
      formattedItems[category] = {
        id: item._id,
        imageUrl: item.imageUrl,
        processedImageUrl: item.processedImageUrl,
        colors: item.colors,
        category: item.category,
        subCategory: item.subCategory,
        brand: item.brand,
        notes: item.notes,
      };
    }
  }

  const response = await fetch(`${apiUrl}/try-on/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      userPhotoUrl,
      items: formattedItems,
    }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to generate try-on image" }));
    throw new Error(error.message || "Failed to generate try-on image");
  }

  return response.json();
}
