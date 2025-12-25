import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateBrandDto {
  @ApiProperty({ example: 'Nike' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ 
    required: false, 
    example: 'American multinational corporation that designs, develops, and sells athletic footwear, apparel, and accessories.' 
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ required: false, example: 'https://example.com/logo.png' })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiProperty({ required: false, example: 'https://nike.com' })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiProperty({ required: false, example: 1964 })
  @IsNumber()
  @IsOptional()
  @Min(1800)
  @Max(new Date().getFullYear())
  foundedYear?: number;

  @ApiProperty({ required: false, example: 'United States' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  country?: string;
}