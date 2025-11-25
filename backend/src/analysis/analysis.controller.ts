import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';
import { CreateColorAnalysisDto } from './dto/create-color-analysis.dto';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('analysis')
@Controller('analysis')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new color analysis result' })
  @ApiResponse({ status: 201, description: 'Analysis successfully created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(
    @Body() createAnalysisDto: CreateColorAnalysisDto,
    @CurrentUser() user: { clerkId: string },
  ) {
    return this.analysisService.create({
      ...createAnalysisDto,
      userId: user.clerkId,
    });
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get the latest color analysis for a user' })
  @ApiResponse({ status: 200, description: 'Latest analysis found' })
  @ApiResponse({ status: 404, description: 'No analysis found' })
  async getLatest(@CurrentUser() user: { clerkId: string }) {
    const analysis = await this.analysisService.findLatestByUserId(user.clerkId);
    if (!analysis) {
      throw new NotFoundException(`No color analysis found for user ${user.clerkId}`);
    }
    return analysis;
  }

  @Get('user')
  @ApiOperation({ summary: 'Get all color analyses for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of analyses' })
  async findAllByUserId(@CurrentUser() user: { clerkId: string }) {
    return this.analysisService.findAllByUserId(user.clerkId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a color analysis by ID' })
  @ApiParam({ name: 'id', description: 'Analysis ID' })
  @ApiResponse({ status: 200, description: 'Analysis found' })
  @ApiResponse({ status: 404, description: 'Analysis not found' })
  async findOne(@Param('id') id: string) {
    return this.analysisService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a color analysis' })
  @ApiParam({ name: 'id', description: 'Analysis ID' })
  @ApiResponse({ status: 204, description: 'Analysis successfully deleted' })
  @ApiResponse({ status: 404, description: 'Analysis not found' })
  async remove(@Param('id') id: string) {
    return this.analysisService.remove(id);
  }
}

