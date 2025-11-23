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
    if (!this.blobServiceClient) {
      throw new Error('Azure Blob Storage is not configured. Please set AZURE_STORAGE_CONNECTION_STRING.');
    }

    if (!file.buffer) {
      throw new Error('File buffer is missing. Ensure Multer is configured with memoryStorage.');
    }

    try {
      // Generate unique filename
      const fileExtension = extname(file.originalname);
      const uniqueFileName = `${uuidv4()}${fileExtension}`;

      // Get block blob client
      const blockBlobClient = this.containerClient.getBlockBlobClient(uniqueFileName);

      // Upload file buffer
      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: file.mimetype,
        },
      };

      await blockBlobClient.upload(file.buffer, file.buffer.length, uploadOptions);

      // Get the public URL
      const publicUrl = blockBlobClient.url;
      
      this.logger.log(`File uploaded successfully: ${uniqueFileName}`);
      
      return publicUrl;
    } catch (error) {
      this.logger.error(`Failed to upload file to Azure Blob Storage: ${error.message}`, error.stack);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }
}

