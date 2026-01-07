import { Injectable, Logger } from '@nestjs/common';
import { removeBackground } from '@imgly/background-removal-node';

@Injectable()
export class BackgroundRemovalService {
  private readonly logger = new Logger(BackgroundRemovalService.name);

  /**
   * Remove background from an image using @imgly/background-removal-node
   * This is FREE and runs locally on the server - no API key needed!
   */
  async removeBackground(imageBase64: string): Promise<string> {
    try {
      this.logger.log('Starting background removal...');
      
      // Extract base64 data and mime type
      let base64Data: string;
      let mimeType = 'image/jpeg';
      
      if (imageBase64.includes(',')) {
        // Has data URL prefix like "data:image/jpeg;base64,..."
        const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          base64Data = matches[2];
        } else {
          base64Data = imageBase64.split(',')[1];
        }
      } else {
        base64Data = imageBase64;
      }

      this.logger.log(`Processing image with mime type: ${mimeType}`);

      // Convert base64 to Buffer
      const inputBuffer = Buffer.from(base64Data, 'base64');
      this.logger.log(`Input buffer size: ${inputBuffer.length} bytes`);
      
      // Create a Blob with the correct mime type
      const blob = new Blob([inputBuffer], { type: mimeType });

      // Process the image (this runs locally, no API needed!)
      this.logger.log('Calling removeBackground with medium model...');
      const resultBlob = await removeBackground(blob, {
        model: 'medium', // Medium model - good balance of quality and speed
        output: {
          format: 'image/png',
          quality: 1.0, // Full quality to preserve colors
        },
      });

      // Convert result Blob to base64
      const arrayBuffer = await resultBlob.arrayBuffer();
      const resultBuffer = Buffer.from(arrayBuffer);
      const resultBase64 = resultBuffer.toString('base64');
      
      this.logger.log('Background removal completed successfully');
      return `data:image/png;base64,${resultBase64}`;
    } catch (error: any) {
      this.logger.error(`Background removal failed: ${error.message}`, error.stack);
      throw new Error(`Background removal failed: ${error.message}`);
    }
  }
}
