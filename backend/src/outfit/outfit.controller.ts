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
import { OutfitService } from './outfit.service';
import { CreateOutfitDto } from './dto/create-outfit.dto';
import { UpdateOutfitDto } from './dto/update-outfit.dto';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('outfits')
@Controller('outfits')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class OutfitController {
  constructor(private readonly outfitService: OutfitService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new outfit' })
  @ApiResponse({ status: 201, description: 'Outfit successfully created' })
  @ApiResponse({ status: 400, description: 'Bad request - outfit must contain at least one item' })
  async create(
    @Body() createOutfitDto: CreateOutfitDto,
    @CurrentUser() user: { clerkId: string },
  ) {
    return this.outfitService.create(createOutfitDto, user.clerkId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all outfits for the current user' })
  @ApiQuery({
    name: 'favorites',
    required: false,
    type: Boolean,
    description: 'Filter to show only favorites',
  })
  @ApiResponse({ status: 200, description: 'List of outfits' })
  async findAll(
    @CurrentUser() user: { clerkId: string },
    @Query('favorites') favorites?: string,
  ) {
    const favoritesOnly = favorites === 'true';
    return this.outfitService.findAllByUser(user.clerkId, favoritesOnly);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an outfit by ID with populated items' })
  @ApiParam({ name: 'id', description: 'Outfit ID' })
  @ApiResponse({ status: 200, description: 'Outfit found with populated wardrobe items' })
  @ApiResponse({ status: 404, description: 'Outfit not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { clerkId: string },
  ) {
    return this.outfitService.findOne(id, user.clerkId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an outfit' })
  @ApiParam({ name: 'id', description: 'Outfit ID' })
  @ApiResponse({ status: 200, description: 'Outfit successfully updated' })
  @ApiResponse({ status: 404, description: 'Outfit not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 400, description: 'Bad request - outfit must contain at least one item' })
  async update(
    @Param('id') id: string,
    @Body() updateOutfitDto: UpdateOutfitDto,
    @CurrentUser() user: { clerkId: string },
  ) {
    return this.outfitService.update(id, updateOutfitDto, user.clerkId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an outfit' })
  @ApiParam({ name: 'id', description: 'Outfit ID' })
  @ApiResponse({ status: 204, description: 'Outfit successfully deleted' })
  @ApiResponse({ status: 404, description: 'Outfit not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: { clerkId: string },
  ) {
    return this.outfitService.remove(id, user.clerkId);
  }

  @Patch(':id/favorite')
  @ApiOperation({ summary: 'Toggle favorite status of an outfit' })
  @ApiParam({ name: 'id', description: 'Outfit ID' })
  @ApiResponse({ status: 200, description: 'Favorite status toggled' })
  @ApiResponse({ status: 404, description: 'Outfit not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async toggleFavorite(
    @Param('id') id: string,
    @CurrentUser() user: { clerkId: string },
  ) {
    return this.outfitService.toggleFavorite(id, user.clerkId);
  }
}
