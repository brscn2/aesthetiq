import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { uploadConfig, ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from '../config/upload.config';
import { AzureStorageService } from './azure-storage.service';

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

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
  @ApiResponse({ status: 400, description: 'Invalid file type' })
  @ApiResponse({ status: 413, description: 'File size exceeds 10MB limit' })
  @ApiResponse({ status: 500, description: 'Failed to upload file to storage' })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    // Validate file presence
    if (!file) {
      this.logger.warn('Upload attempt with no file');
      throw new BadRequestException('No file uploaded');
    }

    // Validate file buffer
    if (!file.buffer) {
      this.logger.error('File buffer is missing');
      throw new BadRequestException('File buffer is missing. Please try again.');
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      this.logger.warn(`Invalid file type uploaded: ${file.mimetype}`);
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Only JPEG, PNG, WebP, and HEIC images are allowed.`
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      this.logger.warn(`File size exceeds limit: ${file.size} bytes`);
      throw new PayloadTooLargeException(
        `File size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      );
    }

    // Log upload attempt
    this.logger.log(
      `Uploading file: ${file.originalname} (${file.mimetype}, ${(file.size / 1024).toFixed(2)}KB)`
    );

    try {
      const publicUrl = await this.azureStorageService.uploadImage(file);
      
      this.logger.log(`File uploaded successfully: ${publicUrl}`);
      
      return {
        url: publicUrl,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
      throw new BadRequestException(
        error.message || 'Failed to upload file to Azure Blob Storage'
      );
    }
  }

  @Post('brand-logo')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', uploadConfig))
  @ApiOperation({ summary: 'Upload a brand logo to Azure Blob Storage' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        brandName: {
          type: 'string',
          description: 'Optional brand name for filename generation',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Brand logo uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          example: 'https://youraccount.blob.core.windows.net/brand-logos/nike-unique-filename.jpg',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file type' })
  @ApiResponse({ status: 413, description: 'File size exceeds 10MB limit' })
  @ApiResponse({ status: 500, description: 'Failed to upload file to storage' })
  async uploadBrandLogo(
    @UploadedFile() file: Express.Multer.File,
    @Body('brandName') brandName?: string,
  ) {
    // Validate file presence
    if (!file) {
      this.logger.warn('Brand logo upload attempt with no file');
      throw new BadRequestException('No file uploaded');
    }

    // Validate file buffer
    if (!file.buffer) {
      this.logger.error('File buffer is missing');
      throw new BadRequestException('File buffer is missing. Please try again.');
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      this.logger.warn(`Invalid file type uploaded for brand logo: ${file.mimetype}`);
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Only JPEG, PNG, WebP, and HEIC images are allowed.`
      );
    }

    // Validate file size (brand logos should be smaller)
    const brandLogoMaxSize = 5 * 1024 * 1024; // 5MB for brand logos
    if (file.size > brandLogoMaxSize) {
      this.logger.warn(`Brand logo file size exceeds limit: ${file.size} bytes`);
      throw new PayloadTooLargeException(
        `File size exceeds the maximum limit of ${brandLogoMaxSize / (1024 * 1024)}MB for brand logos`
      );
    }

    // Log upload attempt
    this.logger.log(
      `Uploading brand logo: ${file.originalname} (${file.mimetype}, ${(file.size / 1024).toFixed(2)}KB) for brand: ${brandName || 'unknown'}`
    );

    try {
      const publicUrl = await this.azureStorageService.uploadBrandLogo(file, brandName);
      
      this.logger.log(`Brand logo uploaded successfully: ${publicUrl}`);
      
      return {
        url: publicUrl,
      };
    } catch (error) {
      this.logger.error(`Failed to upload brand logo: ${error.message}`, error.stack);
      throw new BadRequestException(
        error.message || 'Failed to upload brand logo to Azure Blob Storage'
      );
    }
  }
}

