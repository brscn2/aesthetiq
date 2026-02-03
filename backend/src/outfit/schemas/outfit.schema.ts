import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OutfitDocument = Outfit & Document;

export enum CardTemplate {
  MINIMAL = 'minimal',
  ELEGANT = 'elegant',
  BOLD = 'bold',
}

@Schema({ timestamps: true })
export class Outfit {
  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ required: true, maxlength: 100 })
  name: string;

  @Prop({
    type: {
      top: { type: Types.ObjectId, ref: 'WardrobeItem' },
      bottom: { type: Types.ObjectId, ref: 'WardrobeItem' },
      outerwear: { type: Types.ObjectId, ref: 'WardrobeItem' },
      footwear: { type: Types.ObjectId, ref: 'WardrobeItem' },
      dress: { type: Types.ObjectId, ref: 'WardrobeItem' },
      accessories: [{ type: Types.ObjectId, ref: 'WardrobeItem' }],
    },
    required: true,
  })
  items: {
    top?: Types.ObjectId;
    bottom?: Types.ObjectId;
    outerwear?: Types.ObjectId;
    footwear?: Types.ObjectId;
    dress?: Types.ObjectId;
    accessories: Types.ObjectId[];
  };

  @Prop({ default: false })
  isFavorite: boolean;

  @Prop({
    type: String,
    enum: Object.values(CardTemplate),
    default: CardTemplate.MINIMAL,
  })
  cardTemplate: CardTemplate;
}

export const OutfitSchema = SchemaFactory.createForClass(Outfit);

// Create indexes for efficient queries
OutfitSchema.index({ userId: 1 });
OutfitSchema.index({ userId: 1, isFavorite: 1 });
