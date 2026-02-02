"""OpenAI Image Edit Service for Virtual Try-On."""
import os
import tempfile
import shutil
from pathlib import Path
from typing import List
import aiohttp
from openai import OpenAI

from app.core.config import get_settings
from app.core.logger import get_logger

settings = get_settings()
logger = get_logger(__name__)


class OpenAIService:
    """Service for OpenAI Image Edit API integration."""
    
    def __init__(self):
        """Initialize OpenAI client."""
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        logger.info("OpenAI Service initialized")
    
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
    
    async def edit_image(
        self,
        user_photo_url: str,
        clothing_image_urls: List[str],
        prompt: str
    ) -> str:
        """
        Generate virtual try-on image using OpenAI Image Edit API.
        
        Args:
            user_photo_url: URL of the user's photo
            clothing_image_urls: List of clothing item image URLs
            prompt: Detailed prompt for the image generation
        
        Returns:
            Base64 encoded image string
        """
        temp_dir = None
        
        try:
            # Create temporary directory
            temp_dir = tempfile.mkdtemp(prefix="try_on_")
            logger.info(f"Created temp directory: {temp_dir}")
            
            # Download user photo
            logger.info(f"Downloading user photo from: {user_photo_url[:50]}...")
            user_photo_path = await self._download_image(user_photo_url, temp_dir, 0)
            
            # Download clothing images
            clothing_paths = []
            for idx, clothing_url in enumerate(clothing_image_urls, start=1):
                logger.info(f"Downloading clothing image {idx} from: {clothing_url[:50]}...")
                clothing_path = await self._download_image(clothing_url, temp_dir, idx)
                clothing_paths.append(clothing_path)
            
            logger.info(f"Downloaded {len(clothing_paths) + 1} images successfully")
            
            # Prepare image files array: [user_photo, clothing1, clothing2, ...]
            # Using tuples of (filename, file_content, mime_type) like your colleague
            image_files = []
            
            # Add user photo first
            with open(user_photo_path, 'rb') as f:
                image_files.append((
                    os.path.basename(user_photo_path),
                    f.read(),
                    self._get_mime_type(user_photo_path)
                ))
            
            # Add clothing images
            for clothing_path in clothing_paths:
                with open(clothing_path, 'rb') as f:
                    image_files.append((
                        os.path.basename(clothing_path),
                        f.read(),
                        self._get_mime_type(clothing_path)
                    ))
            
            logger.info(f"Calling OpenAI images.edit API with {len(image_files)} images...")
            logger.debug(f"Prompt: {prompt[:200]}...")
            
            # Call OpenAI Image Edit API - exactly like your colleague's code
            response = self.client.images.edit(
                model=settings.OPENAI_MODEL,
                image=image_files,
                prompt=prompt,
                input_fidelity=settings.OPENAI_INPUT_FIDELITY,
                quality=settings.OPENAI_QUALITY,
            )
            
            logger.info("OpenAI API response received")
            
            # Extract base64 image
            image_base64 = response.data[0].b64_json
            
            if not image_base64:
                raise Exception("No image data in OpenAI response")
            
            logger.info("Virtual try-on image generated successfully")
            
            return image_base64
        
        except Exception as e:
            logger.error(f"OpenAI image edit failed: {e}", exc_info=True)
            
            # Handle specific OpenAI errors
            if hasattr(e, 'status_code'):
                if e.status_code == 400:
                    raise Exception(f"OpenAI API error: {str(e)}")
                elif e.status_code == 401:
                    raise Exception("Invalid OpenAI API key")
                elif e.status_code == 429:
                    raise Exception("OpenAI rate limit exceeded. Please try again later.")
            
            raise Exception(f"Failed to generate try-on image: {str(e)}")
        
        finally:
            # Clean up temporary files
            if temp_dir:
                self._cleanup_temp_files(temp_dir)
