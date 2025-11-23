import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { uploadConfig } from '../config/upload.config';
import { AzureStorageService } from './azure-storage.service';

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly azureStorageService: AzureStorageService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', uploadConfig))
  @ApiOperation({ summary: 'Upload an image file to Azure Blob Storage' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          example: 'https://youraccount.blob.core.windows.net/wardrobe-items/unique-filename.jpg',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file or file too large' })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.buffer) {
      throw new BadRequestException('File buffer is missing');
    }

    try {
      const publicUrl = await this.azureStorageService.uploadImage(file);
      
      return {
        url: publicUrl,
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to upload file to Azure Blob Storage'
      );
    }
  }
}

