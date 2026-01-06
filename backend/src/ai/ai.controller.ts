import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AiService } from './ai.service';
import { BackgroundRemovalService } from './background-removal.service';
import { AnalyzeClothingDto, AnalyzeClothingResponse } from './dto/analyze-clothing.dto';
import { RemoveBackgroundDto, RemoveBackgroundResponse } from './dto/remove-background.dto';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';

@ApiTags('ai')
@Controller('ai')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly backgroundRemovalService: BackgroundRemovalService,
  ) {}

  @Post('analyze-clothing')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Analyze a clothing image using AI' })
  @ApiResponse({
    status: 200,
    description: 'Analysis completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            category: { type: 'string', enum: ['TOP', 'BOTTOM', 'SHOE', 'ACCESSORY'] },
            subCategory: { type: 'string' },
            brand: { type: 'string' },
            colors: { type: 'array', items: { type: 'string' } },
            confidence: { type: 'number' },
          },
        },
        error: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - missing image' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async analyzeClothing(
    @Body() dto: AnalyzeClothingDto,
  ): Promise<AnalyzeClothingResponse> {
    return this.aiService.analyzeClothing(dto);
  }

  @Post('remove-background')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove background from an image' })
  @ApiResponse({
    status: 200,
    description: 'Background removed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'string', description: 'Base64 encoded image with transparent background' },
        error: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - missing image' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeBackground(
    @Body() dto: RemoveBackgroundDto,
  ): Promise<RemoveBackgroundResponse> {
    try {
      const result = await this.backgroundRemovalService.removeBackground(dto.imageBase64);
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Background removal failed',
      };
    }
  }
}
