import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export interface StyleItem {
  _id: string;
  sourceUrl: string;
  availableSizes: string[];
  brand: string;
  breadcrumb: string[];
  category: string;
  collection: string;
  color: string;
  colorHex: string;
  colorVariants: string[];
  description: string;
  gender: string;
  imageUrls: string[];
  isActive: boolean;
  material: string;
  name: string;
  price: {
    amount: number;
    currency: string;
    formatted: string;
  };
  primaryImageUrl: string;
  productCode: string;
  sizes: string[];
  store: string;
  subCategory: string;
  embedding: number[];
  lastScraped: string;
  createdAt: string;
  updatedAt: string;
}

export interface StyleItemsResponse {
  items: StyleItem[];
  total: number;
  page: number;
  limit: number;
}

export interface FindStyleItemsParams {
  page?: number;
  limit?: number;
  brand?: string;
  category?: string;
  gender?: string;
  store?: string;
}

export async function findYourStyle(
  token: string,
  params?: FindStyleItemsParams
): Promise<StyleItemsResponse> {
  const response = await axios.get(`${API_BASE_URL}/commerce/find-your-style`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params,
  });
  return response.data;
}
