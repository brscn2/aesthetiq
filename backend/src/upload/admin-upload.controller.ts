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
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../admin/guards/roles.guard';
import { Roles } from '../admin/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { uploadConfig, ALLOWED_IMAGE_TYPES } from '../config/upload.config';
import { AzureStorageService } from './azure-storage.service';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';
import { AuditLog } from '../audit/decorators/audit-log.decorator';

@ApiTags('admin-upload')
@Controller('admin/upload')
@UseGuards(ClerkAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Roles(UserRole.ADMIN)
export class AdminUploadController {
  private readonly logger = new Logger(AdminUploadController.name);

  constructor(private readonly azureStorageService: AzureStorageService) {}

  @Post('brand-logo')
  @AuditLog({ action: 'UPLOAD_BRAND_LOGO', resource: 'brand-logo', includeBody: true })
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', uploadConfig))
  @ApiOperation({ summary: 'Upload a brand logo (Admin only)' })
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
          description: 'Brand name for filename generation',
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
  @ApiResponse({ status: 400, description: 'Invalid file type or missing file' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 413, description: 'File size exceeds 5MB limit' })
  @ApiResponse({ status: 500, description: 'Failed to upload file to storage' })
  async uploadBrandLogo(
    @UploadedFile() file: Express.Multer.File,
    @Body('brandName') brandName?: string,
  ) {
    // Validate file presence
    if (!file) {
      this.logger.warn('Admin brand logo upload attempt with no file');
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

    // Validate file size (brand logos should be smaller - 5MB limit)
    const brandLogoMaxSize = 5 * 1024 * 1024; // 5MB for brand logos
    if (file.size > brandLogoMaxSize) {
      this.logger.warn(`Brand logo file size exceeds limit: ${file.size} bytes`);
      throw new PayloadTooLargeException(
        `File size exceeds the maximum limit of ${brandLogoMaxSize / (1024 * 1024)}MB for brand logos`
      );
    }

    // Validate brand name if provided
    if (brandName && brandName.trim().length === 0) {
      throw new BadRequestException('Brand name cannot be empty');
    }

    // Log upload attempt
    this.logger.log(
      `Admin uploading brand logo: ${file.originalname} (${file.mimetype}, ${(file.size / 1024).toFixed(2)}KB) for brand: ${brandName || 'unknown'}`
    );

    try {
      const publicUrl = await this.azureStorageService.uploadBrandLogo(file, brandName);
      
      this.logger.log(`Brand logo uploaded successfully by admin: ${publicUrl}`);
      
      return {
        url: publicUrl,
        brandName: brandName || null,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      this.logger.error(`Failed to upload brand logo: ${error.message}`, error.stack);
      throw new BadRequestException(
        error.message || 'Failed to upload brand logo to Azure Blob Storage'
      );
    }
  }
}