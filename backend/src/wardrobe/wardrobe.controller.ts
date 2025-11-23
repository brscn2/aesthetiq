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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { WardrobeService } from './wardrobe.service';
import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';
import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
import { Category } from './schemas/wardrobe-item.schema';

@ApiTags('wardrobe')
@Controller('wardrobe')
export class WardrobeController {
  constructor(private readonly wardrobeService: WardrobeService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new wardrobe item' })
  @ApiResponse({ status: 201, description: 'Wardrobe item successfully created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createWardrobeItemDto: CreateWardrobeItemDto) {
    return this.wardrobeService.create(createWardrobeItemDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all wardrobe items with optional filters' })
  @ApiQuery({ name: 'userId', description: 'User ID', required: true })
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
  @ApiResponse({ status: 200, description: 'List of wardrobe items' })
  async findAll(
    @Query('userId') userId: string,
    @Query('category') category?: Category,
    @Query('colorHex') colorHex?: string,
  ) {
    return this.wardrobeService.findAll(userId, category, colorHex);
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
  @ApiResponse({ status: 200, description: 'Wardrobe item successfully updated' })
  @ApiResponse({ status: 404, description: 'Wardrobe item not found' })
  async update(
    @Param('id') id: string,
    @Body() updateWardrobeItemDto: UpdateWardrobeItemDto,
  ) {
    return this.wardrobeService.update(id, updateWardrobeItemDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a wardrobe item' })
  @ApiParam({ name: 'id', description: 'Wardrobe item ID' })
  @ApiResponse({ status: 204, description: 'Wardrobe item successfully deleted' })
  @ApiResponse({ status: 404, description: 'Wardrobe item not found' })
  async remove(@Param('id') id: string) {
    return this.wardrobeService.remove(id);
  }
}

