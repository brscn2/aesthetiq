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
    return this.styleProfileService.create({
      ...createStyleProfileDto,
      userId: user.clerkId,
    });
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

  @Post('analyze-persona')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger AI-powered persona analysis' })
  @ApiResponse({
    status: 202,
    description: 'Analysis job started',
    schema: {
      type: 'object',
      properties: {
        jobId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Style profile not found' })
  async analyzePersona(@CurrentUser() user: { clerkId: string }) {
    return this.styleProfileService.startPersonaAnalysis(user.clerkId);
  }

  @Get('persona-analysis/status')
  @ApiOperation({ summary: 'Get persona analysis status for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Analysis status found',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
        jobId: { type: 'string' },
        startedAt: { type: 'string', format: 'date-time' },
        completedAt: { type: 'string', format: 'date-time' },
        error: { type: 'string' },
      },
    },
  })
  async getPersonaAnalysisStatus(@CurrentUser() user: { clerkId: string }) {
    const status = await this.styleProfileService.getPersonaAnalysisStatus(user.clerkId);
    if (!status) {
      throw new NotFoundException('No persona analysis job found');
    }
    return status;
  }

  @Get('persona-analysis/:jobId')
  @ApiOperation({ summary: 'Get persona analysis status by job ID' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Analysis status found' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getPersonaAnalysisByJobId(
    @Param('jobId') jobId: string,
    @CurrentUser() user: { clerkId: string },
  ) {
    const status = await this.styleProfileService.getPersonaAnalysisStatus(user.clerkId);
    if (!status || status.jobId !== jobId) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }
    return status;
  }
}

