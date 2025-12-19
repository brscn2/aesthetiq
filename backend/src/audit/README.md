# Audit Logging System

The audit logging system tracks all administrative actions performed in the admin dashboard, providing a comprehensive audit trail for compliance and security purposes.

## Features

- **Automatic Logging**: Uses decorators and interceptors to automatically log admin actions
- **Manual Logging**: Provides service methods for custom audit logging scenarios
- **Comprehensive Data**: Captures user information, action details, timestamps, and IP addresses
- **Flexible Querying**: Supports filtering by user, resource, action, and date ranges
- **Performance Optimized**: Includes database indexes for efficient querying

## Components

### AuditLog Schema

- `userId`: Clerk user ID of the admin performing the action
- `userEmail`: Email address of the admin
- `action`: Type of action performed (e.g., 'CREATE_BRAND', 'UPDATE_WARDROBE_ITEM')
- `resource`: Type of resource affected (e.g., 'brand', 'wardrobe-item')
- `resourceId`: ID of the specific resource affected
- `oldData`: Previous state of the resource (for updates/deletes)
- `newData`: New state of the resource (for creates/updates)
- `ipAddress`: IP address of the admin
- `userAgent`: Browser user agent string
- `timestamp`: When the action occurred

### AuditService

Provides methods for:

- `logAction()`: Create audit log entries
- `getAuditLogs()`: Retrieve audit logs with filtering and pagination
- `getAuditLogsByResource()`: Get logs for a specific resource
- `getAuditLogsByUser()`: Get logs for a specific user

### AuditController

REST endpoints for retrieving audit logs:

- `GET /admin/audit`: Get paginated audit logs with optional filters
- `GET /admin/audit/resource`: Get logs for a specific resource
- `GET /admin/audit/user`: Get logs for a specific user

## Usage

### Automatic Logging with Decorators

```typescript
@Controller('admin/brands')
@UseInterceptors(AuditLogInterceptor)
export class BrandsController {
  @Post()
  @AuditLog({ action: 'CREATE_BRAND', resource: 'brand', includeBody: true })
  async create(@Body() createBrandDto: CreateBrandDto) {
    // Action will be automatically logged
    return this.brandsService.create(createBrandDto);
  }
}
```

### Manual Logging

```typescript
await this.auditService.logAction({
  userId: user.id,
  userEmail: user.email,
  action: 'UPDATE_BRAND',
  resource: 'brand',
  resourceId: brandId,
  oldData: previousBrandData,
  newData: updatedBrandData,
  ipAddress: req.ip,
  userAgent: req.get('User-Agent'),
});
```

### Querying Audit Logs

```typescript
// Get recent audit logs
const logs = await this.auditService.getAuditLogs(1, 50);

// Filter by user and action
const userLogs = await this.auditService.getAuditLogs(1, 50, {
  userId: 'user_123',
  action: 'DELETE_BRAND',
  startDate: new Date('2023-01-01'),
  endDate: new Date('2023-12-31'),
});
```

## Tracked Actions

- **Brand Management**:
  - `CREATE_BRAND`: New brand creation
  - `UPDATE_BRAND`: Brand information updates
  - `DELETE_BRAND`: Brand deletion
  - `UPLOAD_BRAND_LOGO`: Brand logo uploads

- **Wardrobe Management**:
  - `CREATE_WARDROBE_ITEM`: New clothing item creation
  - `UPDATE_WARDROBE_ITEM`: Clothing item updates
  - `DELETE_WARDROBE_ITEM`: Clothing item deletion

## Security Considerations

- All audit logs are immutable once created
- Only admin users can access audit log endpoints
- Sensitive data (passwords, tokens) is automatically filtered out
- IP addresses and user agents are captured for security analysis
- Database indexes ensure efficient querying without performance impact

## Testing

The audit system includes comprehensive property-based tests using fast-check to verify:

- Audit log creation for any valid admin action
- Proper data persistence and retrieval
- Filter and pagination functionality
- Error handling scenarios

Run tests with:

```bash
npm test -- --testPathPatterns=audit.service.spec.ts
```
