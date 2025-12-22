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

  async getStats(): Promise<{
    totalLogs: number;
    logsByAction: { action: string; count: number }[];
    logsByResource: { resource: string; count: number }[];
    recentActivity: number;
  }> {
    const allLogs = await this.auditLogModel.find().exec();
    const totalLogs = allLogs.length;
    
    // Group by action
    const actionMap = new Map<string, number>();
    const resourceMap = new Map<string, number>();
    
    allLogs.forEach(log => {
      // Action stats
      const action = log.action;
      actionMap.set(action, (actionMap.get(action) || 0) + 1);
      
      // Resource stats
      const resource = log.resource;
      resourceMap.set(resource, (resourceMap.get(resource) || 0) + 1);
    });
    
    // Count recent activity (last 24 hours)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    const recentActivity = allLogs.filter(log => {
      const logDoc = log as any; // Cast to access timestamps
      return logDoc.timestamp && new Date(logDoc.timestamp) >= twentyFourHoursAgo;
    }).length;
    
    return {
      totalLogs,
      logsByAction: Array.from(actionMap.entries()).map(([action, count]) => ({ action, count })),
      logsByResource: Array.from(resourceMap.entries()).map(([resource, count]) => ({ resource, count })),
      recentActivity,
    };
  }
}