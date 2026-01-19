import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ImageAnalysisCacheDocument = ImageAnalysisCache & Document;

export interface ImageAnalysis {
  styleKeywords: string[];
  colorPalette: string[];
  aestheticNotes: string;
  formalityLevel: 'casual' | 'smart-casual' | 'business' | 'formal';
  silhouettePreferences?: string[];
  patterns?: string[];
  dominantColors?: string[];
}

@Schema({ timestamps: true })
export class ImageAnalysisCache {
  @Prop({ type: String, required: true, unique: true, index: true })
  imageUrlHash: string;

  @Prop({ type: String, required: true })
  imageUrl: string;

  @Prop({ type: Object, required: true })
  analysis: ImageAnalysis;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const ImageAnalysisCacheSchema = SchemaFactory.createForClass(ImageAnalysisCache);

// Create index for efficient queries
ImageAnalysisCacheSchema.index({ imageUrlHash: 1 }, { unique: true });
