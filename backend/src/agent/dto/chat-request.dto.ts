import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, IsObject, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PendingContextDto {
  @ApiProperty({ description: 'Original message that triggered clarification' })
  @IsString()
  original_message: string;

  @ApiProperty({ description: 'Clarification question asked to user' })
  @IsString()
  clarification_question: string;

  @ApiPropertyOptional({ description: 'Extracted filters from previous workflow' })
  @IsOptional()
  @IsObject()
  extracted_filters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Search scope (commerce, wardrobe, both)' })
  @IsOptional()
  @IsString()
  search_scope?: string;

  @ApiPropertyOptional({ description: 'Retrieved items from previous workflow' })
  @IsOptional()
  @IsArray()
  retrieved_items?: any[];

  @ApiPropertyOptional({ description: 'Refinement iteration number' })
  @IsOptional()
  iteration?: number;
}

export class ChatRequestDto {
  @ApiPropertyOptional({
    description: 'Session ID for continuing an existing conversation',
    example: 'session_abc123',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({
    description: 'User message to the AI stylist',
    example: 'I need a jacket for a job interview',
    minLength: 1,
    maxLength: 10000,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  message: string;

  @ApiPropertyOptional({
    description: 'Pending clarification context for follow-up messages',
    type: PendingContextDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PendingContextDto)
  pendingContext?: PendingContextDto;
}
