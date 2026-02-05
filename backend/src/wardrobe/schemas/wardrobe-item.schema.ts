import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SeasonalPalette } from '../../common/seasonal-colors';

export type WardrobeItemDocument = WardrobeItem & Document;

export enum Category {
  TOP = 'TOP',
  BOTTOM = 'BOTTOM',
  OUTERWEAR = 'OUTERWEAR',
  FOOTWEAR = 'FOOTWEAR',
  ACCESSORY = 'ACCESSORY',
  DRESS = 'DRESS',
}

// Type for seasonal palette scores
export type SeasonalPaletteScores = Record<SeasonalPalette, number>;

@Schema({ timestamps: true })
export class WardrobeItem {
  @Prop({ type: String, required: true })
  userId: string;

  @Prop()
  name?: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  imageUrl: string;

  @Prop()
  processedImageUrl?: string;

  @Prop({ enum: Category, required: true })
  category: Category;

  @Prop()
  subCategory?: string;

  @Prop()
  brand?: string;

  @Prop({ type: Types.ObjectId, ref: 'Brand' })
  brandId?: Types.ObjectId;

  @Prop()
  color?: string;

  @Prop()
  colorHex?: string;

  @Prop({ type: [String], default: [] })
  colorVariants: string[];

  @Prop({ type: Types.ObjectId, ref: 'Retailer' })
  retailerId?: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  colors: string[];

  @Prop({
    type: Object,
  })
  price?: {
    amount: number;
    currency: string;
    formatted?: string;
  };

  @Prop()
  productUrl?: string;

  @Prop()
  sku?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: true })
  inStock: boolean;

  @Prop({ type: [String], default: [] })
  imageUrls: string[];

  @Prop()
  primaryImageUrl?: string;

  @Prop()
  material?: string;

  @Prop()
  gender?: string;

  @Prop({ type: [String], default: [] })
  sizes: string[];

  @Prop()
  notes?: string;

  @Prop({ default: false })
  isFavorite: boolean;

  @Prop()
  lastWorn?: Date;

  /**
   * Seasonal color palette compatibility scores (0-1)
   * Calculated based on the item's colors
   */
  @Prop({
    type: Object,
    default: null,
  })
  seasonalPaletteScores?: SeasonalPaletteScores;

  /**
   * CLIP image embedding (512-dimensional vector)
   * Used for similarity search and recommendations
   */
  @Prop({
    type: [Number],
    default: null,
  })
  embedding?: number[];

  /**
   * Flexible metadata field for custom user data
   */
  @Prop({
    type: Object,
    default: {},
  })
  metadata: Record<string, any>;
}

export const WardrobeItemSchema = SchemaFactory.createForClass(WardrobeItem);

// Create indexes for efficient queries
WardrobeItemSchema.index({ userId: 1, category: 1 });
WardrobeItemSchema.index({ userId: 1, colors: 1 });
WardrobeItemSchema.index({ retailerId: 1 });
WardrobeItemSchema.index({ brandId: 1 });
WardrobeItemSchema.index({ tags: 1 });
WardrobeItemSchema.index({ inStock: 1 });
WardrobeItemSchema.index({ 'price.amount': 1 });

// Text index for search
WardrobeItemSchema.index({ name: 'text', description: 'text', tags: 'text' });
// Index for seasonal palette queries
WardrobeItemSchema.index({ 'seasonalPaletteScores.WARM_AUTUMN': 1 });
WardrobeItemSchema.index({ 'seasonalPaletteScores.WARM_SPRING': 1 });
WardrobeItemSchema.index({ 'seasonalPaletteScores.COOL_WINTER': 1 });
WardrobeItemSchema.index({ 'seasonalPaletteScores.COOL_SUMMER': 1 });
WardrobeItemSchema.index({ 'seasonalPaletteScores.DARK_AUTUMN': 1 });
WardrobeItemSchema.index({ 'seasonalPaletteScores.DARK_WINTER': 1 });
WardrobeItemSchema.index({ 'seasonalPaletteScores.LIGHT_SPRING': 1 });
WardrobeItemSchema.index({ 'seasonalPaletteScores.LIGHT_SUMMER': 1 });
WardrobeItemSchema.index({ 'seasonalPaletteScores.MUTED_AUTUMN': 1 });
WardrobeItemSchema.index({ 'seasonalPaletteScores.MUTED_SUMMER': 1 });
WardrobeItemSchema.index({ 'seasonalPaletteScores.BRIGHT_SPRING': 1 });
WardrobeItemSchema.index({ 'seasonalPaletteScores.BRIGHT_WINTER': 1 });
