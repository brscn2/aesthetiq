import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PersonaAnalysisJobDocument = PersonaAnalysisJob & Document;

export enum PersonaAnalysisStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Schema({ timestamps: true })
export class PersonaAnalysisJob {
  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({
    type: String,
    enum: Object.values(PersonaAnalysisStatus),
    default: PersonaAnalysisStatus.PENDING,
    index: true,
  })
  status: PersonaAnalysisStatus;

  @Prop({ type: String, required: true, unique: true })
  jobId: string;

  @Prop({ type: Date, default: Date.now })
  startedAt: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: String })
  error?: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const PersonaAnalysisJobSchema = SchemaFactory.createForClass(PersonaAnalysisJob);

// Create indexes for efficient queries
PersonaAnalysisJobSchema.index({ userId: 1, status: 1 });
PersonaAnalysisJobSchema.index({ jobId: 1 }, { unique: true });
