import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  GenerateTryOnDto,
  GenerateTryOnResponse,
} from './dto/generate-try-on.dto';

@Injectable()
export class TryOnService {
  private readonly logger = new Logger(TryOnService.name);
  private readonly pythonEngineUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.pythonEngineUrl =
      process.env.PYTHON_ENGINE_URL || 'http://localhost:8000';
    this.logger.log(`Python Engine URL: ${this.pythonEngineUrl}`);
  }

  async generate(dto: GenerateTryOnDto): Promise<GenerateTryOnResponse> {
    // Validate input
    if (!dto.userPhotoUrl) {
      throw new BadRequestException('User photo URL is required');
    }

    if (!dto.items || Object.keys(dto.items).length === 0) {
      throw new BadRequestException('At least one clothing item is required');
    }

    try {
      this.logger.log(
        `Generating try-on for user photo: ${dto.userPhotoUrl.substring(0, 50)}... with ${Object.keys(dto.items).length} items`,
      );

      // Call Python Try-On Service
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.pythonEngineUrl}/api/v1/try-on/generate`,
          {
            userPhotoUrl: dto.userPhotoUrl,
            items: dto.items,
            userId: dto.userId,
          },
          {
            timeout: 60000, // 60 second timeout for image generation
          },
        ),
      );

      this.logger.log('Try-on generation successful');

      return {
        success: true,
        imageBase64: response.data.image_base64,
        metadata: {
          itemCount: Object.keys(dto.items).length,
          categories: Object.keys(dto.items),
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Try-on generation failed: ${error.message}`,
        error.stack,
      );

      // Handle specific errors
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.error || error.message;

        if (status === 400) {
          throw new BadRequestException(message);
        }

        return {
          success: false,
          error: message || 'Try-on generation failed',
        };
      }

      // Network or timeout errors
      if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          error: 'Try-on service is unavailable. Please try again later.',
        };
      }

      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'Try-on generation timed out. Please try again.',
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to generate try-on image',
      };
    }
  }
}
