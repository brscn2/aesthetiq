import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { BrandsService } from './brands.service';
import { Brand } from './schemas/brand.schema';

@ApiTags('brands')
@Controller('brands')
@UseGuards(ClerkAuthGuard)
export class PublicBrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all brands for selection (public endpoint)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in brand name' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results (default: 100)', type: Number })
  @ApiResponse({ status: 200, description: 'Brands retrieved successfully' })
  async findAll(
    @Query('search') search?: string,
    @Query('limit') limit?: number,
  ): Promise<{ brands: Brand[]; total: number }> {
    return this.brandsService.findAll({
      search,
      limit: limit || 100,
      offset: 0,
    });
  }
}
