import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Category } from '../schemas/commerce-item.schema';

export class SearchCommerceItemsDto {
  @ApiProperty({ required: false, description: 'Search in name, description, and tags' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ enum: Category, required: false })
  @IsEnum(Category)
  @IsOptional()
  category?: Category;

  @ApiProperty({ required: false, example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  @IsOptional()
  brandId?: string;

  @ApiProperty({ required: false, example: '507f1f77bcf86cd799439012' })
  @IsMongoId()
  @IsOptional()
  retailerId?: string;

  @ApiProperty({ required: false, description: 'Filter by color hex code' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ required: false, description: 'Minimum price in cents' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  priceMin?: number;

  @ApiProperty({ required: false, description: 'Maximum price in cents' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  priceMax?: number;

  @ApiProperty({ required: false, description: 'Filter by tags' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  tags?: string[];

  @ApiProperty({ required: false, description: 'Filter by stock availability' })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  inStock?: boolean;

  @ApiProperty({ required: false, description: 'Filter by seasonal palette (e.g., WARM_AUTUMN)' })
  @IsString()
  @IsOptional()
  seasonalPalette?: string;

  @ApiProperty({ required: false, description: 'Minimum palette score threshold (0-1)', default: 0.6 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  minPaletteScore?: number;

  @ApiProperty({ required: false, description: 'Number of results per page', default: 20 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiProperty({ required: false, description: 'Number of results to skip', default: 0 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  offset?: number;
}
