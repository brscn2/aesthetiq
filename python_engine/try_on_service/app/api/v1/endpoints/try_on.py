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

        logger.info(
            f"Generating try-on for user {user_id or 'unknown'} with {len(items)} items"
        )

        def get_image_url(item: TryOnItem) -> Optional[str]:
            return item.processedImageUrl or item.imageUrl

        def build_description(item: TryOnItem) -> str:
            description_parts = []
            if item.color:
                description_parts.append(item.color)
            elif item.colors and len(item.colors) > 0:
                description_parts.append(item.colors[0])

            if item.material:
                description_parts.append(item.material)

            if item.subCategory:
                description_parts.append(item.subCategory)
            elif item.name:
                description_parts.append(item.name)
            elif item.category:
                description_parts.append(item.category.lower())

            return " ".join(description_parts) if description_parts else "clothing item"

        top_item = None
        bottom_item = None
        dress_item = None

        for item in items.values():
            category = (item.category or "").upper()
            if category in ["DRESS", "DRESSES", "FULL_BODY"] and not dress_item:
                dress_item = item
            elif category in ["TOP", "OUTERWEAR"] and not top_item:
                top_item = item
            elif category in ["BOTTOM", "PANTS", "SHORTS", "SKIRT"] and not bottom_item:
                bottom_item = item

        if not any([top_item, bottom_item, dress_item]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid clothing items found",
            )

        image_base64 = None

        if dress_item:
            dress_url = get_image_url(dress_item)
            if not dress_url:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No valid dress image URL found",
                )

            logger.info("Calling IDM-VTON for dress")
            image_base64 = await idm_vton_service.generate_try_on(
                user_photo_url=user_photo_url,
                clothing_image_urls=[dress_url],
                prompt=build_description(dress_item),
                category="dresses",
            )
        else:
            if top_item:
                top_url = get_image_url(top_item)
                if not top_url:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="No valid top image URL found",
                    )

                logger.info("Calling IDM-VTON for upper body")
                image_base64 = await idm_vton_service.generate_try_on(
                    user_photo_url=user_photo_url,
                    clothing_image_urls=[top_url],
                    prompt=build_description(top_item),
                    category="upper_body",
                )

            if bottom_item:
                bottom_url = get_image_url(bottom_item)
                if not bottom_url:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="No valid bottom image URL found",
                    )

                logger.info("Calling IDM-VTON for lower body")
                base_image = user_photo_url
                if image_base64:
                    base_image = f"data:image/png;base64,{image_base64}"

                image_base64 = await idm_vton_service.generate_try_on(
                    user_photo_url=base_image,
                    clothing_image_urls=[bottom_url],
                    prompt=build_description(bottom_item),
                    category="lower_body",
                )

        logger.info("Try-on generation successful")

        return {
            "success": True,
            "image_base64": image_base64,
            "metadata": {
                "item_count": len(items),
                "categories": list(items.keys()),
                "user_id": user_id,
            },
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Try-on generation failed: {e}", exc_info=True)

        return {"success": False, "error": str(e)}
