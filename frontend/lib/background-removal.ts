import { getClerkJwt } from "./clerk-token";

/**
 * Background Removal Service - Server-Side Implementation
 * Uses the backend API with remove.bg for reliable background removal
 */

export interface BackgroundRemovalService {
  /**
   * Remove background from an image file
   * @param file - The image file to process
   * @param onProgress - Callback for progress updates (0-100)
   * @param timeout - Maximum processing time in ms (default: 60000)
   * @param getToken - Function to get auth token
   * @returns Blob containing the processed image with transparent background
   */
  removeBackground(
    file: File,
    onProgress?: (progress: number) => void,
    timeout?: number,
    getToken?: () => Promise<string | null>,
  ): Promise<Blob>;

  /**
   * Check if the service is available
   */
  isAvailable(): boolean;
}

class BackgroundRemovalServiceImpl implements BackgroundRemovalService {
  private apiUrl: string;

  constructor() {
    this.apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
  }

  isAvailable(): boolean {
    return true; // Server-side is always available
  }

  async removeBackground(
    file: File,
    onProgress?: (progress: number) => void,
    timeout: number = 60000,
    getToken?: () => Promise<string | null>,
  ): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Background removal timed out"));
      }, timeout);

      try {
        // Show initial progress
        onProgress?.(10);

        // Convert file to base64
        const base64 = await this.fileToBase64(file);
        onProgress?.(30);

        // Get auth token
        let token = "";
        if (getToken) {
          token = (await getClerkJwt(getToken)) || "";
        }

        // Call backend API
        onProgress?.(50);

        const response = await fetch(`${this.apiUrl}/ai/remove-background`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ imageBase64: base64 }),
        });

        onProgress?.(80);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Background removal failed");
        }

        // Convert base64 result back to Blob
        const processedBlob = await this.base64ToBlob(result.data);

        clearTimeout(timeoutId);
        onProgress?.(100);

        resolve(processedBlob);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
    });
  }

  private async base64ToBlob(base64: string): Promise<Blob> {
    // Handle data URL format
    const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;
    const mimeType = base64.includes("data:")
      ? base64.split(";")[0].split(":")[1]
      : "image/png";

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }
}

export const backgroundRemovalService = new BackgroundRemovalServiceImpl();
