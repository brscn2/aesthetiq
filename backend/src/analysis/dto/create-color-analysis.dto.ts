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

  @ApiProperty({ example: 'Deep Autumn' })
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
    example: ['#8B4513', '#CD853F', '#DEB887'],
    description: 'Array of hex color codes',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  palette?: string[];

  @ApiProperty({ required: false, example: 'Oval' })
  @IsString()
  @IsOptional()
  faceShape?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  scanDate?: string;
}

