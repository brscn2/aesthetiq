import { IsString, IsOptional, IsObject, IsDateString } from 'class-validator';
import { Types } from 'mongoose';

export class CreateAuditLogDto {
  @IsString()
  userId: string;

  @IsString()
  userEmail: string;

  @IsString()
  action: string;

  @IsString()
  resource: string;

  @IsOptional()
  resourceId?: Types.ObjectId;

  @IsOptional()
  @IsObject()
  oldData?: Record<string, any>;

  @IsOptional()
  @IsObject()
  newData?: Record<string, any>;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}