import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../audit.service';
import { AUDIT_LOG_KEY, AuditLogMetadata } from '../decorators/audit-log.decorator';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditMetadata = this.reflector.get<AuditLogMetadata>(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );

    if (!auditMetadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return next.handle();
    }

    const { action, resource, includeBody = false, includeParams = false } = auditMetadata;

    // Capture request data
    const requestData: any = {};
    if (includeBody && request.body) {
      requestData.body = { ...request.body };
      // Remove sensitive fields
      delete requestData.body.password;
      delete requestData.body.token;
    }
    if (includeParams && request.params) {
      requestData.params = request.params;
    }

    const ipAddress = request.ip || request.connection?.remoteAddress;
    const userAgent = request.get('User-Agent');

    // Get user ID - support both clerkId and id formats
    const userId = user.clerkId || user.id || 'unknown';
    const userEmail = user.emailAddresses?.[0]?.emailAddress || user.email || user.clerkId || 'unknown';

    return next.handle().pipe(
      tap({
        next: (response) => {
          // Log successful action
          this.auditService.logAction({
            userId,
            userEmail,
            action,
            resource,
            resourceId: request.params?.id || response?.id || response?._id?.toString(),
            newData: includeBody ? requestData : undefined,
            ipAddress,
            userAgent,
          }).catch(error => {
            console.error('Failed to log audit action:', error);
          });
        },
        error: (error) => {
          // Log failed action
          this.auditService.logAction({
            userId,
            userEmail,
            action: `${action}_FAILED`,
            resource,
            resourceId: request.params?.id,
            newData: { error: error.message, ...requestData },
            ipAddress,
            userAgent,
          }).catch(logError => {
            console.error('Failed to log audit action:', logError);
          });
        },
      }),
    );
  }
}