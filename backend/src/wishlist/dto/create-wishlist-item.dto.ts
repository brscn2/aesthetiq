import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsArray, IsBoolean, IsEnum, IsObject } from 'class-validator';

export enum Category {
  TOP = 'TOP',
  BOTTOM = 'BOTTOM',
  OUTERWEAR = 'OUTERWEAR',
  FOOTWEAR = 'FOOTWEAR',
  ACCESSORY = 'ACCESSORY',
  DRESS = 'DRESS',
}

export class CreateWishlistItemDto {
  @ApiProperty({ description: 'Item name', example: 'Classic White T-Shirt' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Item description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Item image URL' })
  @IsString()
  imageUrl: string;

  @ApiProperty({ description: 'Item category', enum: Category })
  @IsEnum(Category)
  category: Category;

  @ApiProperty({ description: 'Item subcategory', required: false })
  @IsOptional()
  @IsString()
  subCategory?: string;

  @ApiProperty({ description: 'Brand name', required: false })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({ description: 'Brand ID', required: false })
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiProperty({ description: 'Retailer ID', required: false })
  @IsOptional()
  @IsString()
  retailerId?: string;

  @ApiProperty({ description: 'Retailer name', required: false })
  @IsOptional()
  @IsString()
  retailerName?: string;

  @ApiProperty({ description: 'Color hex codes', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colors?: string[];

  @ApiProperty({ description: 'Item price', required: false })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiProperty({ description: 'Currency code', default: 'USD', required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Product URL to purchase' })
  @IsString()
  productUrl: string;

  @ApiProperty({ description: 'SKU', required: false })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ description: 'Tags', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Whether item is in stock', default: true, required: false })
  @IsOptional()
  @IsBoolean()
  inStock?: boolean;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'External item ID (commerce item ID)', required: false })
  @IsOptional()
  @IsString()
  externalId?: string;
}
