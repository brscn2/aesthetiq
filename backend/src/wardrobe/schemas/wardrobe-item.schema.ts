import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SeasonalPalette } from '../../common/seasonal-colors';

export type WardrobeItemDocument = WardrobeItem & Document;

export enum Category {
  TOP = 'TOP',
  BOTTOM = 'BOTTOM',
  SHOE = 'SHOE',
  ACCESSORY = 'ACCESSORY',
}

// Type for seasonal palette scores
export type SeasonalPaletteScores = Record<SeasonalPalette, number>;

@Schema({ timestamps: true })
export class WardrobeItem {
  @Prop({ type: String, required: true })
  userId: string;

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

  @Prop({ type: [String], default: [] })
  colors: string[];

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
}

export const WardrobeItemSchema = SchemaFactory.createForClass(WardrobeItem);

// Create indexes for efficient queries
WardrobeItemSchema.index({ userId: 1, category: 1 });
WardrobeItemSchema.index({ userId: 1, colors: 1 });
WardrobeItemSchema.index({ brandId: 1 });

