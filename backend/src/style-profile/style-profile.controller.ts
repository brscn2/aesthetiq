import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { StyleProfileService } from './style-profile.service';
import { CreateStyleProfileDto } from './dto/create-style-profile.dto';
import { UpdateStyleProfileDto } from './dto/update-style-profile.dto';

@ApiTags('style-profile')
@Controller('style-profile')
export class StyleProfileController {
  constructor(private readonly styleProfileService: StyleProfileService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new style profile' })
  @ApiResponse({ status: 201, description: 'Style profile successfully created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createStyleProfileDto: CreateStyleProfileDto) {
    return this.styleProfileService.create(createStyleProfileDto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get style profile by user ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Style profile found' })
  @ApiResponse({ status: 404, description: 'Style profile not found' })
  async findByUserId(@Param('userId') userId: string) {
    const profile = await this.styleProfileService.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException(
        `Style profile for user ${userId} not found`,
      );
    }
    return profile;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a style profile by ID' })
  @ApiParam({ name: 'id', description: 'Style profile ID' })
  @ApiResponse({ status: 200, description: 'Style profile found' })
  @ApiResponse({ status: 404, description: 'Style profile not found' })
  async findOne(@Param('id') id: string) {
    return this.styleProfileService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a style profile' })
  @ApiParam({ name: 'id', description: 'Style profile ID' })
  @ApiResponse({ status: 200, description: 'Style profile successfully updated' })
  @ApiResponse({ status: 404, description: 'Style profile not found' })
  async update(
    @Param('id') id: string,
    @Body() updateStyleProfileDto: UpdateStyleProfileDto,
  ) {
    return this.styleProfileService.update(id, updateStyleProfileDto);
  }

  @Patch('user/:userId')
  @ApiOperation({ summary: 'Update a style profile by user ID (upsert)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Style profile successfully updated or created',
  })
  async updateByUserId(
    @Param('userId') userId: string,
    @Body() updateStyleProfileDto: UpdateStyleProfileDto,
  ) {
    return this.styleProfileService.updateByUserId(userId, updateStyleProfileDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a style profile' })
  @ApiParam({ name: 'id', description: 'Style profile ID' })
  @ApiResponse({ status: 204, description: 'Style profile successfully deleted' })
  @ApiResponse({ status: 404, description: 'Style profile not found' })
  async remove(@Param('id') id: string) {
    return this.styleProfileService.remove(id);
  }
}

