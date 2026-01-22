import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { SeasonalPalette, SeasonalPaletteScores } from '../../common/seasonal-colors';
import { Category } from '../../wardrobe/schemas/wardrobe-item.schema';

export type StoreProductDocument = StoreProduct & Document;

/**
 * Price information for a store product
 */
export interface ProductPrice {
  amount: number;      // Price in cents (e.g., 2995 for €29.95)
  currency: string;    // Currency code (e.g., "EUR")
  formatted: string;   // Formatted price string (e.g., "29.95 €")
}

/**
 * Color variant information
 */
export interface ColorVariant {
  color: string;       // Color name
  colorHex?: string;   // Hex color code
  url: string;         // URL to the variant product page
}

/**
 * Store product schema for scraped clothing items from online stores.
 * Designed to be compatible with the existing WardrobeItem schema for
 * embedding-based similarity search and recommendations.
 */
@Schema({ timestamps: true })
export class StoreProduct {
  // === Source Information ===
  
  @Prop({ required: true, unique: true, index: true })
  sourceUrl: string;

  @Prop({ required: true, index: true })
  store: string;  // e.g., "zara", "beymen", "hm"

  @Prop({ required: true })
  productCode: string;

  // === Visual Assets ===

  @Prop({ type: [String], required: true })
  imageUrls: string[];

  @Prop({ required: true })
  primaryImageUrl: string;  // Model-free product image

  // === Categorization (compatible with WardrobeItem) ===

  @Prop({ enum: Category, required: true, index: true })
  category: Category;  // TOP, BOTTOM, SHOE, ACCESSORY

  @Prop()
  subCategory?: string;  // T-Shirt, Jeans, Sneakers, etc.

  @Prop({ type: [String], default: [] })
  breadcrumb: string[];  // e.g., ["Men", "Clothing", "T-Shirts"]

  // === Product Details ===

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop()
  material?: string;  // e.g., "100% Cotton"

  @Prop()
  season?: string;  // e.g., "2026 Spring/Summer"

  @Prop()
  collection?: string;  // e.g., "ZARA ORIGINS"

  // === Brand ===

  @Prop({ required: true, index: true })
  brand: string;

  // === Pricing ===

  @Prop({ type: Object, required: true })
  price: ProductPrice;

  // === Color ===

  @Prop()
  color?: string;  // Color name in English

  @Prop()
  colorHex?: string;  // Hex code for UI display

  @Prop({ type: [Object], default: [] })
  colorVariants?: ColorVariant[];

  // === Sizing ===

  @Prop({ type: [String], default: [] })
  sizes: string[];  // All sizes

  @Prop({ type: [String], default: [] })
  availableSizes: string[];  // Currently in stock

  // === Target Demographic ===

  @Prop({ enum: ['MEN', 'WOMEN', 'UNISEX'] })
  gender?: string;

  // === AI/ML Features (compatible with WardrobeItem) ===

  /**
   * CLIP image embedding (512-dimensional vector)
   * Used for similarity search and recommendations
   */
  @Prop({ type: [Number], default: null })
  embedding?: number[];

  /**
   * Seasonal color palette compatibility scores (0-1)
   * Calculated based on the product's colors
   */
  @Prop({ type: Object, default: null })
  seasonalPaletteScores?: SeasonalPaletteScores;

  // === Metadata ===

  @Prop({ default: true })
  isActive: boolean;  // Whether the product is still available

  @Prop()
  lastScraped?: Date;
}

export const StoreProductSchema = SchemaFactory.createForClass(StoreProduct);

// === Indexes for efficient queries ===

// Text search on product name and description
StoreProductSchema.index({ name: 'text', description: 'text' });

// Common filter combinations
StoreProductSchema.index({ store: 1, category: 1 });
StoreProductSchema.index({ store: 1, brand: 1 });
StoreProductSchema.index({ category: 1, subCategory: 1 });
StoreProductSchema.index({ 'price.amount': 1 });
StoreProductSchema.index({ gender: 1, category: 1 });

// Seasonal palette indexes (for color-based recommendations)
StoreProductSchema.index({ 'seasonalPaletteScores.WARM_AUTUMN': 1 });
StoreProductSchema.index({ 'seasonalPaletteScores.COOL_WINTER': 1 });
StoreProductSchema.index({ 'seasonalPaletteScores.DARK_AUTUMN': 1 });
StoreProductSchema.index({ 'seasonalPaletteScores.LIGHT_SPRING': 1 });
