import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsObject,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TryOnItem {
  @ApiProperty({
    required: false,
    example: '507f1f77bcf86cd799439011',
    description: 'Item ID',
  })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({
    example: 'https://example.com/clothing-image.jpg',
    description: 'URL to the clothing item image',
  })
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @ApiProperty({
    required: false,
    example: 'https://example.com/processed-image.jpg',
    description: 'Processed image URL (for WardrobeItem)',
  })
  @IsString()
  @IsOptional()
  processedImageUrl?: string;

  @ApiProperty({
    required: false,
    example: 'Black Leather Jacket',
    description: 'Name of the clothing item (StyleItem)',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    required: false,
    example: 'A stylish black leather jacket',
    description: 'Description of the clothing item (StyleItem)',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'TOP',
    description: 'Category of the clothing item',
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({
    required: false,
    example: 'Jacket',
    description: 'Sub-category of the clothing item',
  })
  @IsString()
  @IsOptional()
  subCategory?: string;

  @ApiProperty({
    required: false,
    example: '#000000',
    description: 'Primary color hex code (StyleItem)',
  })
  @IsString()
  @IsOptional()
  colorHex?: string;

  @ApiProperty({
    required: false,
    example: 'black',
    description: 'Color name (StyleItem)',
  })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({
    required: false,
    example: ['#000000', '#FFFFFF'],
    description: 'Color array (WardrobeItem)',
  })
  @IsOptional()
  colors?: string[];

  @ApiProperty({
    required: false,
    example: 'Leather',
    description: 'Material of the clothing item (StyleItem)',
  })
  @IsString()
  @IsOptional()
  material?: string;

  @ApiProperty({
    required: false,
    example: 'Zara',
    description: 'Brand name',
  })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiProperty({
    required: false,
    example: 'Favorite jacket for winter',
    description: 'Notes (WardrobeItem)',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class GenerateTryOnDto {
  @ApiProperty({
    example: 'https://example.com/user-photo.jpg',
    description: 'URL to the user photo stored in Azure Blob Storage',
  })
  @IsString()
  @IsNotEmpty()
  userPhotoUrl: string;

  @ApiProperty({
    description:
      'Record of clothing items by category (TOP, BOTTOM, FOOTWEAR, OUTERWEAR, DRESS, ACCESSORY)',
    example: {
      TOP: {
        imageUrl: 'https://example.com/jacket.jpg',
        name: 'Black Leather Jacket',
        category: 'TOP',
        subCategory: 'Jacket',
        colorHex: '#000000',
        material: 'Leather',
      },
      BOTTOM: {
        imageUrl: 'https://example.com/jeans.jpg',
        name: 'Blue Denim Jeans',
        category: 'BOTTOM',
        subCategory: 'Jeans',
        colorHex: '#1E3A8A',
        material: 'Denim',
      },
    },
  })
  @IsObject()
  @IsNotEmpty()
  items: Record<string, any>;

  @ApiProperty({
    required: false,
    example: 'user_123',
    description: 'User ID for tracking and analytics',
  })
  @IsString()
  @IsOptional()
  userId?: string;
}

export interface GenerateTryOnResponse {
  success: boolean;
  imageBase64?: string;
  metadata?: {
    itemCount: number;
    categories: string[];
  };
  error?: string;
}
