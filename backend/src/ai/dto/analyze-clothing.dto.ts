import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, ValidateIf } from 'class-validator';

export class AnalyzeClothingDto {
  @ApiProperty({
    required: false,
    example: 'https://example.com/clothing-image.jpg',
    description: 'URL to the clothing image',
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    required: false,
    example: 'data:image/jpeg;base64,...',
    description: 'Base64-encoded image data',
  })
  @IsString()
  @IsOptional()
  imageBase64?: string;

  @ValidateIf((o) => !o.imageUrl && !o.imageBase64)
  @IsString({ message: 'Either imageUrl or imageBase64 must be provided' })
  _validation?: string;
}

export interface ClothingAnalysisResult {
  category: 'TOP' | 'BOTTOM' | 'SHOE' | 'ACCESSORY';
  subCategory?: string;
  brand?: string;
  colors: string[];
  confidence: number;
}

export interface AnalyzeClothingResponse {
  success: boolean;
  data?: ClothingAnalysisResult;
  error?: string;
}
