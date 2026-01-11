// User Types
export enum SubscriptionStatus {
  FREE = 'FREE',
  PRO = 'PRO',
}

export enum Units {
  METRIC = 'METRIC',
  IMPERIAL = 'IMPERIAL',
}

export enum Theme {
  LIGHT = 'LIGHT',
  DARK = 'DARK',
  SYSTEM = 'SYSTEM',
}

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
}

export enum ShoppingRegion {
  USA = 'USA',
  UK = 'UK',
  EU = 'EU',
  APAC = 'APAC',
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
  subscriptionStatus: SubscriptionStatus;
  role?: 'USER' | 'ADMIN';
  settings: UserSettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserDto {
  email: string;
  passwordHash: string;
  name: string;
  avatarUrl?: string;
  subscriptionStatus?: SubscriptionStatus;
  settings?: UserSettings;
}

export interface UpdateUserDto {
  email?: string;
  passwordHash?: string;
  name?: string;
  avatarUrl?: string;
  subscriptionStatus?: SubscriptionStatus;
  settings?: UserSettings;
}

// Seasonal Color Palette Types
export enum SeasonalPalette {
  DARK_AUTUMN = 'DARK_AUTUMN',
  DARK_WINTER = 'DARK_WINTER',
  LIGHT_SPRING = 'LIGHT_SPRING',
  LIGHT_SUMMER = 'LIGHT_SUMMER',
  MUTED_AUTUMN = 'MUTED_AUTUMN',
  MUTED_SUMMER = 'MUTED_SUMMER',
  BRIGHT_SPRING = 'BRIGHT_SPRING',
  BRIGHT_WINTER = 'BRIGHT_WINTER',
  WARM_AUTUMN = 'WARM_AUTUMN',
  WARM_SPRING = 'WARM_SPRING',
  COOL_WINTER = 'COOL_WINTER',
  COOL_SUMMER = 'COOL_SUMMER',
}

export type SeasonalPaletteScores = Record<SeasonalPalette, number>;

// Wardrobe Types
export enum Category {
  TOP = 'TOP',
  BOTTOM = 'BOTTOM',
  SHOE = 'SHOE',
  ACCESSORY = 'ACCESSORY',
}

export interface WardrobeItem {
  _id: string;
  userId: string;
  imageUrl: string;
  processedImageUrl?: string;
  category: Category;
  subCategory?: string;
  brand?: string;
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
  colors?: string[];
  notes?: string;
  isFavorite?: boolean;
  lastWorn?: string;
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
export type FitPreference = 'slim' | 'regular' | 'relaxed' | 'oversized';
export type BudgetRange = 'budget' | 'mid-range' | 'premium' | 'luxury';

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
    shoe?: string;
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
    shoe?: string;
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
    shoe?: string;
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
  USER = 'user',
  ASSISTANT = 'assistant',
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
export type CardTemplate = 'minimal' | 'elegant' | 'bold';

export interface OutfitItems {
  top?: string | WardrobeItem;
  bottom?: string | WardrobeItem;
  shoe?: string | WardrobeItem;
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
  items: { top?: string; bottom?: string; shoe?: string; accessories?: string[] };
  cardTemplate?: CardTemplate;
}

export interface UpdateOutfitDto {
  name?: string;
  items?: { top?: string | null; bottom?: string | null; shoe?: string | null; accessories?: string[] };
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
