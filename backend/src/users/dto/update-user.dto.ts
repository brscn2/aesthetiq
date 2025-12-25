import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionStatus, Units, Theme, Currency, ShoppingRegion, UserRole } from '../schemas/user.schema';

class UserSettingsDto {
  // Measurement & Regional
  @ApiProperty({ enum: Units, required: false })
  @IsEnum(Units)
  @IsOptional()
  units?: Units;

  @ApiProperty({ enum: Currency, required: false })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @ApiProperty({ enum: ShoppingRegion, required: false })
  @IsEnum(ShoppingRegion)
  @IsOptional()
  shoppingRegion?: ShoppingRegion;

  // Privacy & Biometric Settings
  @ApiProperty({ required: false })
  @IsOptional()
  allowBiometrics?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  allowFacialAnalysis?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  storeColorHistory?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  contributeToTrendLearning?: boolean;

  // Appearance
  @ApiProperty({ enum: Theme, required: false })
  @IsEnum(Theme)
  @IsOptional()
  theme?: Theme;
}

export class UpdateUserDto {
  @ApiProperty({ required: false, example: 'user@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false, example: 'hashed-password' })
  @IsString()
  @IsOptional()
  passwordHash?: string;

  @ApiProperty({ required: false, example: 'John Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false, example: 'https://example.com/avatar.jpg' })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ enum: SubscriptionStatus, required: false })
  @IsEnum(SubscriptionStatus)
  @IsOptional()
  subscriptionStatus?: SubscriptionStatus;

  @ApiProperty({ enum: UserRole, required: false })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiProperty({ type: UserSettingsDto, required: false })
  @ValidateNested()
  @Type(() => UserSettingsDto)
  @IsOptional()
  settings?: UserSettingsDto;
}

