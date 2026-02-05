import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsMongoId,
  IsArray,
  IsUrl,
  IsObject,
  MaxLength,
} from 'class-validator';
import { Category } from '../schemas/wardrobe-item.schema';

export class UpdateWardrobeItemDto {
  @ApiProperty({ required: false, example: 'Classic White T-Shirt' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  name?: string;

  @ApiProperty({ required: false, example: 'A comfortable cotton t-shirt.' })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

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

  @ApiProperty({ required: false, example: '507f1f77bcf86cd799439010' })
  @IsMongoId()
  @IsOptional()
  brandId?: string;

  @ApiProperty({ required: false, example: 'Black' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ required: false, example: '#000000' })
  @IsString()
  @IsOptional()
  colorHex?: string;

  @ApiProperty({ required: false, example: ['#000000', '#111111'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  colorVariants?: string[];

  @ApiProperty({
    required: false,
    example: '507f1f77bcf86cd799439011',
    description: 'Retailer ID reference',
  })
  @IsMongoId()
  @IsOptional()
  retailerId?: string;

  @ApiProperty({ required: false, example: ['#000000', '#FFFFFF'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  colors?: string[];

  @ApiProperty({
    required: false,
    example: { amount: 2999, currency: 'USD', formatted: '$29.99' },
  })
  @IsObject()
  @IsOptional()
  price?: {
    amount: number;
    currency: string;
    formatted?: string;
  };

  @ApiProperty({ required: false, example: 'https://retailer.com/product/123' })
  @IsUrl()
  @IsOptional()
  productUrl?: string;

  @ApiProperty({ required: false, example: 'SKU-12345' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  sku?: string;

  @ApiProperty({ required: false, example: ['casual', 'summer', 'cotton'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  inStock?: boolean;

  @ApiProperty({ required: false, example: ['https://example.com/img1.jpg'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageUrls?: string[];

  @ApiProperty({ required: false, example: 'https://example.com/img1.jpg' })
  @IsString()
  @IsOptional()
  primaryImageUrl?: string;

  @ApiProperty({ required: false, example: 'Cotton' })
  @IsString()
  @IsOptional()
  material?: string;

  @ApiProperty({ required: false, example: 'WOMEN' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty({ required: false, example: ['M'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sizes?: string[];

  @ApiProperty({
    required: false,
    example: { source: 'manual', purchaseDate: '2024-01-01' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({ required: false, example: 'Perfect for casual outings.' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  lastWorn?: string;
}
