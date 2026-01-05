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
import { AnalyzeClothingDto, AnalyzeClothingResponse } from './dto/analyze-clothing.dto';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';

@ApiTags('ai')
@Controller('ai')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private readonly aiService: AiService) {}

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
}
