import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionStatus, Units, Theme, Currency, ShoppingRegion } from '../schemas/user.schema';

class UserSettingsDto {
  // Measurement & Regional
  @ApiProperty({ enum: Units, default: Units.METRIC })
  @IsEnum(Units)
  @IsOptional()
  units?: Units;

  @ApiProperty({ enum: Currency, default: Currency.EUR })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @ApiProperty({ enum: ShoppingRegion, default: ShoppingRegion.EU })
  @IsEnum(ShoppingRegion)
  @IsOptional()
  shoppingRegion?: ShoppingRegion;

  // Privacy & Biometric Settings
  @ApiProperty({ default: false })
  @IsOptional()
  allowBiometrics?: boolean;

  @ApiProperty({ default: true })
  @IsOptional()
  allowFacialAnalysis?: boolean;

  @ApiProperty({ default: true })
  @IsOptional()
  storeColorHistory?: boolean;

  @ApiProperty({ default: false })
  @IsOptional()
  contributeToTrendLearning?: boolean;

  // Appearance
  @ApiProperty({ enum: Theme, default: Theme.SYSTEM })
  @IsEnum(Theme)
  @IsOptional()
  theme?: Theme;
}

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'hashed-password' })
  @IsString()
  @IsNotEmpty()
  passwordHash: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false, example: 'https://example.com/avatar.jpg' })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ enum: SubscriptionStatus, default: SubscriptionStatus.FREE })
  @IsEnum(SubscriptionStatus)
  @IsOptional()
  subscriptionStatus?: SubscriptionStatus;

  @ApiProperty({ type: UserSettingsDto, required: false })
  @ValidateNested()
  @Type(() => UserSettingsDto)
  @IsOptional()
  settings?: UserSettingsDto;
}

