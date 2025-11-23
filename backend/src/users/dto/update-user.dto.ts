import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionStatus, Units } from '../schemas/user.schema';

class UserSettingsDto {
  @ApiProperty({ enum: Units, required: false })
  @IsEnum(Units)
  @IsOptional()
  units?: Units;

  @ApiProperty({ required: false })
  @IsOptional()
  allowBiometrics?: boolean;
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

  @ApiProperty({ type: UserSettingsDto, required: false })
  @ValidateNested()
  @Type(() => UserSettingsDto)
  @IsOptional()
  settings?: UserSettingsDto;
}

