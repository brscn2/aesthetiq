import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsMongoId,
  IsArray,
  IsNumber,
  IsBoolean,
  IsUrl,
  IsObject,
  Min,
  MaxLength,
} from 'class-validator';
import { Category } from '../schemas/commerce-item.schema';

export class UpdateCommerceItemDto {
  @ApiProperty({ required: false, example: 'Classic White T-Shirt' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  name?: string;

  @ApiProperty({ required: false, example: 'A comfortable cotton t-shirt perfect for everyday wear.' })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ required: false, example: 'https://example.com/product-image.jpg' })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ enum: Category, required: false })
  @IsEnum(Category)
  @IsOptional()
  category?: Category;

  @ApiProperty({ required: false, example: 'T-Shirt' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  subCategory?: string;

  @ApiProperty({ required: false, example: 'Nike' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  brand?: string;

  @ApiProperty({ required: false, example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  @IsOptional()
  brandId?: string;

  @ApiProperty({ required: false, example: '507f1f77bcf86cd799439012' })
  @IsMongoId()
  @IsOptional()
  retailerId?: string;

  @ApiProperty({ required: false, example: ['#FFFFFF', '#000000'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  colors?: string[];

  @ApiProperty({ required: false, example: 2999, description: 'Price in cents' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @ApiProperty({ required: false, example: 'USD' })
  @IsString()
  @IsOptional()
  @MaxLength(3)
  currency?: string;

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

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  inStock?: boolean;

  @ApiProperty({ required: false, example: { scraperVersion: '1.0', scrapedAt: '2024-01-01' } })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
