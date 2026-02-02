import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { BlobServiceClient } from '@azure/storage-blob';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class TryonService {
  private readonly logger = new Logger(TryonService.name);
  private readonly lightxApiKey = process.env.LIGHTX_API_KEY;
  private readonly lightxBaseUrl = 'https://api.lightxeditor.com/external/api/v2';
  private readonly blobServiceClient: BlobServiceClient;
  private readonly containerName = 'tryon-avatars';

  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING is not defined');
    }
    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  }

  async tryOnWithFile(
    clerkId: string,
    clothingImageUrl: string,
    avatarImageFile: Buffer | null,
    useSavedAvatar: boolean,
  ): Promise<Buffer> {
    try {
      let avatarBuffer: Buffer;

      if (useSavedAvatar) {
        // Get user's saved try-on avatar from Azure
        const user = await this.userModel.findOne({ clerkId }).exec();
        if (!user || !user.tryonAvatarUrl) {
          throw new Error('No saved try-on avatar found. Please upload a photo first.');
        }
        this.logger.log(`Using saved avatar from: ${user.tryonAvatarUrl}`);
        
        // Download the saved avatar from Azure
        const avatarResponse = await axios.get(user.tryonAvatarUrl, {
          responseType: 'arraybuffer',
        });
        avatarBuffer = Buffer.from(avatarResponse.data);
      } else {
        // Upload new avatar image to Azure Blob Storage for future use
        this.logger.log('Uploading new avatar image to Azure Blob Storage');
        const avatarAzureUrl = await this.uploadAvatarToAzure(clerkId, avatarImageFile!);
        this.logger.log(`New avatar uploaded to: ${avatarAzureUrl}`);
        
        // Save this as user's try-on avatar for future use
        await this.userModel.findOneAndUpdate(
          { clerkId },
          { tryonAvatarUrl: avatarAzureUrl },
          { new: true }
        ).exec();
        
        avatarBuffer = avatarImageFile!;
      }

      // Step 1: Upload avatar to LightX
      this.logger.log('Uploading avatar to LightX...');
      const avatarLightxUrl = await this.uploadToLightX(avatarBuffer);
      this.logger.log(`Avatar uploaded to LightX: ${avatarLightxUrl}`);

      // Step 2: Download and upload clothing image to LightX
      this.logger.log(`Downloading clothing image from: ${clothingImageUrl}`);
      const clothingResponse = await axios.get(clothingImageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': new URL(clothingImageUrl).origin + '/',
        },
      });
      const clothingBuffer = Buffer.from(clothingResponse.data);
      
      this.logger.log('Uploading clothing to LightX...');
      const clothingLightxUrl = await this.uploadToLightX(clothingBuffer);
      this.logger.log(`Clothing uploaded to LightX: ${clothingLightxUrl}`);

      // Step 3: Start the try-on process
      this.logger.log('Starting LightX virtual try-on process...');
      const orderId = await this.startTryOn(avatarLightxUrl, clothingLightxUrl);
      this.logger.log(`Try-on order started: ${orderId}`);

      // Step 4: Poll for result
      this.logger.log('Polling for try-on result...');
      const resultUrl = await this.pollForResult(orderId);
      this.logger.log(`Try-on complete! Result URL: ${resultUrl}`);

      // Step 5: Download and return the result image
      const resultResponse = await axios.get(resultUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      this.logger.log('Try-on request successful');
      return Buffer.from(resultResponse.data);
    } catch (error) {
      this.logger.error('Try-on request failed', error.message);
      if (error.response) {
        this.logger.error(`Response status: ${error.response.status}`);
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  private async uploadToLightX(imageBuffer: Buffer): Promise<string> {
    const headers = {
      'x-api-key': this.lightxApiKey,
      'Content-Type': 'application/json',
    };

    // Step 1: Get upload URL
    const uploadUrlResponse = await axios.post(
      `${this.lightxBaseUrl}/uploadImageUrl`,
      {
        uploadType: 'imageUrl',
        size: imageBuffer.length,
        contentType: 'image/jpeg',
      },
      { headers },
    );

    const { uploadImage, imageUrl } = uploadUrlResponse.data.body;

    // Step 2: Upload the image
    await axios.put(uploadImage, imageBuffer, {
      headers: { 'Content-Type': 'image/jpeg' },
    });

    return imageUrl;
  }

  private async startTryOn(avatarUrl: string, clothingUrl: string): Promise<string> {
    const headers = {
      'x-api-key': this.lightxApiKey,
      'Content-Type': 'application/json',
    };

    const response = await axios.post(
      `${this.lightxBaseUrl}/aivirtualtryon`,
      {
        imageUrl: avatarUrl,
        outfitImageUrl: clothingUrl,
        segmentationType: 0,
      },
      { headers },
    );

    return response.data.body.orderId;
  }

  private async pollForResult(orderId: string, maxAttempts = 20, intervalMs = 3000): Promise<string> {
    const headers = {
      'x-api-key': this.lightxApiKey,
      'Content-Type': 'application/json',
    };

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.delay(intervalMs);

      const statusResponse = await axios.post(
        `${this.lightxBaseUrl}/order-status`,
        { orderId },
        { headers },
      );

      const statusData = statusResponse.data.body;
      this.logger.log(`Poll attempt ${attempt + 1}: status = ${statusData.status}`);

      if (statusData.status === 'active') {
        return statusData.output;
      }

      if (statusData.status === 'failed') {
        throw new Error('LightX try-on processing failed');
      }
    }

    throw new Error('LightX try-on timed out');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async uploadAvatarToAzure(clerkId: string, avatarImageFile: Buffer): Promise<string> {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      
      // Create container if it doesn't exist
      await containerClient.createIfNotExists({
        access: 'blob', // Public read access for blobs
      });

      // Generate unique filename with clerk ID
      const filename = `user-${clerkId}-${Date.now()}.jpg`;
      const blockBlobClient = containerClient.getBlockBlobClient(filename);

      // Upload the file
      await blockBlobClient.upload(avatarImageFile, avatarImageFile.length, {
        blobHTTPHeaders: {
          blobContentType: 'image/jpeg',
        },
      });

      return blockBlobClient.url;
    } catch (error) {
      this.logger.error('Failed to upload avatar to Azure', error.message);
      throw error;
    }
  }
}
