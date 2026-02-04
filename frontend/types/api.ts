// User Types
export enum SubscriptionStatus {
  FREE = "FREE",
  PRO = "PRO",
}

export enum Units {
  METRIC = "METRIC",
  IMPERIAL = "IMPERIAL",
}

export enum Theme {
  LIGHT = "LIGHT",
  DARK = "DARK",
  SYSTEM = "SYSTEM",
}

export enum Currency {
  USD = "USD",
  EUR = "EUR",
  GBP = "GBP",
}

export enum ShoppingRegion {
  USA = "USA",
  UK = "UK",
  EU = "EU",
  APAC = "APAC",
}

export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
}

export interface UserSettings {
  // Measurement & Regional
  units: Units;
  currency: Currency;
  shoppingRegion: ShoppingRegion;

  // Privacy & Biometric Settings
  allowBiometrics: boolean;
  allowFacialAnalysis: boolean;
  storeColorHistory: boolean;
  contributeToTrendLearning: boolean;

  // Feedback & Personalization
  feedbackDecayDays: number;

  // Appearance
  theme: Theme;
}

export interface User {
  _id: string;
  clerkId?: string;
  email: string;
  passwordHash?: string;
  name: string;
  avatarUrl?: string;
  gender?: Gender;
  subscriptionStatus: SubscriptionStatus;
  role?: "USER" | "ADMIN";
  settings: UserSettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserDto {
  email: string;
  passwordHash: string;
  name: string;
  avatarUrl?: string;
  gender?: Gender;
  subscriptionStatus?: SubscriptionStatus;
  settings?: UserSettings;
}

export interface UpdateUserDto {
  email?: string;
  passwordHash?: string;
  name?: string;
  avatarUrl?: string;
  gender?: Gender;
  subscriptionStatus?: SubscriptionStatus;
  settings?: UserSettings;
}

// Seasonal Color Palette Types
export enum SeasonalPalette {
  DARK_AUTUMN = "DARK_AUTUMN",
  DARK_WINTER = "DARK_WINTER",
  LIGHT_SPRING = "LIGHT_SPRING",
  LIGHT_SUMMER = "LIGHT_SUMMER",
  MUTED_AUTUMN = "MUTED_AUTUMN",
  MUTED_SUMMER = "MUTED_SUMMER",
  BRIGHT_SPRING = "BRIGHT_SPRING",
  BRIGHT_WINTER = "BRIGHT_WINTER",
  WARM_AUTUMN = "WARM_AUTUMN",
  WARM_SPRING = "WARM_SPRING",
  COOL_WINTER = "COOL_WINTER",
  COOL_SUMMER = "COOL_SUMMER",
}

export type SeasonalPaletteScores = Record<SeasonalPalette, number>;

// Wardrobe Types
export enum Category {
  TOP = "TOP",
  BOTTOM = "BOTTOM",
  OUTERWEAR = "OUTERWEAR",
  FOOTWEAR = "FOOTWEAR",
  ACCESSORY = "ACCESSORY",
  DRESS = "DRESS",
}

export interface WardrobeItem {
  _id: string;
  userId: string;
  imageUrl: string;
  processedImageUrl?: string;
  category: Category;
  subCategory?: string;
  brand?: string;
  retailerId?: string | Retailer;
  colors?: string[];
  notes?: string;
  isFavorite: boolean;
  lastWorn?: string;
  seasonalPaletteScores?: SeasonalPaletteScores;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateWardrobeItemDto {
  imageUrl: string;
  processedImageUrl?: string;
  category: Category;
  subCategory?: string;
  brand?: string;
  retailerId?: string;
  colors?: string[];
  notes?: string;
  isFavorite?: boolean;
  lastWorn?: string;
}

export interface UpdateWardrobeItemDto {
  imageUrl?: string;
  processedImageUrl?: string;
  category?: Category;
  subCategory?: string;
  brand?: string;
  retailerId?: string;
  colors?: string[];
  notes?: string;
  isFavorite?: boolean;
  lastWorn?: string;
}

// Wardrobe Feedback Types
export interface WardrobeFeedbackMetadata {
  itemId: string;
  feedback: "dislike" | "irrelevant" | "like";
  reason?: string;
  reasonText?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DislikedWardrobeItemEntry {
  item: WardrobeItem;
  feedback: WardrobeFeedbackMetadata;
}

export interface DislikedWardrobeItemsResponse {
  items: DislikedWardrobeItemEntry[];
  limit: number;
  offset: number;
  total: number;
}

// Color Analysis Types
export interface ColorAnalysis {
  _id: string;
  userId: string;
  season: string;
  contrastLevel: string;
  undertone: string;
  palette: Array<{ name: string; hex: string }>;
  faceShape?: string;
  imageUrl?: string;
  scanDate: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateColorAnalysisDto {
  userId: string;
  season: string;
  contrastLevel: string;
  undertone: string;
  palette?: string[];
  faceShape?: string;
  scanDate?: string;
}

// Style Profile Types
export type FitPreference = "slim" | "regular" | "relaxed" | "oversized";
export type BudgetRange = "budget" | "mid-range" | "premium" | "luxury";

export interface StyleProfile {
  _id: string;
  userId: string;
  archetype: string;
  sliders: Record<string, number>;
  inspirationImageUrls: string[];
  negativeConstraints: string[];
  favoriteBrands: string[];
  sizes: {
    top?: string;
    bottom?: string;
    footwear?: string;
  };
  fitPreferences?: {
    top?: FitPreference;
    bottom?: FitPreference;
    outerwear?: FitPreference;
  };
  budgetRange?: BudgetRange;
  maxPricePerItem?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStyleProfileDto {
  userId?: string; // Optional - backend injects it from authentication
  archetype: string;
  sliders?: Record<string, number>;
  inspirationImageUrls?: string[];
  negativeConstraints?: string[];
  favoriteBrands?: string[];
  sizes?: {
    top?: string;
    bottom?: string;
    footwear?: string;
  };
  fitPreferences?: {
    top?: FitPreference;
    bottom?: FitPreference;
    outerwear?: FitPreference;
  };
  budgetRange?: BudgetRange;
  maxPricePerItem?: number;
}

export interface UpdateStyleProfileDto {
  archetype?: string;
  sliders?: Record<string, number>;
  inspirationImageUrls?: string[];
  negativeConstraints?: string[];
  favoriteBrands?: string[];
  sizes?: {
    top?: string;
    bottom?: string;
    footwear?: string;
  };
  fitPreferences?: {
    top?: FitPreference;
    bottom?: FitPreference;
    outerwear?: FitPreference;
  };
  budgetRange?: BudgetRange;
  maxPricePerItem?: number;
}

// Chat Types
export enum MessageRole {
  USER = "user",
  ASSISTANT = "assistant",
}

export interface ChatMessage {
  role: MessageRole;
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ChatSession {
  _id: string;
  userId: string;
  sessionId: string;
  title: string;
  messages: ChatMessage[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateChatSessionDto {
  userId: string;
  sessionId: string;
  title: string;
  messages?: ChatMessage[];
}

export interface UpdateChatSessionDto {
  title?: string;
  messages?: ChatMessage[];
}

export interface AddMessageDto {
  role: MessageRole;
  content: string;
  metadata?: Record<string, any>;
}

// Outfit Types
export type CardTemplate = "minimal" | "elegant" | "bold";

export interface OutfitItems {
  top?: string | WardrobeItem;
  bottom?: string | WardrobeItem;
  outerwear?: string | WardrobeItem;
  footwear?: string | WardrobeItem;
  dress?: string | WardrobeItem;
  accessories: (string | WardrobeItem)[];
}

export interface Outfit {
  _id: string;
  userId: string;
  name: string;
  items: OutfitItems;
  isFavorite: boolean;
  cardTemplate: CardTemplate;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateOutfitDto {
  name: string;
  items: {
    top?: string;
    bottom?: string;
    outerwear?: string;
    footwear?: string;
    dress?: string;
    accessories?: string[];
  };
  cardTemplate?: CardTemplate;
}

export interface UpdateOutfitDto {
  name?: string;
  items?: {
    top?: string | null;
    bottom?: string | null;
    outerwear?: string | null;
    footwear?: string | null;
    dress?: string | null;
    accessories?: string[];
  };
  isFavorite?: boolean;
  cardTemplate?: CardTemplate;
}

// AI Analysis Types
export interface ClothingAnalysisResult {
  category: Category;
  subCategory?: string;
  brand?: string;
  colors: string[];
  styleNotes?: string;
  confidence: number;
}

export interface AnalyzeClothingResponse {
  success: boolean;
  data?: ClothingAnalysisResult;
  error?: string;
}

// Brand Types
export interface Brand {
  _id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  foundedYear?: number;
  country?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BrandSearchOptions {
  search?: string;
  limit?: number;
}

// Retailer Types
export interface Retailer {
  _id: string;
  name: string;
  website?: string;
  logoUrl?: string;
  description?: string;
  country?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRetailerDto {
  name: string;
  website?: string;
  logoUrl?: string;
  description?: string;
  country?: string;
  isActive?: boolean;
}

export interface UpdateRetailerDto {
  name?: string;
  website?: string;
  logoUrl?: string;
  description?: string;
  country?: string;
  isActive?: boolean;
}

export interface RetailerSearchOptions {
  search?: string;
  country?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface RetailerStats {
  totalRetailers: number;
  activeRetailers: number;
  retailersByCountry: { country: string; count: number }[];
}

// Commerce Item Types
export interface CommerceItem {
  _id: string;
  name: string;
  description?: string;
  imageUrl: string;
  category: Category;
  subCategory?: string;
  brand?: string;
  brandId?: string;
  retailerId: string | Retailer;
  colors: string[];
  price?: number;
  currency: string;
  productUrl: string;
  sku?: string;
  tags: string[];
  inStock: boolean;
  seasonalPaletteScores?: SeasonalPaletteScores;
  embedding?: number[];
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCommerceItemDto {
  name: string;
  description?: string;
  imageUrl: string;
  category: Category;
  subCategory?: string;
  brand?: string;
  brandId?: string;
  retailerId: string;
  colors?: string[];
  price?: number;
  currency?: string;
  productUrl: string;
  sku?: string;
  tags?: string[];
  inStock?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateCommerceItemDto {
  name?: string;
  description?: string;
  imageUrl?: string;
  category?: Category;
  subCategory?: string;
  brand?: string;
  brandId?: string;
  retailerId?: string;
  colors?: string[];
  price?: number;
  currency?: string;
  productUrl?: string;
  sku?: string;
  tags?: string[];
  inStock?: boolean;
  metadata?: Record<string, any>;
}

export interface CommerceSearchOptions {
  search?: string;
  category?: Category;
  brandId?: string;
  retailerId?: string;
  color?: string;
  priceMin?: number;
  priceMax?: number;
  tags?: string[];
  inStock?: boolean;
  seasonalPalette?: string;
  minPaletteScore?: number;
  limit?: number;
  offset?: number;
}

export interface CommerceStats {
  totalItems: number;
  inStockItems: number;
  itemsByCategory: { category: string; count: number }[];
  itemsByRetailer: {
    retailerId: string;
    retailerName: string;
    count: number;
  }[];
  itemsByBrand: { brand: string; count: number }[];
}
// Persona Analysis Types
export type PersonaAnalysisStatusType =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface ImageAnalysis {
  styleKeywords: string[];
  colorPalette: string[];
  aestheticNotes: string;
  formalityLevel: "casual" | "smart-casual" | "business" | "formal";
  silhouettePreferences?: string[];
  patterns?: string[];
  dominantColors?: string[];
}

export interface PersonaAnalysisStatus {
  _id: string;
  userId: string;
  status: PersonaAnalysisStatusType;
  jobId: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
  createdAt?: string;
  updatedAt?: string;
}
