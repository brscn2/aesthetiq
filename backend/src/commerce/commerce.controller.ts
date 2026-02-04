import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CommerceService } from './commerce.service';
import { SearchCommerceItemsDto } from './dto/search-commerce-items.dto';
import { FindStyleItemsDto } from './dto/find-style-items.dto';
import { CommerceItem } from './schemas/commerce-item.schema';
import { ScrapedCommerceItem } from './schemas/scraped-commerce-item.schema';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';

@ApiTags('commerce')
@Controller('commerce')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class CommerceController {
  constructor(private readonly commerceService: CommerceService) {}

  @Get()
  @ApiOperation({ summary: 'Search and list commerce items' })
  @ApiResponse({ status: 200, description: 'Commerce items retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  async findAll(
    @Query() searchDto: SearchCommerceItemsDto,
  ): Promise<{ items: CommerceItem[]; total: number }> {
    return this.commerceService.findAll(searchDto);
  }

  @Get('find-your-style')
  @ApiOperation({ summary: 'Get items from scraped commerce collection for style discovery' })
  @ApiResponse({ status: 200, description: 'Style items retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  async findYourStyle(
    @Query() findStyleDto: FindStyleItemsDto,
  ): Promise<{ items: ScrapedCommerceItem[]; total: number; page: number; limit: number }> {
    return this.commerceService.findStyleItems(findStyleDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a commerce item by ID' })
  @ApiParam({ name: 'id', description: 'Commerce item ID' })
  @ApiResponse({ status: 200, description: 'Commerce item found' })
  @ApiResponse({ status: 400, description: 'Invalid commerce item ID format' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 404, description: 'Commerce item not found' })
  async findOne(@Param('id') id: string): Promise<CommerceItem> {
    return this.commerceService.findOne(id);
  }
}
