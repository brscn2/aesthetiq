import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Allow,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsObject,
  IsArray,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

class PendingContextDto {
  @ApiProperty({ description: 'Original message that triggered clarification' })
  @IsString()
  original_message: string;

  @ApiProperty({ description: 'Clarification question asked to user' })
  @IsString()
  clarification_question: string;

  @ApiPropertyOptional({
    description: 'Extracted filters from previous workflow',
  })
  @IsOptional()
  @IsObject()
  extracted_filters?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Search scope (commerce, wardrobe, both)',
  })
  @IsOptional()
  @IsString()
  search_scope?: string;

  @ApiPropertyOptional({
    description: 'Retrieved items from previous workflow',
  })
  @IsOptional()
  @IsArray()
  retrieved_items?: any[];

  @ApiPropertyOptional({ description: 'Refinement iteration number' })
  @IsOptional()
  iteration?: number;
}

class OutfitItemSnapshotDto {
  @ApiProperty({ description: 'Item id' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Item name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Item image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Item category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Item subcategory / type' })
  @IsOptional()
  @IsString()
  subCategory?: string;

  @ApiProperty({
    description: 'Item source',
    enum: ['wardrobe', 'commerce', 'web'],
  })
  @IsIn(['wardrobe', 'commerce', 'web'])
  source: string;

  @ApiPropertyOptional({ description: 'Colors' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colors?: string[];

  @ApiPropertyOptional({ description: 'User notes / description' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Brand' })
  @IsOptional()
  @IsString()
  brand?: string;
}

class OutfitAttachmentDto {
  @ApiProperty({ description: 'Outfit id' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Outfit name' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Outfit item snapshots',
    type: Object,
  })
  @IsObject()
  items: {
    outerwear?: OutfitItemSnapshotDto;
    top?: OutfitItemSnapshotDto;
    bottom?: OutfitItemSnapshotDto;
    footwear?: OutfitItemSnapshotDto;
    dress?: OutfitItemSnapshotDto;
    accessories: OutfitItemSnapshotDto[];
  };
}

class OutfitSwapIntentDto {
  @ApiProperty({ description: 'Outfit id' })
  @IsString()
  outfitId: string;

  @ApiProperty({
    description: 'Swap category',
    enum: ['TOP', 'BOTTOM', 'FOOTWEAR', 'OUTERWEAR', 'DRESS', 'ACCESSORY'],
  })
  @IsIn(['TOP', 'BOTTOM', 'FOOTWEAR', 'OUTERWEAR', 'DRESS', 'ACCESSORY'])
  category: string;
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

  @ApiPropertyOptional({
    description: 'Outfit attachments included with the message',
    type: [OutfitAttachmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OutfitAttachmentDto)
  attachedOutfits?: OutfitAttachmentDto[];

  @ApiPropertyOptional({
    description: 'One-shot swap intents per outfit',
    type: [OutfitSwapIntentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OutfitSwapIntentDto)
  swapIntents?: OutfitSwapIntentDto[];

  @ApiPropertyOptional({
    description: 'Base64 data URLs of user-uploaded images (e.g. for "what is this?" questions)',
    type: [String],
    maxItems: 5,
  })
  @Allow()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
