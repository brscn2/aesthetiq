import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { AdminGuard } from '../admin/guards/admin.guard';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';

@Controller('admin/audit')
@UseGuards(ClerkAuthGuard, AdminGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async getAuditLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('userId') userId?: string,
    @Query('resource') resource?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: any = {};
    if (userId) filters.userId = userId;
    if (resource) filters.resource = resource;
    if (action) filters.action = action;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    return this.auditService.getAuditLogs(page, limit, filters);
  }

  @Get('stats')
  async getStats(): Promise<{
    totalLogs: number;
    logsByAction: { action: string; count: number }[];
    logsByResource: { resource: string; count: number }[];
    recentActivity: number;
  }> {
    return this.auditService.getStats();
  }

  @Get('resource')
  async getAuditLogsByResource(
    @Query('resource') resource: string,
    @Query('resourceId') resourceId: string,
  ) {
    return this.auditService.getAuditLogsByResource(resource, resourceId);
  }

  @Get('user')
  async getAuditLogsByUser(@Query('userId') userId: string) {
    return this.auditService.getAuditLogsByUser(userId);
  }
}