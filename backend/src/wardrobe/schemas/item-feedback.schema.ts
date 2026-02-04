import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ItemFeedbackDocument = ItemFeedback & Document;

@Schema({ collection: 'item_feedback', timestamps: false })
export class ItemFeedback {
  @Prop({ required: true })
  user_id: string;

  @Prop({ required: true })
  item_id: string;

  @Prop({ required: true })
  feedback: string;

  @Prop()
  reason?: string;

  @Prop()
  reason_text?: string;

  @Prop()
  session_id?: string;

  @Prop()
  created_at?: Date;

  @Prop()
  updated_at?: Date;
}

export const ItemFeedbackSchema = SchemaFactory.createForClass(ItemFeedback);
