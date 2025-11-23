import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ColorAnalysisDocument = ColorAnalysis & Document;

@Schema({ timestamps: true })
export class ColorAnalysis {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  season: string;

  @Prop({ required: true })
  contrastLevel: string;

  @Prop({ required: true })
  undertone: string;

  @Prop({ type: [String], default: [] })
  palette: string[];

  @Prop()
  faceShape?: string;

  @Prop({ default: Date.now })
  scanDate: Date;
}

export const ColorAnalysisSchema = SchemaFactory.createForClass(ColorAnalysis);

// Create index for efficient queries
ColorAnalysisSchema.index({ userId: 1, scanDate: -1 });

