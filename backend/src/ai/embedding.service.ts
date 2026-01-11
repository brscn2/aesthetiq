import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as FormData from 'form-data';

interface EmbeddingResponse {
  embedding: number[];
  dimension: number;
  model: string;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly embeddingServiceUrl: string;

  constructor(private configService: ConfigService) {
    this.embeddingServiceUrl = this.configService.get<string>(
      'EMBEDDING_SERVICE_URL',
      'http://localhost:8004',
    );
    this.logger.log(`Embedding service URL: ${this.embeddingServiceUrl}`);
  }

  /**
   * Generate CLIP embedding for an image from URL
   * @param imageUrl URL of the image to embed
   * @returns 512-dimensional embedding vector or null on failure
   */
  async getImageEmbedding(imageUrl: string): Promise<number[] | null> {
    try {
      this.logger.log(`Fetching embedding for image: ${imageUrl}`);

      // First, download the image
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      // Create form data with the image
      const formData = new FormData();
      formData.append('file', Buffer.from(imageResponse.data), {
        filename: 'image.jpg',
        contentType: imageResponse.headers['content-type'] || 'image/jpeg',
      });

      // Send to embedding service
      const response = await axios.post<EmbeddingResponse>(
        `${this.embeddingServiceUrl}/embed/image`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 60000, // 60 second timeout for model inference
        },
      );

      this.logger.log(
        `Embedding generated successfully (${response.data.dimension} dimensions)`,
      );
      return response.data.embedding;
    } catch (error) {
      this.logger.error(`Failed to generate embedding: ${error.message}`);
      // Don't fail the whole operation if embedding fails
      return null;
    }
  }

  /**
   * Check if the embedding service is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.embeddingServiceUrl}/health`, {
        timeout: 5000,
      });
      return response.data?.status === 'healthy' && response.data?.model_loaded;
    } catch {
      return false;
    }
  }
}
