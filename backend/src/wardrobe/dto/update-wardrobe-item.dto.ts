import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsMongoId,
  IsArray,
} from 'class-validator';
import { Category } from '../schemas/wardrobe-item.schema';

export class UpdateWardrobeItemDto {
  @ApiProperty({ required: false, example: 'https://example.com/image.jpg' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    required: false,
    example: 'https://example.com/processed-image.jpg',
  })
  @IsString()
  @IsOptional()
  processedImageUrl?: string;

  @ApiProperty({ enum: Category, required: false })
  @IsEnum(Category)
  @IsOptional()
  category?: Category;

  @ApiProperty({ required: false, example: 'T-Shirt' })
  @IsString()
  @IsOptional()
  subCategory?: string;

  @ApiProperty({ required: false, example: 'Nike' })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiProperty({ required: false, example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  @IsOptional()
  brandId?: string;

  @ApiProperty({ required: false, example: ['#000000', '#FFFFFF'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  colors?: string[];

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  lastWorn?: string;
}

