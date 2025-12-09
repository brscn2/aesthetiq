import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StyleProfileDocument = StyleProfile & Document;

@Schema({ timestamps: true })
export class StyleProfile {
  @Prop({ type: String, required: true, unique: true, index: true })
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
}

export const StyleProfileSchema = SchemaFactory.createForClass(StyleProfile);

// Create index for efficient queries
StyleProfileSchema.index({ userId: 1 });

