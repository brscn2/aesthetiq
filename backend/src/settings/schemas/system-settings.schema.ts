import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SystemSettingsDocument = SystemSettings & Document;

@Schema({ timestamps: true })
export class SystemSettings {
  @Prop({ default: 'AesthetIQ' })
  siteName: string;

  @Prop({ default: 'AI-powered fashion advisory platform' })
  siteDescription: string;

  @Prop({ default: false })
  maintenanceMode: boolean;

  @Prop({ default: true })
  allowRegistration: boolean;

  @Prop({ default: true })
  requireEmailVerification: boolean;

  @Prop({ default: 10 })
  maxUploadSize: number;

  @Prop({ default: 'en' })
  defaultLanguage: string;

  @Prop({ default: 'Europe/Berlin' })
  timezone: string;

  @Prop({ default: 30 })
  sessionTimeout: number;

  @Prop({ default: true })
  enableAuditLogs: boolean;

  @Prop({ default: true })
  enableAnalytics: boolean;

  @Prop({ default: true })
  enableNotifications: boolean;

  @Prop({ default: '' })
  smtpHost: string;

  @Prop({ default: 587 })
  smtpPort: number;

  @Prop({ default: '' })
  adminEmail: string;
}

export const SystemSettingsSchema = SchemaFactory.createForClass(SystemSettings);
