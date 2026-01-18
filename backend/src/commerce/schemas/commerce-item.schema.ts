import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SeasonalPalette } from '../../common/seasonal-colors';

export type CommerceItemDocument = CommerceItem & Document;

export enum Category {
  TOP = 'TOP',
  BOTTOM = 'BOTTOM',
  SHOE = 'SHOE',
  ACCESSORY = 'ACCESSORY',
}

// Type for seasonal palette scores
export type SeasonalPaletteScores = Record<SeasonalPalette, number>;

@Schema({ timestamps: true })
export class CommerceItem {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  imageUrl: string;

  @Prop({ enum: Category, required: true })
  category: Category;

  @Prop()
  subCategory?: string;

  @Prop()
  brand?: string;

  @Prop({ type: Types.ObjectId, ref: 'Brand' })
  brandId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Retailer', required: true })
  retailerId: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  colors: string[];

  @Prop({ type: Number })
  price?: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ required: true })
  productUrl: string;

  @Prop()
  sku?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: true })
  inStock: boolean;

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
   * Flexible metadata field for scraper-specific data
   */
  @Prop({
    type: Object,
    default: {},
  })
  metadata: Record<string, any>;
}

export const CommerceItemSchema = SchemaFactory.createForClass(CommerceItem);

// Create indexes for efficient queries
CommerceItemSchema.index({ retailerId: 1 });
CommerceItemSchema.index({ category: 1 });
CommerceItemSchema.index({ brandId: 1 });
CommerceItemSchema.index({ colors: 1 });
CommerceItemSchema.index({ tags: 1 });
CommerceItemSchema.index({ inStock: 1 });
CommerceItemSchema.index({ price: 1 });
CommerceItemSchema.index({ sku: 1, retailerId: 1 }, { unique: true, sparse: true });

// Text index for search
CommerceItemSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Index for seasonal palette queries
CommerceItemSchema.index({ 'seasonalPaletteScores.WARM_AUTUMN': 1 });
CommerceItemSchema.index({ 'seasonalPaletteScores.WARM_SPRING': 1 });
CommerceItemSchema.index({ 'seasonalPaletteScores.COOL_WINTER': 1 });
CommerceItemSchema.index({ 'seasonalPaletteScores.COOL_SUMMER': 1 });
CommerceItemSchema.index({ 'seasonalPaletteScores.DARK_AUTUMN': 1 });
CommerceItemSchema.index({ 'seasonalPaletteScores.DARK_WINTER': 1 });
CommerceItemSchema.index({ 'seasonalPaletteScores.LIGHT_SPRING': 1 });
CommerceItemSchema.index({ 'seasonalPaletteScores.LIGHT_SUMMER': 1 });
CommerceItemSchema.index({ 'seasonalPaletteScores.MUTED_AUTUMN': 1 });
CommerceItemSchema.index({ 'seasonalPaletteScores.MUTED_SUMMER': 1 });
CommerceItemSchema.index({ 'seasonalPaletteScores.BRIGHT_SPRING': 1 });
CommerceItemSchema.index({ 'seasonalPaletteScores.BRIGHT_WINTER': 1 });
