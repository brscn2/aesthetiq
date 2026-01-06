import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../audit.service';
import { AUDIT_LOG_KEY, AuditLogMetadata } from '../decorators/audit-log.decorator';
import { UsersService } from '../../users/users.service';
import { ChangeFormatter } from '../utils/change-formatter';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
    @Inject(UsersService) private readonly usersService: UsersService,
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
    
    // Try to get email from various sources
    let userEmail = user.emailAddresses?.[0]?.emailAddress || user.email || null;

    // Helper function to resolve user email
    const resolveUserEmail = async (): Promise<string> => {
      if (userEmail) {
        return userEmail;
      }
      
      if (userId !== 'unknown') {
        try {
          const dbUser = await this.usersService.findByClerkId(userId);
          if (dbUser?.email) {
            return dbUser.email;
          }
        } catch (error) {
          // Silently fail and use userId as fallback
        }
      }
      
      return userId;
    };

    // Helper function to get current resource data for UPDATE actions
    const getCurrentResourceData = async (): Promise<any> => {
      if (action.includes('UPDATE') && request.params?.id) {
        try {
          // This is a simplified approach - in a real implementation,
          // you might want to inject the appropriate service based on resource type
          const resourceId = request.params.id;
          
          // For now, we'll store the request body as the "new" data
          // and let the service handle the old data retrieval
          return null; // Will be handled by the service layer
        } catch (error) {
          return null;
        }
      }
      return null;
    };

    return next.handle().pipe(
      tap({
        next: async (response) => {
          const finalUserEmail = await resolveUserEmail();
          const oldData = await getCurrentResourceData();
          
          // For UPDATE actions, try to detect changes
          let changesSummary = '';
          if (action.includes('UPDATE') && requestData.body) {
            const changes = ChangeFormatter.detectChanges(oldData, requestData.body);
            changesSummary = ChangeFormatter.formatChanges(changes);
          }
          
          // Log successful action
          this.auditService.logAction({
            userId,
            userEmail: finalUserEmail,
            action,
            resource,
            resourceId: request.params?.id || response?.id || response?._id?.toString(),
            oldData: oldData,
            newData: includeBody ? { ...requestData, changesSummary } : undefined,
            ipAddress,
            userAgent,
          }).catch(error => {
            console.error('Failed to log audit action:', error);
          });
        },
        error: async (error) => {
          const finalUserEmail = await resolveUserEmail();
          
          // Log failed action
          this.auditService.logAction({
            userId,
            userEmail: finalUserEmail,
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