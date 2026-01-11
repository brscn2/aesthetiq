import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsMongoId,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CardTemplate } from '../schemas/outfit.schema';

class OutfitItemsDto {
  @ApiProperty({ required: false, example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  @IsOptional()
  top?: string;

  @ApiProperty({ required: false, example: '507f1f77bcf86cd799439012' })
  @IsMongoId()
  @IsOptional()
  bottom?: string;

  @ApiProperty({ required: false, example: '507f1f77bcf86cd799439013' })
  @IsMongoId()
  @IsOptional()
  shoe?: string;

  @ApiProperty({ required: false, type: [String], example: ['507f1f77bcf86cd799439014'] })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  accessories?: string[];
}

export class CreateOutfitDto {
  @ApiProperty({ example: 'Summer Casual' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ type: OutfitItemsDto })
  @ValidateNested()
  @Type(() => OutfitItemsDto)
  items: OutfitItemsDto;

  @ApiProperty({ enum: CardTemplate, required: false, default: CardTemplate.MINIMAL })
  @IsEnum(CardTemplate)
  @IsOptional()
  cardTemplate?: CardTemplate;
}
