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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';
import { CreateColorAnalysisDto } from './dto/create-color-analysis.dto';

@ApiTags('analysis')
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new color analysis result' })
  @ApiResponse({ status: 201, description: 'Analysis successfully created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createAnalysisDto: CreateColorAnalysisDto) {
    return this.analysisService.create(createAnalysisDto);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get the latest color analysis for a user' })
  @ApiQuery({ name: 'userId', description: 'User ID', required: true })
  @ApiResponse({ status: 200, description: 'Latest analysis found' })
  @ApiResponse({ status: 404, description: 'No analysis found' })
  async getLatest(@Query('userId') userId: string) {
    const analysis = await this.analysisService.findLatestByUserId(userId);
    if (!analysis) {
      throw new NotFoundException(`No color analysis found for user ${userId}`);
    }
    return analysis;
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all color analyses for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'List of analyses' })
  async findAllByUserId(@Param('userId') userId: string) {
    return this.analysisService.findAllByUserId(userId);
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

