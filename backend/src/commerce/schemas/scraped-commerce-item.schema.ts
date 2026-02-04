import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ScrapedCommerceItemDocument = ScrapedCommerceItem & Document;

@Schema({ collection: 'commerceitems', timestamps: true })
export class ScrapedCommerceItem {
  @Prop({ required: true })
  sourceUrl: string;

  @Prop({ type: [String], default: [] })
  availableSizes: string[];

  @Prop()
  brand: string;

  @Prop({ type: [String], default: [] })
  breadcrumb: string[];

  @Prop()
  category: string;

  @Prop()
  collection: string;

  @Prop()
  color: string;

  @Prop()
  colorHex: string;

  @Prop({ type: [String], default: [] })
  colorVariants: string[];

  @Prop()
  description: string;

  @Prop()
  gender: string;

  @Prop({ type: [String], default: [] })
  imageUrls: string[];

  @Prop()
  isActive: boolean;

  @Prop()
  material: string;

  @Prop()
  name: string;

  @Prop({ type: Object })
  price: {
    amount: number;
    currency: string;
    formatted: string;
  };

  @Prop()
  primaryImageUrl: string;

  @Prop()
  productCode: string;

  @Prop({ type: [String], default: [] })
  sizes: string[];

  @Prop()
  store: string;

  @Prop()
  subCategory: string;

  @Prop({ type: [Number], default: [] })
  embedding: number[];

  @Prop()
  lastScraped: Date;
}

export const ScrapedCommerceItemSchema = SchemaFactory.createForClass(ScrapedCommerceItem);

// Create indexes for efficient queries
ScrapedCommerceItemSchema.index({ store: 1 });
ScrapedCommerceItemSchema.index({ category: 1 });
ScrapedCommerceItemSchema.index({ brand: 1 });
ScrapedCommerceItemSchema.index({ isActive: 1 });
