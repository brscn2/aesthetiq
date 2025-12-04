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
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { StyleProfileService } from './style-profile.service';
import { CreateStyleProfileDto } from './dto/create-style-profile.dto';
import { UpdateStyleProfileDto } from './dto/update-style-profile.dto';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('style-profile')
@Controller('style-profile')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class StyleProfileController {
  constructor(private readonly styleProfileService: StyleProfileService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new style profile' })
  @ApiResponse({ status: 201, description: 'Style profile successfully created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(
    @Body() createStyleProfileDto: CreateStyleProfileDto,
    @CurrentUser() user: { clerkId: string },
  ) {
    // Create a new object with userId added (not from DTO)
    const profileData = {
      ...createStyleProfileDto,
      userId: user.clerkId,
    } as CreateStyleProfileDto & { userId: string };
    
    return this.styleProfileService.create(profileData);
  }

  @Get('user')
  @ApiOperation({ summary: 'Get style profile for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Style profile found' })
  @ApiResponse({ status: 404, description: 'Style profile not found' })
  async findByUserId(@CurrentUser() user: { clerkId: string }) {
    const profile = await this.styleProfileService.findByUserId(user.clerkId);
    if (!profile) {
      throw new NotFoundException(
        `Style profile for user ${user.clerkId} not found`,
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

  @Patch('user')
  @ApiOperation({ summary: 'Update a style profile for the authenticated user (upsert)' })
  @ApiResponse({
    status: 200,
    description: 'Style profile successfully updated or created',
  })
  async updateByUserId(
    @CurrentUser() user: { clerkId: string },
    @Body() updateStyleProfileDto: UpdateStyleProfileDto,
  ) {
    return this.styleProfileService.updateByUserId(user.clerkId, updateStyleProfileDto);
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

