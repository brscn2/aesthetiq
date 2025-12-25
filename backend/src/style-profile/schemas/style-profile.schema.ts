import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StyleProfileDocument = StyleProfile & Document;

export enum FitPreference {
  SLIM = 'slim',
  REGULAR = 'regular',
  RELAXED = 'relaxed',
  OVERSIZED = 'oversized',
}

export enum BudgetRange {
  BUDGET = 'budget',
  MID_RANGE = 'mid-range',
  PREMIUM = 'premium',
  LUXURY = 'luxury',
}

@Schema({ timestamps: true })
export class StyleProfile {
  @Prop({ type: String, required: true, unique: true })
  userId: string;

  @Prop({ required: true })
  archetype: string;

  @Prop({
    type: Map,
    of: Number,
    default: {},
  })
  sliders: Map<string, number>;

  @Prop({ type: [String], default: [] })
  inspirationImageUrls: string[];

  @Prop({ type: [String], default: [] })
  negativeConstraints: string[];

  @Prop({ type: [String], default: [] })
  favoriteBrands: string[];

  @Prop({
    type: {
      top: { type: String },
      bottom: { type: String },
      shoe: { type: String },
    },
    default: {},
  })
  sizes: {
    top?: string;
    bottom?: string;
    shoe?: string;
  };

  @Prop({
    type: {
      top: { type: String, enum: Object.values(FitPreference) },
      bottom: { type: String, enum: Object.values(FitPreference) },
      outerwear: { type: String, enum: Object.values(FitPreference) },
    },
    default: {},
  })
  fitPreferences: {
    top?: FitPreference;
    bottom?: FitPreference;
    outerwear?: FitPreference;
  };

  @Prop({ type: String, enum: Object.values(BudgetRange), default: BudgetRange.MID_RANGE })
  budgetRange: BudgetRange;

  @Prop({ type: Number, min: 0 })
  maxPricePerItem?: number;
}

export const StyleProfileSchema = SchemaFactory.createForClass(StyleProfile);

// Create index for efficient queries
StyleProfileSchema.index({ userId: 1 });

