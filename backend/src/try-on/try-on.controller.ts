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
import { TryOnService } from './try-on.service';
import { GenerateTryOnDto } from './dto/generate-try-on.dto';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';

@ApiTags('try-on')
@Controller('try-on')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class TryOnController {
  constructor(private readonly tryOnService: TryOnService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate virtual try-on image' })
  @ApiResponse({
    status: 200,
    description: 'Try-on image generated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        imageBase64: {
          type: 'string',
          description: 'Base64 encoded try-on image',
        },
        metadata: {
          type: 'object',
          properties: {
            itemCount: { type: 'number' },
            categories: { type: 'array', items: { type: 'string' } },
          },
        },
        error: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async generateTryOn(@Body() dto: GenerateTryOnDto) {
    return this.tryOnService.generate(dto);
  }
}
