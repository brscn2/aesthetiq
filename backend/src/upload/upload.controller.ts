import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Logger,
  PayloadTooLargeException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import type { Response as ExpressResponse } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
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
        `Invalid file type: ${file.mimetype}. Only JPEG, PNG, WebP, and GIF images are allowed.`
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

  @Post('from-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload an image from URL to Azure Blob Storage (for Chrome extension)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL of the image to upload',
          example: 'https://example.com/image.jpg',
        },
      },
      required: ['url'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Image fetched and uploaded successfully',
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
  @ApiResponse({ status: 400, description: 'Invalid URL or failed to fetch image' })
  async uploadFromUrl(@Body('url') imageUrl: string) {
    if (!imageUrl) {
      throw new BadRequestException('URL is required');
    }

    // Validate URL format
    try {
      new URL(imageUrl);
    } catch {
      throw new BadRequestException('Invalid URL format');
    }

    this.logger.log(`Fetching image from URL: ${imageUrl}`);

    try {
      // Fetch the image from the URL
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      if (!response.ok) {
        throw new BadRequestException(`Failed to fetch image: HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      
      // Validate content type
      if (!ALLOWED_IMAGE_TYPES.some(type => contentType.includes(type.split('/')[1]))) {
        throw new BadRequestException(
          `Invalid image type: ${contentType}. Only JPEG, PNG, WebP, and GIF images are allowed.`
        );
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      // Validate file size
      if (buffer.length > MAX_FILE_SIZE) {
        throw new PayloadTooLargeException(
          `Image size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
        );
      }

      // Extract filename from URL or generate one
      const urlPath = new URL(imageUrl).pathname;
      const originalName = urlPath.split('/').pop() || `image-${Date.now()}.jpg`;

      // Create a file-like object for Azure upload
      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: originalName,
        encoding: '7bit',
        mimetype: contentType,
        buffer: buffer,
        size: buffer.length,
        stream: null as any,
        destination: '',
        filename: originalName,
        path: '',
      };

      const publicUrl = await this.azureStorageService.uploadImage(file);

      this.logger.log(`Image from URL uploaded successfully: ${publicUrl}`);

      return {
        url: publicUrl,
        originalUrl: imageUrl,
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof PayloadTooLargeException) {
        throw error;
      }
      this.logger.error(`Failed to upload image from URL: ${error.message}`, error.stack);
      throw new BadRequestException(
        `Failed to fetch and upload image: ${error.message}`
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
        `Invalid file type: ${file.mimetype}. Only JPEG, PNG, WebP, and GIF images are allowed.`
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

  @Get('proxy')
  @ApiOperation({ summary: 'Proxy an image from Azure Blob Storage with CORS headers' })
  @ApiQuery({ name: 'url', required: true, description: 'The Azure Blob Storage URL to proxy' })
  @ApiResponse({ status: 200, description: 'Image returned with CORS headers' })
  @ApiResponse({ status: 400, description: 'Invalid or missing URL' })
  async proxyImage(@Query('url') url: string, @Res() res: ExpressResponse) {
    if (!url) {
      throw new BadRequestException('URL parameter is required');
    }

    // Validate that the URL is from our Azure Blob Storage
    if (!url.includes('blob.core.windows.net')) {
      throw new BadRequestException('Only Azure Blob Storage URLs are allowed');
    }

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new BadRequestException(`Failed to fetch image: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const buffer = Buffer.from(await response.arrayBuffer());

      res.set({
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000',
      });

      res.send(buffer);
    } catch (error) {
      this.logger.error(`Failed to proxy image: ${error.message}`);
      throw new BadRequestException('Failed to proxy image');
    }
  }
}

