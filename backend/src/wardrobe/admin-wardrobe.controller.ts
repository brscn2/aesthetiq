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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../admin/guards/roles.guard';
import { Roles } from '../admin/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { WardrobeService } from './wardrobe.service';
import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';
import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
import { WardrobeItem, Category } from './schemas/wardrobe-item.schema';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';
import { AuditLog } from '../audit/decorators/audit-log.decorator';

export interface AdminWardrobeSearchOptions {
  userId?: string;
  category?: Category;
  colorHex?: string;
  brandId?: string;
  brand?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

@ApiTags('admin-wardrobe')
@Controller('admin/wardrobe')
@UseGuards(ClerkAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Roles(UserRole.ADMIN)
export class AdminWardrobeController {
  constructor(private readonly wardrobeService: WardrobeService) {}

  @Post()
  @AuditLog({ action: 'CREATE_WARDROBE_ITEM', resource: 'wardrobe-item', includeBody: true })
  @ApiOperation({ summary: 'Create a new wardrobe item (Admin)' })
  @ApiResponse({ status: 201, description: 'Wardrobe item created successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async create(@Body() createWardrobeItemDto: CreateWardrobeItemDto & { userId: string }): Promise<WardrobeItem> {
    return this.wardrobeService.create(createWardrobeItemDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all wardrobe items with advanced filtering (Admin)' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'category', required: false, enum: Category, description: 'Filter by category' })
  @ApiQuery({ name: 'colorHex', required: false, description: 'Filter by color hex' })
  @ApiQuery({ name: 'brandId', required: false, description: 'Filter by brand ID' })
  @ApiQuery({ name: 'brand', required: false, description: 'Filter by brand name' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in brand and subcategory' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results per page', type: Number })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of results to skip', type: Number })
  @ApiResponse({ status: 200, description: 'Wardrobe items retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async findAll(
    @Query('userId') userId?: string,
    @Query('category') category?: Category,
    @Query('colorHex') colorHex?: string,
    @Query('brandId') brandId?: string,
    @Query('brand') brand?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{ items: WardrobeItem[]; total: number }> {
    // For admin, we need to implement a more comprehensive search
    // This is a simplified version - in a real implementation, you'd want to use aggregation
    const items = await this.wardrobeService.findAllWithBrands(userId || '', category, colorHex, brandId);
    
    let filteredItems = items;
    
    // Apply additional filters
    if (brand) {
      filteredItems = filteredItems.filter(item => 
        item.brand?.toLowerCase().includes(brand.toLowerCase())
      );
    }
    
    if (search) {
      filteredItems = filteredItems.filter(item => 
        item.brand?.toLowerCase().includes(search.toLowerCase()) ||
        item.subCategory?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Apply pagination
    const total = filteredItems.length;
    const startIndex = offset || 0;
    const endIndex = startIndex + (limit || 50);
    const paginatedItems = filteredItems.slice(startIndex, endIndex);
    
    return { items: paginatedItems, total };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get wardrobe statistics (Admin)' })
  @ApiResponse({ status: 200, description: 'Wardrobe statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getStats(): Promise<{
    totalItems: number;
    itemsByCategory: { category: string; count: number }[];
    itemsByBrand: { brand: string; count: number }[];
    itemsByUser: { userId: string; count: number }[];
  }> {
    // This would typically be implemented with MongoDB aggregation
    // For now, we'll return a simplified version
    const allItems = await this.wardrobeService.findAllWithBrands('');
    
    const totalItems = allItems.length;
    
    // Group by category
    const categoryMap = new Map<string, number>();
    const brandMap = new Map<string, number>();
    const userMap = new Map<string, number>();
    
    allItems.forEach(item => {
      // Category stats
      const category = item.category;
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      
      // Brand stats
      const brand = item.brand || 'Unknown';
      brandMap.set(brand, (brandMap.get(brand) || 0) + 1);
      
      // User stats
      const userId = item.userId;
      userMap.set(userId, (userMap.get(userId) || 0) + 1);
    });
    
    return {
      totalItems,
      itemsByCategory: Array.from(categoryMap.entries()).map(([category, count]) => ({ category, count })),
      itemsByBrand: Array.from(brandMap.entries()).map(([brand, count]) => ({ brand, count })).slice(0, 10),
      itemsByUser: Array.from(userMap.entries()).map(([userId, count]) => ({ userId, count })).slice(0, 10),
    };
  }

  @Get('by-brand/:brandId')
  @ApiOperation({ summary: 'Get all wardrobe items by brand ID (Admin)' })
  @ApiResponse({ status: 200, description: 'Wardrobe items retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async findByBrand(@Param('brandId') brandId: string): Promise<WardrobeItem[]> {
    return this.wardrobeService.findByBrandId(brandId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a wardrobe item by ID (Admin)' })
  @ApiResponse({ status: 200, description: 'Wardrobe item retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Wardrobe item not found' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async findOne(@Param('id') id: string): Promise<WardrobeItem> {
    return this.wardrobeService.findOne(id);
  }

  @Patch(':id')
  @AuditLog({ action: 'UPDATE_WARDROBE_ITEM', resource: 'wardrobe-item', includeBody: true, includeParams: true })
  @ApiOperation({ summary: 'Update a wardrobe item (Admin)' })
  @ApiResponse({ status: 200, description: 'Wardrobe item updated successfully' })
  @ApiResponse({ status: 404, description: 'Wardrobe item not found' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async update(
    @Param('id') id: string,
    @Body() updateWardrobeItemDto: UpdateWardrobeItemDto,
  ): Promise<WardrobeItem> {
    return this.wardrobeService.update(id, updateWardrobeItemDto);
  }

  @Delete(':id')
  @AuditLog({ action: 'DELETE_WARDROBE_ITEM', resource: 'wardrobe-item', includeParams: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a wardrobe item (Admin)' })
  @ApiResponse({ status: 204, description: 'Wardrobe item deleted successfully' })
  @ApiResponse({ status: 404, description: 'Wardrobe item not found' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.wardrobeService.remove(id);
  }
}