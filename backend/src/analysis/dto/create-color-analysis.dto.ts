import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsDateString,
} from 'class-validator';

export class CreateColorAnalysisDto {
  // userId is now injected from authentication, not from DTO
  userId?: string;

  @ApiProperty({ example: 'Dark Autumn' })
  @IsString()
  @IsNotEmpty()
  season: string;

  @ApiProperty({ example: 'High' })
  @IsString()
  @IsNotEmpty()
  contrastLevel: string;

  @ApiProperty({ example: 'Cool' })
  @IsString()
  @IsNotEmpty()
  undertone: string;

  @ApiProperty({
    example: [
      { name: 'Terracotta', hex: '#8D4E38' },
      { name: 'Forest Green', hex: '#2E4A3B' },
      { name: 'Mahogany', hex: '#4A1C17' },
    ],
    description: 'Array of color objects with name and hex code',
  })
  @IsArray()
  @IsOptional()
  palette?: Array<{ name: string; hex: string }>;

  @ApiProperty({ required: false, example: 'Oval' })
  @IsString()
  @IsOptional()
  faceShape?: string;

  @ApiProperty({ required: false, example: 'https://storage.azure.com/analysis/image.jpg' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  scanDate?: string;
}

