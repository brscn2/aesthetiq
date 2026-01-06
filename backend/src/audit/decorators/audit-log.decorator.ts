import { SetMetadata } from '@nestjs/common';

export interface AuditLogMetadata {
  action: string;
  resource: string;
  includeBody?: boolean;
  includeParams?: boolean;
}

export const AUDIT_LOG_KEY = 'audit_log';

export const AuditLog = (metadata: AuditLogMetadata) =>
  SetMetadata(AUDIT_LOG_KEY, metadata);