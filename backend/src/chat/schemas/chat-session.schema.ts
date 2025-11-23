import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type ChatSessionDocument = ChatSession & Document;

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}

const ChatMessageSchema = new MongooseSchema(
  {
    role: {
      type: String,
      enum: MessageRole,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { _id: false },
);

@Schema({ timestamps: true })
export class ChatSession {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  sessionId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ type: [ChatMessageSchema], default: [] })
  messages: Array<{
    role: MessageRole;
    content: string;
    timestamp: Date;
    metadata: Record<string, any>;
  }>;
}

export const ChatSessionSchema = SchemaFactory.createForClass(ChatSession);

// Create indexes for efficient queries
ChatSessionSchema.index({ userId: 1, sessionId: 1 });
ChatSessionSchema.index({ sessionId: 1 });

