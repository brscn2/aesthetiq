"""Virtual Try-On API endpoints."""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

from app.services.idm_vton_service import IDMVTONService
from app.core.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()

# Initialize service
idm_vton_service = IDMVTONService()


class TryOnItem(BaseModel):
    """Clothing item for try-on."""
    imageUrl: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    subCategory: Optional[str] = None
    colorHex: Optional[str] = None
    color: Optional[str] = None
    colors: Optional[list[str]] = None
    material: Optional[str] = None
    brand: Optional[str] = None
    notes: Optional[str] = None
    processedImageUrl: Optional[str] = None
    description: Optional[str] = None
    id: Optional[str] = None
    
    class Config:
        extra = "allow"  # Allow extra fields


class TryOnRequest(BaseModel):
    """Request model for virtual try-on generation."""
    userPhotoUrl: str = Field(..., description="URL to the user's photo")
    items: Dict[str, TryOnItem] = Field(..., description="Clothing items by category")
    userId: Optional[str] = Field(None, description="User ID for tracking")


class TryOnResponse(BaseModel):
    """Response model for virtual try-on generation."""
    success: bool = Field(..., description="Whether the generation was successful")
    image_base64: Optional[str] = Field(None, description="Base64 encoded try-on image")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    error: Optional[str] = Field(None, description="Error message if failed")


@router.post("/generate")
async def generate_try_on(try_on_request: TryOnRequest):
    """
    Generate a virtual try-on image using IDM-VTON.
    
    This endpoint takes a user photo and clothing items, then uses IDM-VTON
    to generate a photorealistic image of the person wearing the selected clothing.
    """
    try:
        logger.info(f"=== TRY-ON REQUEST ===")
        logger.info(f"User Photo URL: {try_on_request.userPhotoUrl}")
        logger.info(f"Items: {try_on_request.items}")
        logger.info(f"User ID: {try_on_request.userId}")
        logger.info(f"=== END REQUEST ===")
        
        user_photo_url = try_on_request.userPhotoUrl
        items = try_on_request.items
        user_id = try_on_request.userId
        
        logger.info(f"Generating try-on for user {user_id or 'unknown'} with {len(items)} items")
        
        # Extract clothing image URLs
        clothing_image_urls = []
        for item in items.values():
            # Prefer processedImageUrl for WardrobeItems, otherwise use imageUrl
            image_url = item.processedImageUrl or item.imageUrl
            if image_url:
                clothing_image_urls.append(image_url)
        
        if not clothing_image_urls:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid clothing image URLs found"
            )
        
        # Build simple description for IDM-VTON
        first_item = list(items.values())[0]
        description_parts = []
        
        # Handle color (StyleItem has color/colorHex, WardrobeItem has colors array)
        if first_item.color:
            description_parts.append(first_item.color)
        elif first_item.colors and len(first_item.colors) > 0:
            description_parts.append(first_item.colors[0])
        
        # Handle material
        if first_item.material:
            description_parts.append(first_item.material)
        
        # Handle name/category
        if first_item.subCategory:
            description_parts.append(first_item.subCategory)
        elif first_item.name:
            description_parts.append(first_item.name)
        elif first_item.category:
            description_parts.append(first_item.category.lower())
        
        garment_description = ' '.join(description_parts) if description_parts else "clothing item"
        
        logger.info(f"Calling IDM-VTON with {len(clothing_image_urls)} clothing items")
        
        # Generate try-on image
        image_base64 = await idm_vton_service.generate_try_on(
            user_photo_url=user_photo_url,
            clothing_image_urls=clothing_image_urls,
            prompt=garment_description
        )
        
        logger.info("Try-on generation successful")
        
        return {
            "success": True,
            "image_base64": image_base64,
            "metadata": {
                "item_count": len(items),
                "categories": list(items.keys()),
                "user_id": user_id,
            }
        }
    
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"Try-on generation failed: {e}", exc_info=True)
        
        return {
            "success": False,
            "error": str(e)
        }
