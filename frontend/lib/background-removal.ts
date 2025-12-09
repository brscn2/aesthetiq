import { removeBackground as removeBackgroundLib, Config } from '@imgly/background-removal';

export interface BackgroundRemovalService {
  /**
   * Remove background from an image file
   * @param file - The image file to process
   * @param onProgress - Callback for progress updates (0-100)
   * @param timeout - Maximum processing time in ms (default: 30000)
   * @returns Blob containing the processed image with transparent background
   */
  removeBackground(
    file: File,
    onProgress?: (progress: number) => void,
    timeout?: number
  ): Promise<Blob>;

  /**
   * Check if the library is loaded
   */
  isLoaded(): boolean;

  /**
   * Preload the library for faster processing
   */
  preload(): Promise<void>;
}

class BackgroundRemovalServiceImpl implements BackgroundRemovalService {
  private loaded = false;
  private loadPromise: Promise<void> | null = null;

  async preload(): Promise<void> {
    if (this.loaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      try {
        // Create a tiny test image to trigger model download
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 1;
        testCanvas.height = 1;
        const ctx = testCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, 1, 1);
        }
        
        // Trigger library load by processing tiny image
        await removeBackgroundLib(testCanvas);
        this.loaded = true;
      } catch (error) {
        console.warn('Background removal preload failed:', error);
        // Don't throw - allow retry on actual use
      }
    })();

    return this.loadPromise;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  async removeBackground(
    file: File,
    onProgress?: (progress: number) => void,
    timeout: number = 30000
  ): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Background removal timed out after 30 seconds'));
      }, timeout);

      try {
        // Convert file to image source
        const imageUrl = URL.createObjectURL(file);
        
        // Yield control to browser to keep UI responsive
        await new Promise(resolve => setTimeout(resolve, 0));
        
        // Configure background removal with progress updates
        const config: Config = {
          progress: (_key, current, total) => {
            const progress = Math.round((current / total) * 100);
            // Use requestAnimationFrame to keep UI responsive
            requestAnimationFrame(() => {
              onProgress?.(progress);
            });
          },
          output: {
            format: 'image/png',
            quality: 0.8, // Slightly lower quality for faster processing
          },
          // Enable debug mode to see what's happening
          debug: false,
        };

        // Process the image
        const blob = await removeBackgroundLib(imageUrl, config);
        
        // Clean up
        URL.revokeObjectURL(imageUrl);
        clearTimeout(timeoutId);
        
        this.loaded = true;
        resolve(blob);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }
}

export const backgroundRemovalService = new BackgroundRemovalServiceImpl();
