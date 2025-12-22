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
import { BrandsService, BrandSearchOptions } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { Brand } from './schemas/brand.schema';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { AuditService } from '../audit/audit.service';
import { CustomValidationPipe } from '../common/pipes/validation.pipe';

@ApiTags('brands')
@Controller('admin/brands')
@UseGuards(ClerkAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Roles(UserRole.ADMIN)
export class BrandsController {
  constructor(
    private readonly brandsService: BrandsService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @UsePipes(new CustomValidationPipe())
  @AuditLog({ action: 'CREATE_BRAND', resource: 'brand', includeBody: true })
  @ApiOperation({ summary: 'Create a new brand' })
  @ApiResponse({ status: 201, description: 'Brand created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Brand with this name already exists' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async create(@Body() createBrandDto: CreateBrandDto): Promise<Brand> {
    return this.brandsService.create(createBrandDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all brands with optional filtering' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in brand name and description' })
  @ApiQuery({ name: 'country', required: false, description: 'Filter by country' })
  @ApiQuery({ name: 'foundedYear', required: false, description: 'Filter by founded year' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results per page (1-100)', type: Number })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of results to skip', type: Number })
  @ApiResponse({ status: 200, description: 'Brands retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async findAll(
    @Query('search') search?: string,
    @Query('country') country?: string,
    @Query('foundedYear') foundedYear?: number,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{ brands: Brand[]; total: number }> {
    const options: BrandSearchOptions = {
      search,
      country,
      foundedYear,
      limit,
      offset,
    };
    return this.brandsService.findAll(options);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get brand statistics' })
  @ApiResponse({ status: 200, description: 'Brand statistics retrieved successfully' })
  @ApiResponse({ status: 500, description: 'Failed to retrieve statistics' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getStats(): Promise<{
    totalBrands: number;
    brandsByCountry: { country: string; count: number }[];
    brandsByDecade: { decade: string; count: number }[];
  }> {
    return this.brandsService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a brand by ID' })
  @ApiResponse({ status: 200, description: 'Brand retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid brand ID format' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async findOne(@Param('id') id: string): Promise<Brand> {
    return this.brandsService.findOne(id);
  }

  @Patch(':id')
  @UsePipes(new CustomValidationPipe())
  @ApiOperation({ summary: 'Update a brand' })
  @ApiResponse({ status: 200, description: 'Brand updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data or brand ID format' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  @ApiResponse({ status: 409, description: 'Brand with this name already exists' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async update(
    @Param('id') id: string,
    @Body() updateBrandDto: UpdateBrandDto,
    @Req() req: any,
  ): Promise<Brand> {
    const { updated, oldData } = await this.brandsService.update(id, updateBrandDto);
    
    // Manual audit logging for update with old data
    const user = req.user;
    if (user) {
      await this.auditService.logAction({
        userId: user.id,
        userEmail: user.emailAddresses?.[0]?.emailAddress || user.email || 'unknown',
        action: 'UPDATE_BRAND',
        resource: 'brand',
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
  @ApiOperation({ summary: 'Delete a brand' })
  @ApiResponse({ status: 204, description: 'Brand deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid brand ID format' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async remove(@Param('id') id: string, @Req() req: any): Promise<void> {
    const deletedBrand = await this.brandsService.remove(id);
    
    // Manual audit logging for delete with old data
    const user = req.user;
    if (user) {
      await this.auditService.logAction({
        userId: user.id,
        userEmail: user.emailAddresses?.[0]?.emailAddress || user.email || 'unknown',
        action: 'DELETE_BRAND',
        resource: 'brand',
        resourceId: id,
        oldData: JSON.parse(JSON.stringify(deletedBrand)),
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
      });
    }
  }
}