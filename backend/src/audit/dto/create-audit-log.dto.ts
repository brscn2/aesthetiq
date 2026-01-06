import { IsString, IsOptional, IsObject, IsDateString, IsArray } from 'class-validator';
import { Types } from 'mongoose';
import { ChangeDetail } from '../schemas/audit-log.schema';

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
  @IsArray()
  changeDetails?: ChangeDetail[];

  @IsOptional()
  @IsString()
  changeSummary?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}