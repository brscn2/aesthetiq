import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RetailerDocument = Retailer & Document;

@Schema({ timestamps: true })
export class Retailer {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  website?: string;

  @Prop()
  logoUrl?: string;

  @Prop()
  description?: string;

  @Prop()
  country?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const RetailerSchema = SchemaFactory.createForClass(Retailer);

// Create indexes for efficient queries
RetailerSchema.index({ country: 1 });
RetailerSchema.index({ isActive: 1 });
