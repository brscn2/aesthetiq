import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WardrobeService } from './wardrobe.service';
import { IntelligenceService } from './intelligence/intelligence.service';
import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';
import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
import { Category } from './schemas/wardrobe-item.schema';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('wardrobe')
@Controller('wardrobe')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class WardrobeController {
  constructor(
    private readonly wardrobeService: WardrobeService,
    private readonly intelligenceService: IntelligenceService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new wardrobe item' })
  @ApiResponse({
    status: 201,
    description: 'Wardrobe item successfully created',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(
    @Body() createWardrobeItemDto: CreateWardrobeItemDto,
    @CurrentUser() user: { clerkId: string },
  ) {
    return this.wardrobeService.create({
      ...createWardrobeItemDto,
      userId: user.clerkId,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all wardrobe items with optional filters' })
  @ApiQuery({
    name: 'category',
    enum: Category,
    required: false,
    description: 'Filter by category',
  })
  @ApiQuery({
    name: 'colorHex',
    required: false,
    description: 'Filter by color hex code',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search in brand, subCategory, and notes',
  })
  @ApiQuery({
    name: 'seasonalPalette',
    required: false,
    description:
      'Filter by seasonal color palette (e.g., WARM_AUTUMN, COOL_WINTER)',
  })
  @ApiQuery({
    name: 'minPaletteScore',
    required: false,
    description: 'Minimum palette score threshold (0-1, default 0.6)',
  })
  @ApiResponse({ status: 200, description: 'List of wardrobe items' })
  async findAll(
    @CurrentUser() user: { clerkId: string },
    @Query('category') category?: Category,
    @Query('colorHex') colorHex?: string,
    @Query('search') search?: string,
    @Query('seasonalPalette') seasonalPalette?: string,
    @Query('minPaletteScore') minPaletteScore?: string,
  ) {
    return this.wardrobeService.findAll(
      user.clerkId,
      category,
      colorHex,
      undefined,
      search,
      seasonalPalette,
      minPaletteScore ? parseFloat(minPaletteScore) : undefined,
    );
  }

  @Get('feedback/disliked')
  @ApiOperation({ summary: 'Get disliked wardrobe items (feedback list)' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Page size (default 20, max 50)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Offset for pagination (default 0)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of disliked wardrobe items with feedback metadata',
  })
  async getDislikedFeedback(
    @CurrentUser() user: { clerkId: string },
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.wardrobeService.getDislikedWardrobeFeedback(
      user.clerkId,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a wardrobe item by ID' })
  @ApiParam({ name: 'id', description: 'Wardrobe item ID' })
  @ApiResponse({ status: 200, description: 'Wardrobe item found' })
  @ApiResponse({ status: 404, description: 'Wardrobe item not found' })
  async findOne(@Param('id') id: string) {
    return this.wardrobeService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a wardrobe item' })
  @ApiParam({ name: 'id', description: 'Wardrobe item ID' })
  @ApiResponse({
    status: 200,
    description: 'Wardrobe item successfully updated',
  })
  @ApiResponse({ status: 404, description: 'Wardrobe item not found' })
  async update(
    @Param('id') id: string,
    @Body() updateWardrobeItemDto: UpdateWardrobeItemDto,
  ) {
    return this.wardrobeService.update(id, updateWardrobeItemDto);
  }

  @Delete('feedback/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a feedback record for a wardrobe item' })
  @ApiParam({
    name: 'itemId',
    description: 'Wardrobe item ID associated with feedback',
  })
  @ApiResponse({
    status: 204,
    description: 'Feedback record deleted (if exists)',
  })
  async deleteFeedback(
    @CurrentUser() user: { clerkId: string },
    @Param('itemId') itemId: string,
  ) {
    await this.wardrobeService.deleteItemFeedback(user.clerkId, itemId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a wardrobe item' })
  @ApiParam({ name: 'id', description: 'Wardrobe item ID' })
  @ApiResponse({
    status: 204,
    description: 'Wardrobe item successfully deleted',
  })
  @ApiResponse({ status: 404, description: 'Wardrobe item not found' })
  async remove(@Param('id') id: string) {
    return this.wardrobeService.remove(id);
  }

  @Get('intelligence/analysis')
  @ApiOperation({
    summary: 'Get comprehensive wardrobe intelligence metrics and insights',
  })
  @ApiResponse({
    status: 200,
    description: 'Wardrobe intelligence data with all dimensions',
  })
  @ApiResponse({ status: 400, description: 'Failed to calculate intelligence' })
  async getIntelligence(@CurrentUser() user: { clerkId: string }) {
    try {
      const intelligence = await this.intelligenceService.calculateIntelligence(
        user.clerkId,
      );
      return {
        success: true,
        data: intelligence,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Get('intelligence/gap-analysis')
  @ApiOperation({ summary: 'Get AI-powered wardrobe gap recommendations' })
  @ApiResponse({
    status: 200,
    description: 'Smart gap analysis recommendations',
  })
  @ApiResponse({ status: 400, description: 'Failed to generate gap analysis' })
  async getGapAnalysis(@CurrentUser() user: { clerkId: string }) {
    try {
      const analysis = await this.intelligenceService.getSmartGapAnalysis(
        user.clerkId,
      );
      return {
        success: true,
        data: analysis,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
