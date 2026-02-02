"""Virtual Try-On Service using IDM-VTON."""
import os
import tempfile
import shutil
from pathlib import Path
from typing import List
import aiohttp

from app.core.config import get_settings
from app.core.logger import get_logger
from app.services.idm_vton_service import IDMVTONService

settings = get_settings()
logger = get_logger(__name__)


class TryOnService:
    """Service for Virtual Try-On using IDM-VTON."""
    
    def __init__(self):
        """Initialize IDM-VTON service."""
        self.idm_vton_service = IDMVTONService()
        logger.info("Try-On Service initialized with IDM-VTON")
    
    def _get_mime_type(self, file_path: str) -> str:
        """Get MIME type from file extension."""
        ext = Path(file_path).suffix.lower()
        mime_types = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webp': 'image/webp',
        }
        return mime_types.get(ext, 'image/jpeg')
    
    async def _download_image(
        self,
        image_url: str,
        temp_dir: str,
        index: int
    ) -> str:
        """Download image from URL to temporary file."""
        try:
            # Add headers to avoid 403 errors from websites like Zara
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': image_url.split('?')[0],  # Use base URL as referer
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(image_url, headers=headers) as response:
                    if response.status != 200:
                        raise Exception(f"Failed to download image: HTTP {response.status}")
                    
                    # Determine file extension from URL or content-type
                    extension = '.jpg'
                    if '.png' in image_url.lower():
                        extension = '.png'
                    elif '.webp' in image_url.lower():
                        extension = '.webp'
                    
                    temp_file_path = os.path.join(temp_dir, f"temp_image_{index}{extension}")
                    
                    # Write image data to file
                    with open(temp_file_path, 'wb') as f:
                        f.write(await response.read())
                    
                    logger.debug(f"Downloaded image {index} to {temp_file_path}")
                    return temp_file_path
        
        except Exception as e:
            logger.error(f"Failed to download image from {image_url}: {e}")
            raise
    
    def _cleanup_temp_files(self, temp_dir: str):
        """Clean up temporary files and directory."""
        try:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
                logger.debug(f"Cleaned up temp directory: {temp_dir}")
        except Exception as e:
            logger.error(f"Error cleaning up temp files: {e}")
    
    async def generate_try_on(
        self,
        user_photo_url: str,
        clothing_image_urls: List[str],
        prompt: str
    ) -> str:
        """
        Generate virtual try-on image using IDM-VTON.
        
        Args:
            user_photo_url: URL of the user's photo
            clothing_image_urls: List of clothing item image URLs
            prompt: Detailed prompt for the image generation
        
        Returns:
            Base64 encoded image string
        """
        logger.info("Using IDM-VTON for virtual try-on")
        return await self.idm_vton_service.generate_try_on(
            user_photo_url=user_photo_url,
            clothing_image_urls=clothing_image_urls,
            prompt=prompt
        )
