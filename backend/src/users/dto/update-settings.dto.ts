import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { Units, Theme, Currency, ShoppingRegion } from '../schemas/user.schema';

export class UpdateSettingsDto {
  // Measurement & Regional
  @ApiProperty({ enum: Units, required: false, description: 'Measurement units preference' })
  @IsEnum(Units)
  @IsOptional()
  units?: Units;

  @ApiProperty({ enum: Currency, required: false, description: 'Preferred currency' })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @ApiProperty({ enum: ShoppingRegion, required: false, description: 'Shopping region preference' })
  @IsEnum(ShoppingRegion)
  @IsOptional()
  shoppingRegion?: ShoppingRegion;

  // Privacy & Biometric Settings
  @ApiProperty({ required: false, description: 'Allow biometric data collection' })
  @IsBoolean()
  @IsOptional()
  allowBiometrics?: boolean;

  @ApiProperty({ required: false, description: 'Allow facial feature analysis for recommendations' })
  @IsBoolean()
  @IsOptional()
  allowFacialAnalysis?: boolean;

  @ApiProperty({ required: false, description: 'Store color palette history' })
  @IsBoolean()
  @IsOptional()
  storeColorHistory?: boolean;

  @ApiProperty({ required: false, description: 'Contribute anonymously to trend learning' })
  @IsBoolean()
  @IsOptional()
  contributeToTrendLearning?: boolean;

  // Appearance
  @ApiProperty({ enum: Theme, required: false, description: 'Theme preference' })
  @IsEnum(Theme)
  @IsOptional()
  theme?: Theme;
}