"""Virtual Try-On API endpoints."""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

from app.services.try_on_service import TryOnService
from app.core.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()

# Initialize service
try_on_service = TryOnService()


class TryOnItem(BaseModel):
    """Clothing item for try-on."""
    imageUrl: str = Field(..., description="URL to the clothing item image")
    name: str = Field(..., description="Name of the clothing item")
    category: str = Field(..., description="Category (TOP, BOTTOM, SHOE, ACCESSORY)")
    subCategory: Optional[str] = Field(None, description="Sub-category")
    colorHex: Optional[str] = Field(None, description="Primary color hex code")
    color: Optional[str] = Field(None, description="Color name")
    material: Optional[str] = Field(None, description="Material")


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


@router.post("/generate", response_model=TryOnResponse)
async def generate_try_on(request: TryOnRequest):
    """
    Generate a virtual try-on image using IDM-VTON.
    
    This endpoint takes a user photo and clothing items, then uses IDM-VTON
    to generate a photorealistic image of the person wearing the selected clothing.
    """
    try:
        # Validate input
        if not request.userPhotoUrl:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User photo URL is required"
            )
        
        if not request.items or len(request.items) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one clothing item is required"
            )
        
        logger.info(
            f"Generating try-on for user {request.userId or 'unknown'} "
            f"with {len(request.items)} items"
        )
        
        # Extract clothing image URLs
        clothing_image_urls = [item.imageUrl for item in request.items.values()]
        
        # Build simple description for IDM-VTON
        first_item = list(request.items.values())[0]
        description_parts = []
        if first_item.color:
            description_parts.append(first_item.color)
        if first_item.material:
            description_parts.append(first_item.material)
        if first_item.subCategory:
            description_parts.append(first_item.subCategory)
        elif first_item.name:
            description_parts.append(first_item.name)
        
        garment_description = ' '.join(description_parts) if description_parts else "clothing item"
        
        logger.info(f"Calling IDM-VTON with {len(clothing_image_urls)} clothing items")
        
        # Generate try-on image
        image_base64 = await try_on_service.generate_try_on(
            user_photo_url=request.userPhotoUrl,
            clothing_image_urls=clothing_image_urls,
            prompt=garment_description
        )
        
        logger.info("Try-on generation successful")
        
        return TryOnResponse(
            success=True,
            image_base64=image_base64,
            metadata={
                "item_count": len(request.items),
                "categories": list(request.items.keys()),
                "user_id": request.userId,
            }
        )
    
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"Try-on generation failed: {e}", exc_info=True)
        
        return TryOnResponse(
            success=False,
            error=str(e)
        )
