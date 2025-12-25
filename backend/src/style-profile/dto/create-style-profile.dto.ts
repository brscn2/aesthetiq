import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsObject,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class SizesDto {
  @ApiProperty({ required: false, example: 'M' })
  @IsString()
  @IsOptional()
  top?: string;

  @ApiProperty({ required: false, example: '32' })
  @IsString()
  @IsOptional()
  bottom?: string;

  @ApiProperty({ required: false, example: '9' })
  @IsString()
  @IsOptional()
  shoe?: string;
}

export class CreateStyleProfileDto {
  // userId is injected by the controller from authentication, not from DTO
  @ApiProperty({ example: 'Urban Minimalist' })
  @IsString()
  @IsNotEmpty()
  archetype: string;

  @ApiProperty({
    example: { formal: 50, colorful: 20, casual: 80 },
    description: 'Object with slider values (0-100)',
    required: false,
  })
  @IsObject()
  @IsOptional()
  sliders?: Record<string, number>;

  @ApiProperty({
    example: ['https://example.com/image1.jpg'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  inspirationImageUrls?: string[];

  @ApiProperty({
    example: ['No Leather', 'No Fur'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  negativeConstraints?: string[];

  @ApiProperty({
    example: ['COS', 'Arket', 'Acne Studios'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  favoriteBrands?: string[];

  @ApiProperty({ type: SizesDto, required: false })
  @ValidateNested()
  @Type(() => SizesDto)
  @IsOptional()
  sizes?: SizesDto;

  @ApiProperty({ required: false, description: 'Fit preferences for different clothing types' })
  @IsObject()
  @IsOptional()
  fitPreferences?: {
    top?: string;
    bottom?: string;
    outerwear?: string;
  };

  @ApiProperty({ 
    required: false, 
    enum: ['budget', 'mid-range', 'premium', 'luxury'],
    example: 'mid-range' 
  })
  @IsString()
  @IsOptional()
  budgetRange?: string;

  @ApiProperty({ required: false, example: 200, description: 'Maximum price per item in user currency' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxPricePerItem?: number;
}

