import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageRole } from '../schemas/chat-session.schema';

class ChatMessageDto {
  @ApiProperty({ enum: MessageRole, required: false })
  @IsEnum(MessageRole)
  @IsOptional()
  role?: MessageRole;

  @ApiProperty({ required: false, example: 'Hello, I need fashion advice' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({ required: false, type: Object })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateChatSessionDto {
  @ApiProperty({ required: false, example: 'Fashion Consultation' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ type: [ChatMessageDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  @IsOptional()
  messages?: ChatMessageDto[];

  @ApiProperty({ type: Object, required: false })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

