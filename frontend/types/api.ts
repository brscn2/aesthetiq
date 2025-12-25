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
  colorHex?: string;
  isFavorite: boolean;
  lastWorn?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateWardrobeItemDto {
  imageUrl: string;
  processedImageUrl?: string;
  category: Category;
  subCategory?: string;
  brand?: string;
  colorHex?: string;
  isFavorite?: boolean;
  lastWorn?: string;
}

export interface UpdateWardrobeItemDto {
  imageUrl?: string;
  processedImageUrl?: string;
  category?: Category;
  subCategory?: string;
  brand?: string;
  colorHex?: string;
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

