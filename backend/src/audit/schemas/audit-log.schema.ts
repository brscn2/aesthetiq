import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ required: true })
  userId: string; // Clerk user ID

  @Prop({ required: true })
  userEmail: string;

  @Prop({ required: true })
  action: string; // e.g., 'CREATE_BRAND', 'UPDATE_WARDROBE_ITEM', 'DELETE_BRAND'

  @Prop({ required: true })
  resource: string; // e.g., 'brand', 'wardrobe-item'

  @Prop({ type: Types.ObjectId })
  resourceId?: Types.ObjectId; // ID of the affected resource

  @Prop({ type: Object })
  oldData?: Record<string, any>; // Previous state for updates/deletes

  @Prop({ type: Object })
  newData?: Record<string, any>; // New state for creates/updates

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Index for efficient querying
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });