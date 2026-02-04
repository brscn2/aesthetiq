import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUrl,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class UpdateRetailerDto {
  @ApiProperty({ required: false, example: 'Zalando' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ required: false, example: 'https://zalando.com' })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiProperty({ required: false, example: 'https://example.com/logo.png' })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiProperty({
    required: false,
    example: 'European online fashion and lifestyle platform.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ required: false, example: 'Germany' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  country?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
