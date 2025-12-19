import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BrandDocument = Brand & Document;

@Schema({ timestamps: true })
export class Brand {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  description?: string;

  @Prop()
  logoUrl?: string;

  @Prop()
  website?: string;

  @Prop({ min: 1800, max: new Date().getFullYear() })
  foundedYear?: number;

  @Prop()
  country?: string;
}

export const BrandSchema = SchemaFactory.createForClass(Brand);

// Create indexes for efficient queries
BrandSchema.index({ name: 1 });
BrandSchema.index({ country: 1 });
BrandSchema.index({ foundedYear: 1 });