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
    example: 'https://example.com/clothing-image.jpg',
    description: 'URL to the clothing item image',
  })
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @ApiProperty({
    example: 'Black Leather Jacket',
    description: 'Name of the clothing item',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

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
    description: 'Primary color hex code',
  })
  @IsString()
  @IsOptional()
  colorHex?: string;

  @ApiProperty({
    required: false,
    example: 'Leather',
    description: 'Material of the clothing item',
  })
  @IsString()
  @IsOptional()
  material?: string;
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
      'Record of clothing items by category (TOP, BOTTOM, SHOE, ACCESSORY)',
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
  items: Record<string, TryOnItem>;

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
