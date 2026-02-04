import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum SubscriptionStatus {
  FREE = 'FREE',
  PRO = 'PRO',
}

export enum Units {
  METRIC = 'METRIC',
  IMPERIAL = 'IMPERIAL',
}

export enum Theme {
  LIGHT = 'LIGHT',
  DARK = 'DARK',
  SYSTEM = 'SYSTEM',
}

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
}

export enum ShoppingRegion {
  USA = 'USA',
  UK = 'UK',
  EU = 'EU',
  APAC = 'APAC',
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  clerkId: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  name: string;

  @Prop({ enum: Gender })
  gender?: Gender;

  @Prop()
  avatarUrl?: string;

  @Prop()
  tryOnPhotoUrl?: string;

  @Prop({ enum: SubscriptionStatus, default: SubscriptionStatus.FREE })
  subscriptionStatus: SubscriptionStatus;

  @Prop({ enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Prop({
    type: {
      // Measurement & Regional
      units: { type: String, enum: Units, default: Units.METRIC },
      currency: { type: String, enum: Currency, default: Currency.EUR },
      shoppingRegion: {
        type: String,
        enum: ShoppingRegion,
        default: ShoppingRegion.EU,
      },

      // Privacy & Biometric Settings
      allowBiometrics: { type: Boolean, default: false },
      allowFacialAnalysis: { type: Boolean, default: true },
      storeColorHistory: { type: Boolean, default: true },
      contributeToTrendLearning: { type: Boolean, default: false },

      // Feedback & Personalization
      feedbackDecayDays: { type: Number, default: 7 },
      
      // Appearance
      theme: { type: String, enum: Theme, default: Theme.SYSTEM },
    },
    default: {
      units: Units.METRIC,
      currency: Currency.EUR,
      shoppingRegion: ShoppingRegion.EU,
      allowBiometrics: false,
      allowFacialAnalysis: true,
      storeColorHistory: true,
      contributeToTrendLearning: false,
      feedbackDecayDays: 7,
      theme: Theme.SYSTEM,
    },
  })
  settings: {
    // Measurement & Regional
    units: Units;
    currency: Currency;
    shoppingRegion: ShoppingRegion;

    // Privacy & Biometric Settings
    allowBiometrics: boolean;
    allowFacialAnalysis: boolean;
    storeColorHistory: boolean;
    contributeToTrendLearning: boolean;

    // Feedback & Personalization
    feedbackDecayDays: number;
    
    // Appearance
    theme: Theme;
  };
}

export const UserSchema = SchemaFactory.createForClass(User);
