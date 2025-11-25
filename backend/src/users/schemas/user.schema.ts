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

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, index: true })
  clerkId: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  avatarUrl?: string;

  @Prop({ enum: SubscriptionStatus, default: SubscriptionStatus.FREE })
  subscriptionStatus: SubscriptionStatus;

  @Prop({
    type: {
      units: { type: String, enum: Units, default: Units.METRIC },
      allowBiometrics: { type: Boolean, default: false },
    },
    default: {
      units: Units.METRIC,
      allowBiometrics: false,
    },
  })
  settings: {
    units: Units;
    allowBiometrics: boolean;
  };
}

export const UserSchema = SchemaFactory.createForClass(User);

