import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type WishlistItemDocument = WishlistItem & Document;

@Schema({ timestamps: true })
export class WishlistItem {
  @ApiProperty({ description: 'User ID (Clerk ID)' })
  @Prop({ required: true, index: true })
  userId: string;

  @ApiProperty({ description: 'Item name' })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ description: 'Item description' })
  @Prop()
  description?: string;

  @ApiProperty({ description: 'Item image URL' })
  @Prop({ required: true })
  imageUrl: string;

  @ApiProperty({ description: 'Item category', enum: ['TOP', 'BOTTOM', 'OUTERWEAR', 'FOOTWEAR', 'ACCESSORY', 'DRESS'] })
  @Prop({ required: true })
  category: string;

  @ApiProperty({ description: 'Item subcategory' })
  @Prop()
  subCategory?: string;

  @ApiProperty({ description: 'Brand name' })
  @Prop()
  brand?: string;

  @ApiProperty({ description: 'Brand ID' })
  @Prop()
  brandId?: string;

  @ApiProperty({ description: 'Retailer ID' })
  @Prop()
  retailerId?: string;

  @ApiProperty({ description: 'Retailer name' })
  @Prop()
  retailerName?: string;

  @ApiProperty({ description: 'Color hex codes' })
  @Prop({ type: [String], default: [] })
  colors: string[];

  @ApiProperty({ description: 'Item price' })
  @Prop()
  price?: number;

  @ApiProperty({ description: 'Currency code (e.g., USD, EUR)' })
  @Prop({ default: 'USD' })
  currency: string;

  @ApiProperty({ description: 'Product URL to purchase' })
  @Prop({ required: true })
  productUrl: string;

  @ApiProperty({ description: 'SKU' })
  @Prop()
  sku?: string;

  @ApiProperty({ description: 'Tags' })
  @Prop({ type: [String], default: [] })
  tags: string[];

  @ApiProperty({ description: 'Whether item is in stock' })
  @Prop({ default: true })
  inStock: boolean;

  @ApiProperty({ description: 'Additional metadata' })
  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'External item ID from source system (commerce item ID)' })
  @Prop({ index: true })
  externalId?: string;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt?: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt?: Date;
}

export const WishlistItemSchema = SchemaFactory.createForClass(WishlistItem);

// Index for querying user's wishlist items and preventing duplicates
WishlistItemSchema.index({ userId: 1, externalId: 1 }, { unique: true, sparse: true });
WishlistItemSchema.index({ userId: 1, createdAt: -1 });
