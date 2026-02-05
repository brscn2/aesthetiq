"""IDM-VTON Service for Virtual Try-On via Replicate API."""
import os
import base64
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
    
    async def generate_try_on(
        self,
        user_photo_url: str,
        clothing_image_urls: List[str],
        prompt: str,
        category: str = "upper_body"
    ) -> str:
        """
        Generate virtual try-on image using IDM-VTON via Replicate.
        
        IDM-VTON is specifically designed for virtual try-on and preserves
        the person's face perfectly while changing only the clothing.
        
        Args:
            user_photo_url: URL of the user's photo
            clothing_image_urls: List of clothing item image URLs (uses first one)
            prompt: Description of the garment (optional, can be empty)
            category: Clothing category - upper_body, lower_body, or dresses
        
        Returns:
            Base64 encoded image string
        """
        try:
            logger.info(f"User photo URL: {user_photo_url[:50]}...")
            logger.info(f"Clothing image URL: {clothing_image_urls[0][:50]}...")
            logger.info(f"Category: {category}, Prompt: {prompt}")
            
            logger.info("Calling IDM-VTON via Replicate API with direct URLs...")
            
            # Call IDM-VTON via Replicate using URLs directly
            # This is the production-ready approach - no local file downloads needed
            input_dict = {
                "human_img": user_photo_url,
                "garm_img": clothing_image_urls[0],
                "category": category,  # REQUIRED: upper_body, lower_body, dresses
                "garment_des": prompt,  # Garment description
                "steps": 30,  # Number of inference steps (1-40, default 30)
            }
            
            logger.info(f"Calling replicate with model: {settings.IDM_VTON_MODEL}")
            logger.debug(f"Input params: category={category}, steps=30, has_prompt={bool(prompt)}")
            
            try:
                output = replicate.run(
                    settings.IDM_VTON_MODEL,
                    input=input_dict
                )
            except Exception as replicate_error:
                logger.error(f"Replicate API error details: {type(replicate_error).__name__}: {str(replicate_error)}")
                raise
            
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
