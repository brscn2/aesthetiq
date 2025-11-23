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
import { SubscriptionStatus, Units } from '../schemas/user.schema';

class UserSettingsDto {
  @ApiProperty({ enum: Units, default: Units.METRIC })
  @IsEnum(Units)
  @IsOptional()
  units?: Units;

  @ApiProperty({ default: false })
  @IsOptional()
  allowBiometrics?: boolean;
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

