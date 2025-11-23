import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsMongoId,
  ValidateNested,
  IsEnum,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageRole } from '../schemas/chat-session.schema';

class ChatMessageDto {
  @ApiProperty({ enum: MessageRole, example: MessageRole.USER })
  @IsEnum(MessageRole)
  @IsNotEmpty()
  role: MessageRole;

  @ApiProperty({ example: 'Hello, I need fashion advice' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ required: false, type: Object })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateChatSessionDto {
  @ApiProperty({ description: 'User ID' })
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 'session-123' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ example: 'Fashion Consultation' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ type: [ChatMessageDto], required: false, default: [] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  @IsOptional()
  messages?: ChatMessageDto[];
}

