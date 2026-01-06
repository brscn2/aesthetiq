import { IsString, IsBoolean, IsNumber, IsOptional, IsEmail, Min, Max } from 'class-validator';

export class UpdateSystemSettingsDto {
  @IsOptional()
  @IsString()
  siteName?: string;

  @IsOptional()
  @IsString()
  siteDescription?: string;

  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @IsOptional()
  @IsBoolean()
  allowRegistration?: boolean;

  @IsOptional()
  @IsBoolean()
  requireEmailVerification?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxUploadSize?: number;

  @IsOptional()
  @IsString()
  defaultLanguage?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(1440)
  sessionTimeout?: number;

  @IsOptional()
  @IsBoolean()
  enableAuditLogs?: boolean;

  @IsOptional()
  @IsBoolean()
  enableAnalytics?: boolean;

  @IsOptional()
  @IsBoolean()
  enableNotifications?: boolean;

  @IsOptional()
  @IsString()
  smtpHost?: string;

  @IsOptional()
  @IsNumber()
  smtpPort?: number;

  @IsOptional()
  @IsEmail()
  adminEmail?: string;
}
