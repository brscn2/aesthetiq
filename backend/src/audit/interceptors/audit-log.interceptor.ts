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

    return next.handle().pipe(
      tap({
        next: async (response) => {
          const finalUserEmail = await resolveUserEmail();
          
          // Log successful action
          this.auditService.logAction({
            userId,
            userEmail: finalUserEmail,
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