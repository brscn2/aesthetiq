import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsMongoId,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CardTemplate } from '../schemas/outfit.schema';

class UpdateOutfitItemsDto {
  @ApiProperty({ required: false, example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  @IsOptional()
  top?: string | null;

  @ApiProperty({ required: false, example: '507f1f77bcf86cd799439012' })
  @IsMongoId()
  @IsOptional()
  bottom?: string | null;

  @ApiProperty({ required: false, example: '507f1f77bcf86cd799439013' })
  @IsMongoId()
  @IsOptional()
  outerwear?: string | null;

  @ApiProperty({ required: false, example: '507f1f77bcf86cd799439014' })
  @IsMongoId()
  @IsOptional()
  footwear?: string | null;

  @ApiProperty({ required: false, example: '507f1f77bcf86cd799439015' })
  @IsMongoId()
  @IsOptional()
  dress?: string | null;

  @ApiProperty({
    required: false,
    type: [String],
    example: ['507f1f77bcf86cd799439016'],
  })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  accessories?: string[];
}

export class UpdateOutfitDto {
  @ApiProperty({ required: false, example: 'Summer Casual Updated' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ type: UpdateOutfitItemsDto, required: false })
  @ValidateNested()
  @Type(() => UpdateOutfitItemsDto)
  @IsOptional()
  items?: UpdateOutfitItemsDto;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;

  @ApiProperty({ enum: CardTemplate, required: false })
  @IsEnum(CardTemplate)
  @IsOptional()
  cardTemplate?: CardTemplate;
}
