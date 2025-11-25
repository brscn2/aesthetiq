import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Category } from '../schemas/wardrobe-item.schema';

export class CreateWardrobeItemDto {
  // userId is now injected from authentication, not from DTO
  userId?: string;

  @ApiProperty({ example: 'https://example.com/image.jpg' })
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @ApiProperty({
    required: false,
    example: 'https://example.com/processed-image.jpg',
  })
  @IsString()
  @IsOptional()
  processedImageUrl?: string;

  @ApiProperty({ enum: Category, example: Category.TOP })
  @IsEnum(Category)
  @IsNotEmpty()
  category: Category;

  @ApiProperty({ required: false, example: 'T-Shirt' })
  @IsString()
  @IsOptional()
  subCategory?: string;

  @ApiProperty({ required: false, example: 'Nike' })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiProperty({ required: false, example: '#000000' })
  @IsString()
  @IsOptional()
  colorHex?: string;

  @ApiProperty({ default: false, required: false })
  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  lastWorn?: string;
}

