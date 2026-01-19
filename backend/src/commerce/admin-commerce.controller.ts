import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  UseInterceptors,
  Req,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../admin/guards/roles.guard';
import { Roles } from '../admin/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { CommerceService } from './commerce.service';
import { CreateCommerceItemDto } from './dto/create-commerce-item.dto';
import { UpdateCommerceItemDto } from './dto/update-commerce-item.dto';
import { SearchCommerceItemsDto } from './dto/search-commerce-items.dto';
import { CommerceItem } from './schemas/commerce-item.schema';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { AuditService } from '../audit/audit.service';
import { CustomValidationPipe } from '../common/pipes/validation.pipe';
import { ApiKeyGuard, AdminOrApiKeyGuard } from './guards/api-key.guard';

@ApiTags('admin-commerce')
@Controller('admin/commerce')
@UseInterceptors(AuditLogInterceptor)
export class AdminCommerceController {
  constructor(
    private readonly commerceService: CommerceService,
    private readonly auditService: AuditService,
    private readonly apiKeyGuard: ApiKeyGuard,
  ) {}

  @Post()
  @UseGuards(AdminOrApiKeyGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UsePipes(new CustomValidationPipe())
  @AuditLog({ action: 'CREATE_COMMERCE_ITEM', resource: 'commerce-item', includeBody: true })
  @ApiOperation({ summary: 'Create a new commerce item (Admin or API Key)' })
  @ApiHeader({
    name: 'X-API-Key',
    description: 'API key for service-to-service authentication',
    required: false,
  })
  @ApiResponse({ status: 201, description: 'Commerce item created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'Admin access or valid API key required' })
  @ApiResponse({ status: 409, description: 'Commerce item with this SKU already exists' })
  async create(
    @Body() createCommerceItemDto: CreateCommerceItemDto,
  ): Promise<CommerceItem> {
    return this.commerceService.create(createCommerceItemDto);
  }

  @Post('bulk')
  @UseGuards(AdminOrApiKeyGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UsePipes(new CustomValidationPipe())
  @AuditLog({ action: 'BULK_CREATE_COMMERCE_ITEMS', resource: 'commerce-item', includeBody: false })
  @ApiOperation({ summary: 'Bulk create commerce items (Admin or API Key)' })
  @ApiHeader({
    name: 'X-API-Key',
    description: 'API key for service-to-service authentication',
    required: false,
  })
  @ApiResponse({ status: 201, description: 'Bulk creation completed' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'Admin access or valid API key required' })
  async createBulk(
    @Body() items: CreateCommerceItemDto[],
  ): Promise<{ created: number; errors: { index: number; error: string }[] }> {
    return this.commerceService.createBulk(items);
  }

  @Get()
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all commerce items with filtering (Admin)' })
  @ApiResponse({ status: 200, description: 'Commerce items retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async findAll(
    @Query() searchDto: SearchCommerceItemsDto,
  ): Promise<{ items: CommerceItem[]; total: number }> {
    return this.commerceService.findAll(searchDto);
  }

  @Get('stats')
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get commerce statistics (Admin)' })
  @ApiResponse({ status: 200, description: 'Commerce statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getStats(): Promise<{
    totalItems: number;
    inStockItems: number;
    itemsByCategory: { category: string; count: number }[];
    itemsByRetailer: { retailerId: string; retailerName: string; count: number }[];
    itemsByBrand: { brand: string; count: number }[];
  }> {
    return this.commerceService.getStats();
  }

  @Get('by-retailer/:retailerId')
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all commerce items by retailer ID (Admin)' })
  @ApiResponse({ status: 200, description: 'Commerce items retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid retailer ID format' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async findByRetailer(
    @Param('retailerId') retailerId: string,
  ): Promise<CommerceItem[]> {
    return this.commerceService.findByRetailerId(retailerId);
  }

  @Get(':id')
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a commerce item by ID (Admin)' })
  @ApiResponse({ status: 200, description: 'Commerce item retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid commerce item ID format' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Commerce item not found' })
  async findOne(@Param('id') id: string): Promise<CommerceItem> {
    return this.commerceService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AdminOrApiKeyGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UsePipes(new CustomValidationPipe())
  @ApiOperation({ summary: 'Update a commerce item (Admin or API Key)' })
  @ApiHeader({
    name: 'X-API-Key',
    description: 'API key for service-to-service authentication',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Commerce item updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data or ID format' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'Admin access or valid API key required' })
  @ApiResponse({ status: 404, description: 'Commerce item not found' })
  @ApiResponse({ status: 409, description: 'Commerce item with this SKU already exists' })
  async update(
    @Param('id') id: string,
    @Body() updateCommerceItemDto: UpdateCommerceItemDto,
    @Req() req: any,
  ): Promise<CommerceItem> {
    const { updated, oldData } = await this.commerceService.update(
      id,
      updateCommerceItemDto,
    );

    // Manual audit logging for update with old data
    const user = req.user;
    const isApiKeyAuth = req.isApiKeyAuth;

    if (user || isApiKeyAuth) {
      const userId = user?.clerkId || user?.id || 'api-key-service';
      const userEmail =
        user?.emailAddresses?.[0]?.emailAddress ||
        user?.email ||
        (isApiKeyAuth ? 'api-key-service' : 'unknown');
      await this.auditService.logAction({
        userId,
        userEmail,
        action: 'UPDATE_COMMERCE_ITEM',
        resource: 'commerce-item',
        resourceId: id,
        oldData: JSON.parse(JSON.stringify(oldData)),
        newData: JSON.parse(JSON.stringify(updated)),
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
      });
    }

    return updated;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminOrApiKeyGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a commerce item (Admin or API Key)' })
  @ApiHeader({
    name: 'X-API-Key',
    description: 'API key for service-to-service authentication',
    required: false,
  })
  @ApiResponse({ status: 204, description: 'Commerce item deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid commerce item ID format' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'Admin access or valid API key required' })
  @ApiResponse({ status: 404, description: 'Commerce item not found' })
  async remove(@Param('id') id: string, @Req() req: any): Promise<void> {
    const deletedItem = await this.commerceService.remove(id);

    // Manual audit logging for delete with old data
    const user = req.user;
    const isApiKeyAuth = req.isApiKeyAuth;

    if (user || isApiKeyAuth) {
      const userId = user?.clerkId || user?.id || 'api-key-service';
      const userEmail =
        user?.emailAddresses?.[0]?.emailAddress ||
        user?.email ||
        (isApiKeyAuth ? 'api-key-service' : 'unknown');
      await this.auditService.logAction({
        userId,
        userEmail,
        action: 'DELETE_COMMERCE_ITEM',
        resource: 'commerce-item',
        resourceId: id,
        oldData: JSON.parse(JSON.stringify(deletedItem)),
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
      });
    }
  }
}
