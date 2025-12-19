import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

export interface AuditLogOptions {
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async logAction(options: AuditLogOptions): Promise<AuditLogDocument> {
    const auditLogDto: CreateAuditLogDto = {
      userId: options.userId,
      userEmail: options.userEmail,
      action: options.action,
      resource: options.resource,
      resourceId: options.resourceId ? options.resourceId as any : undefined,
      oldData: options.oldData,
      newData: options.newData,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
    };

    const auditLog = new this.auditLogModel(auditLogDto);
    return auditLog.save();
  }

  async getAuditLogs(
    page: number = 1,
    limit: number = 50,
    filters?: {
      userId?: string;
      resource?: string;
      action?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<{ logs: AuditLogDocument[]; total: number; page: number; totalPages: number }> {
    const query: any = {};

    if (filters) {
      if (filters.userId) query.userId = filters.userId;
      if (filters.resource) query.resource = filters.resource;
      if (filters.action) query.action = filters.action;
      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) query.timestamp.$gte = filters.startDate;
        if (filters.endDate) query.timestamp.$lte = filters.endDate;
      }
    }

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.auditLogModel
        .find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.auditLogModel.countDocuments(query),
    ]);

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAuditLogsByResource(
    resource: string,
    resourceId: string,
  ): Promise<AuditLogDocument[]> {
    return this.auditLogModel
      .find({ resource, resourceId })
      .sort({ timestamp: -1 })
      .exec();
  }

  async getAuditLogsByUser(userId: string): Promise<AuditLogDocument[]> {
    return this.auditLogModel
      .find({ userId })
      .sort({ timestamp: -1 })
      .exec();
  }
}