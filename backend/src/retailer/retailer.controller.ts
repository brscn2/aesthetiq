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
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../admin/guards/roles.guard';
import { Roles } from '../admin/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { RetailerService, RetailerSearchOptions } from './retailer.service';
import { CreateRetailerDto } from './dto/create-retailer.dto';
import { UpdateRetailerDto } from './dto/update-retailer.dto';
import { Retailer } from './schemas/retailer.schema';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { AuditService } from '../audit/audit.service';
import { CustomValidationPipe } from '../common/pipes/validation.pipe';

@ApiTags('retailers')
@Controller('admin/retailers')
@UseGuards(ClerkAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Roles(UserRole.ADMIN)
export class RetailerController {
  constructor(
    private readonly retailerService: RetailerService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @UsePipes(new CustomValidationPipe())
  @AuditLog({ action: 'CREATE_RETAILER', resource: 'retailer', includeBody: true })
  @ApiOperation({ summary: 'Create a new retailer' })
  @ApiResponse({ status: 201, description: 'Retailer created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Retailer with this name already exists' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async create(@Body() createRetailerDto: CreateRetailerDto): Promise<Retailer> {
    return this.retailerService.create(createRetailerDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all retailers with optional filtering' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in retailer name and description' })
  @ApiQuery({ name: 'country', required: false, description: 'Filter by country' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status', type: Boolean })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results per page (1-100)', type: Number })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of results to skip', type: Number })
  @ApiResponse({ status: 200, description: 'Retailers retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async findAll(
    @Query('search') search?: string,
    @Query('country') country?: string,
    @Query('isActive') isActive?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{ retailers: Retailer[]; total: number }> {
    const options: RetailerSearchOptions = {
      search,
      country,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      limit,
      offset,
    };
    return this.retailerService.findAll(options);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get retailer statistics' })
  @ApiResponse({ status: 200, description: 'Retailer statistics retrieved successfully' })
  @ApiResponse({ status: 500, description: 'Failed to retrieve statistics' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getStats(): Promise<{
    totalRetailers: number;
    activeRetailers: number;
    retailersByCountry: { country: string; count: number }[];
  }> {
    return this.retailerService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a retailer by ID' })
  @ApiResponse({ status: 200, description: 'Retailer retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid retailer ID format' })
  @ApiResponse({ status: 404, description: 'Retailer not found' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async findOne(@Param('id') id: string): Promise<Retailer> {
    return this.retailerService.findOne(id);
  }

  @Patch(':id')
  @UsePipes(new CustomValidationPipe())
  @ApiOperation({ summary: 'Update a retailer' })
  @ApiResponse({ status: 200, description: 'Retailer updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data or retailer ID format' })
  @ApiResponse({ status: 404, description: 'Retailer not found' })
  @ApiResponse({ status: 409, description: 'Retailer with this name already exists' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async update(
    @Param('id') id: string,
    @Body() updateRetailerDto: UpdateRetailerDto,
    @Req() req: any,
  ): Promise<Retailer> {
    const { updated, oldData } = await this.retailerService.update(id, updateRetailerDto);

    // Manual audit logging for update with old data
    const user = req.user;
    if (user) {
      const userId = user.clerkId || user.id || 'unknown';
      const userEmail =
        user.emailAddresses?.[0]?.emailAddress ||
        user.email ||
        user.clerkId ||
        'unknown';
      await this.auditService.logAction({
        userId,
        userEmail,
        action: 'UPDATE_RETAILER',
        resource: 'retailer',
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
  @ApiOperation({ summary: 'Delete a retailer' })
  @ApiResponse({ status: 204, description: 'Retailer deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid retailer ID format' })
  @ApiResponse({ status: 404, description: 'Retailer not found' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async remove(@Param('id') id: string, @Req() req: any): Promise<void> {
    const deletedRetailer = await this.retailerService.remove(id);

    // Manual audit logging for delete with old data
    const user = req.user;
    if (user) {
      const userId = user.clerkId || user.id || 'unknown';
      const userEmail =
        user.emailAddresses?.[0]?.emailAddress ||
        user.email ||
        user.clerkId ||
        'unknown';
      await this.auditService.logAction({
        userId,
        userEmail,
        action: 'DELETE_RETAILER',
        resource: 'retailer',
        resourceId: id,
        oldData: JSON.parse(JSON.stringify(deletedRetailer)),
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
      });
    }
  }
}
