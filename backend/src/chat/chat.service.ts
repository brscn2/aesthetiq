import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ChatSession,
  ChatSessionDocument,
  MessageRole,
} from './schemas/chat-session.schema';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { UpdateChatSessionDto } from './dto/update-chat-session.dto';
import { AddMessageDto } from './dto/add-message.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatSession.name)
    private chatSessionModel: Model<ChatSessionDocument>,
  ) {}

  async create(createChatSessionDto: CreateChatSessionDto): Promise<ChatSession> {
    const createdSession = new this.chatSessionModel(createChatSessionDto);
    return createdSession.save();
  }

  async findAllByUserId(userId: string): Promise<ChatSession[]> {
    return this.chatSessionModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async findBySessionId(sessionId: string): Promise<ChatSession | null> {
    return this.chatSessionModel.findOne({ sessionId }).exec();
  }

  async findOne(id: string): Promise<ChatSession> {
    const session = await this.chatSessionModel.findById(id).exec();
    if (!session) {
      throw new NotFoundException(`Chat session with ID ${id} not found`);
    }
    return session;
  }

  async update(
    id: string,
    updateChatSessionDto: UpdateChatSessionDto,
  ): Promise<ChatSession> {
    const updatedSession = await this.chatSessionModel
      .findByIdAndUpdate(id, updateChatSessionDto, { new: true })
      .exec();
    if (!updatedSession) {
      throw new NotFoundException(`Chat session with ID ${id} not found`);
    }
    return updatedSession;
  }

  async addMessage(sessionId: string, addMessageDto: AddMessageDto): Promise<ChatSession> {
    const message = {
      ...addMessageDto,
      timestamp: new Date(),
    };
    const updatedSession = await this.chatSessionModel
      .findOneAndUpdate(
        { sessionId },
        { $push: { messages: message } },
        { new: true },
      )
      .exec();
    if (!updatedSession) {
      throw new NotFoundException(`Chat session with sessionId ${sessionId} not found`);
    }
    return updatedSession;
  }

  async remove(id: string): Promise<void> {
    const result = await this.chatSessionModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Chat session with ID ${id} not found`);
    }
  }
}

