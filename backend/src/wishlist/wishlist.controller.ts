import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { CreateWishlistItemDto } from './dto/create-wishlist-item.dto';
import { UpdateWishlistItemDto } from './dto/update-wishlist-item.dto';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('wishlist')
@Controller('wishlist')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post()
  @ApiOperation({ summary: 'Add an item to wishlist' })
  @ApiResponse({
    status: 201,
    description: 'Item successfully added to wishlist',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(
    @Body() createWishlistItemDto: CreateWishlistItemDto,
    @CurrentUser() user: { clerkId: string },
  ) {
    return this.wishlistService.create(createWishlistItemDto, user.clerkId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all wishlist items' })
  @ApiResponse({
    status: 200,
    description: 'Wishlist items retrieved successfully',
  })
  async findAll(@CurrentUser() user: { clerkId: string }) {
    return this.wishlistService.findAll(user.clerkId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a wishlist item by ID' })
  @ApiParam({ name: 'id', description: 'Wishlist item ID' })
  @ApiResponse({ status: 200, description: 'Wishlist item found' })
  @ApiResponse({ status: 404, description: 'Wishlist item not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { clerkId: string },
  ) {
    return this.wishlistService.findOne(id, user.clerkId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a wishlist item' })
  @ApiParam({ name: 'id', description: 'Wishlist item ID' })
  @ApiResponse({
    status: 200,
    description: 'Wishlist item successfully updated',
  })
  @ApiResponse({ status: 404, description: 'Wishlist item not found' })
  async update(
    @Param('id') id: string,
    @Body() updateWishlistItemDto: UpdateWishlistItemDto,
    @CurrentUser() user: { clerkId: string },
  ) {
    return this.wishlistService.update(id, user.clerkId, updateWishlistItemDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an item from wishlist' })
  @ApiParam({ name: 'id', description: 'Wishlist item ID' })
  @ApiResponse({
    status: 204,
    description: 'Wishlist item successfully removed',
  })
  @ApiResponse({ status: 404, description: 'Wishlist item not found' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: { clerkId: string },
  ) {
    await this.wishlistService.remove(id, user.clerkId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all items from wishlist' })
  @ApiResponse({
    status: 200,
    description: 'Wishlist cleared successfully',
  })
  async clearAll(@CurrentUser() user: { clerkId: string }) {
    return this.wishlistService.removeAll(user.clerkId);
  }
}
