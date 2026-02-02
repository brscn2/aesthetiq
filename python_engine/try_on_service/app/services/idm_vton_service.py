"""IDM-VTON Service for Virtual Try-On via Replicate API."""
import os
import base64
import tempfile
from typing import List
import aiohttp
import replicate

from app.core.config import get_settings
from app.core.logger import get_logger

settings = get_settings()
logger = get_logger(__name__)


class IDMVTONService:
    """Service for IDM-VTON Virtual Try-On via Replicate API."""
    
    def __init__(self):
        """Initialize Replicate client."""
        if settings.REPLICATE_API_TOKEN:
            os.environ["REPLICATE_API_TOKEN"] = settings.REPLICATE_API_TOKEN
            logger.info("IDM-VTON Service initialized with Replicate API")
        else:
            logger.warning("No REPLICATE_API_TOKEN provided")
    
    def _get_mime_type(self, file_path: str) -> str:
        """Get MIME type from file extension."""
        from pathlib import Path
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
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': image_url.split('?')[0],
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(image_url, headers=headers) as response:
                    if response.status != 200:
                        raise Exception(f"Failed to download image: HTTP {response.status}")
                    
                    # Determine file extension
                    extension = '.jpg'
                    if '.png' in image_url.lower():
                        extension = '.png'
                    elif '.webp' in image_url.lower():
                        extension = '.webp'
                    
                    temp_file_path = os.path.join(temp_dir, f"temp_image_{index}{extension}")
                    
                    with open(temp_file_path, 'wb') as f:
                        f.write(await response.read())
                    
                    logger.debug(f"Downloaded image {index} to {temp_file_path}")
                    return temp_file_path
        
        except Exception as e:
            logger.error(f"Failed to download image from {image_url}: {e}")
            raise
    
    async def generate_try_on(
        self,
        user_photo_url: str,
        clothing_image_urls: List[str],
        prompt: str
    ) -> str:
        """
        Generate virtual try-on image using IDM-VTON via Replicate.
        
        IDM-VTON is specifically designed for virtual try-on and preserves
        the person's face perfectly while changing only the clothing.
        
        Args:
            user_photo_url: URL of the user's photo
            clothing_image_urls: List of clothing item image URLs (uses first one)
            prompt: Description of the garment (optional, can be empty)
        
        Returns:
            Base64 encoded image string
        """
        temp_dir = None
        
        try:
            # Create temporary directory
            temp_dir = tempfile.mkdtemp(prefix="idm_vton_")
            logger.info(f"Created temp directory: {temp_dir}")
            
            # Download user photo
            logger.info(f"Downloading user photo from: {user_photo_url[:50]}...")
            user_photo_path = await self._download_image(user_photo_url, temp_dir, 0)
            
            # Download first clothing image (IDM-VTON works with one garment at a time)
            logger.info(f"Downloading clothing image from: {clothing_image_urls[0][:50]}...")
            clothing_path = await self._download_image(clothing_image_urls[0], temp_dir, 1)
            
            logger.info("Calling IDM-VTON via Replicate API...")
            
            # Replicate expects file paths or URLs
            # Try using file paths directly
            output = replicate.run(
                settings.IDM_VTON_MODEL,
                input={
                    "human_img": open(user_photo_path, 'rb'),
                    "garm_img": open(clothing_path, 'rb'),
                    "garment_des": prompt if prompt else "clothing item",
                    "is_checked": True,  # Use auto-generated mask
                    "is_checked_crop": False,  # Don't crop
                    "denoise_steps": 30,  # Quality vs speed (20-50)
                    "seed": 42  # For reproducibility
                }
            )
            
            logger.info("IDM-VTON API response received")
            
            # Output can be a URL string or a FileOutput object
            if not output:
                raise Exception("No output from IDM-VTON")
            
            # Handle different output types
            output_url = None
            if isinstance(output, str):
                output_url = output
            elif hasattr(output, 'url'):
                output_url = output.url
            elif hasattr(output, '__iter__'):
                # Output might be a list/iterator
                output_list = list(output)
                if output_list:
                    first_item = output_list[0]
                    if isinstance(first_item, str):
                        output_url = first_item
                    elif hasattr(first_item, 'url'):
                        output_url = first_item.url
            
            if not output_url:
                raise Exception(f"Could not extract URL from output: {type(output)}")
            
            logger.info(f"Downloading result from: {output_url}")
            
            # Download the result image
            async with aiohttp.ClientSession() as session:
                async with session.get(str(output_url)) as response:
                    if response.status != 200:
                        raise Exception(f"Failed to download result: HTTP {response.status}")
                    
                    image_bytes = await response.read()
            
            # Convert to base64
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')
            
            logger.info("Virtual try-on image generated successfully with IDM-VTON")
            
            return image_base64
        
        except Exception as e:
            logger.error(f"IDM-VTON generation failed: {e}", exc_info=True)
            
            # Handle specific errors
            if "REPLICATE_API_TOKEN" in str(e):
                raise Exception("Replicate API token not configured. Please set REPLICATE_API_TOKEN in .env")
            
            raise Exception(f"Failed to generate try-on image with IDM-VTON: {str(e)}")
        
        finally:
            # Clean up temporary files
            if temp_dir and os.path.exists(temp_dir):
                import shutil
                shutil.rmtree(temp_dir)
                logger.debug(f"Cleaned up temp directory: {temp_dir}")
