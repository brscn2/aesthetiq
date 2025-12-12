import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';

@Injectable()
export class AzureStorageService implements OnModuleInit {
  private readonly logger = new Logger(AzureStorageService.name);
  private blobServiceClient: BlobServiceClient;
  private containerName = 'wardrobe-items';
  private containerClient: ContainerClient;

  constructor(private configService: ConfigService) {
    const connectionString = this.configService.get<string>('AZURE_STORAGE_CONNECTION_STRING');
    
    if (!connectionString) {
      this.logger.warn('AZURE_STORAGE_CONNECTION_STRING not found in environment variables');
      return;
    }

    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
  }

  async onModuleInit() {
    // Ensure container exists on module initialization
    await this.ensureContainerExists();
  }

  private async ensureContainerExists(): Promise<void> {
    try {
      const connectionString = this.configService.get<string>('AZURE_STORAGE_CONNECTION_STRING');
      if (!connectionString) {
        this.logger.warn('Skipping container creation - connection string not configured');
        return;
      }

      const exists = await this.containerClient.exists();
      if (!exists) {
        await this.containerClient.create({
          access: 'blob', // Public read access
        });
        this.logger.log(`Container '${this.containerName}' created successfully`);
      } else {
        this.logger.log(`Container '${this.containerName}' already exists`);
      }
    } catch (error) {
      this.logger.error(`Failed to ensure container exists: ${error.message}`, error.stack);
      throw error;
    }
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    // Validate Azure configuration
    if (!this.blobServiceClient) {
      this.logger.error('Azure Blob Storage is not configured');
      throw new Error('Azure Blob Storage is not configured. Please set AZURE_STORAGE_CONNECTION_STRING.');
    }

    // Validate file buffer
    if (!file.buffer) {
      this.logger.error('File buffer is missing');
      throw new Error('File buffer is missing. Ensure Multer is configured with memoryStorage.');
    }

    // Generate unique filename with UUID
    const fileExtension = extname(file.originalname);
    const uniqueFileName = `${uuidv4()}${fileExtension}`;

    this.logger.log(`Starting upload for file: ${file.originalname} (${(file.size / 1024).toFixed(2)}KB) as ${uniqueFileName}`);

    try {
      // Get block blob client
      const blockBlobClient = this.containerClient.getBlockBlobClient(uniqueFileName);

      // Upload file buffer with metadata
      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: file.mimetype,
        },
        metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
        },
      };

      await blockBlobClient.upload(file.buffer, file.buffer.length, uploadOptions);

      // Verify upload by checking if blob exists
      const exists = await blockBlobClient.exists();
      if (!exists) {
        throw new Error('Upload verification failed - blob does not exist after upload');
      }

      // Get the public URL
      const publicUrl = blockBlobClient.url;
      
      this.logger.log(`File uploaded successfully: ${uniqueFileName} -> ${publicUrl}`);
      
      return publicUrl;
    } catch (error) {
      this.logger.error(
        `Failed to upload file to Azure Blob Storage: ${error.message}`,
        error.stack,
      );
      
      // Provide more specific error messages
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to Azure Blob Storage. Please check your network connection.');
      }
      
      if (error.statusCode === 403) {
        throw new Error('Access denied to Azure Blob Storage. Please check your credentials.');
      }
      
      if (error.statusCode === 404) {
        throw new Error(`Container '${this.containerName}' not found. Please ensure it exists.`);
      }
      
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async deleteImage(imageUrl: string): Promise<void> {
    // Validate Azure configuration
    if (!this.blobServiceClient) {
      this.logger.warn('Azure Blob Storage is not configured - skipping deletion');
      return;
    }

    try {
      // Extract blob name from URL
      // URL format: https://accountname.blob.core.windows.net/container/blobname
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');
      const blobName = pathParts[pathParts.length - 1];

      if (!blobName) {
        this.logger.warn(`Could not extract blob name from URL: ${imageUrl}`);
        return;
      }

      this.logger.log(`Attempting to delete blob: ${blobName}`);

      // Get block blob client
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

      // Check if blob exists before attempting deletion
      const exists = await blockBlobClient.exists();
      if (!exists) {
        this.logger.warn(`Blob does not exist: ${blobName}`);
        return;
      }

      // Delete the blob
      await blockBlobClient.delete();

      this.logger.log(`Blob deleted successfully: ${blobName}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete image from Azure Blob Storage: ${error.message}`,
        error.stack,
      );
      
      // Don't throw error - deletion failure shouldn't block item deletion
      // Just log the error for monitoring
    }
  }
}

