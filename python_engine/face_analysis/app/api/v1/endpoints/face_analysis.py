"""Face analysis endpoint for color season and face shape detection."""
import time
from fastapi import APIRouter, File, UploadFile, HTTPException, status
from PIL import Image
import io

import os
import shutil
import tempfile

from app.core.logger import get_logger
from app.schemas.responses import FaceAnalysisResponse
from app.services.face_analysis_service import FaceAnalysisService

router = APIRouter()
logger = get_logger(__name__)

# Initialize service (singleton pattern - loaded once at module import)
# This will be properly initialized in the main.py lifespan handler
face_analysis_service = None


def get_face_analysis_service() -> FaceAnalysisService:
    """
    Get the face analysis service instance.
    
    Returns:
        FaceAnalysisService instance
        
    Raises:
        HTTPException: If service is not initialized
    """
    if face_analysis_service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Face analysis service not initialized"
        )
    return face_analysis_service


@router.post("/analyze-face", response_model=FaceAnalysisResponse, status_code=status.HTTP_200_OK)
async def analyze_face(file: UploadFile = File(...)):
    """
    Analyze a face image for color season and face shape.
    
    Upload an image file containing a face, and receive:
    - Face shape classification (Oval, Round, Square, etc.)
    - Color season/palette (Warm Spring, Cool Summer, etc.)
    - Confidence scores for all predictions
    
    Args:
        file: Image file upload (JPEG, PNG, etc.)
        
    Returns:
        FaceAnalysisResponse with detection results
        
    Raises:
        HTTPException: If analysis fails or service unavailable
    """
    start_time = time.time()
    
    try:
        service = get_face_analysis_service()
        
        # Validate file type
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type: {file.content_type}. Must be an image."
            )
        
        logger.info(
            f"Processing face analysis request",
            extra={
                "uploaded_filename": file.filename,
                "content_type": file.content_type
            }
        )
        
        # Read image from upload
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data)).convert("RGB")
        
        # Process the image off the event loop.
        # Reasoning: preprocessing + model inference are CPU/GPU-bound and would otherwise
        # block the async server, reducing concurrency.
        result = await service.process_image_async(image)
        
        # Check for errors
        if "error" in result:
            logger.error(f"Analysis failed: {result['error']}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        # Calculate processing time
        processing_time = (time.time() - start_time) * 1000  # Convert to ms
        result["processing_time_ms"] = processing_time
        
        logger.info(
            f"Analysis complete",
            extra={
                "face_shape": result["face_shape"],
                "palette": result["palette"],
                "processing_time_ms": processing_time
            }
        )
        
        return FaceAnalysisResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in face analysis: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process image: {str(e)}"
        )


@router.post("/analyze-face-legacy", status_code=status.HTTP_200_OK)
async def analyze_face_legacy(file: UploadFile = File(...)):
    """
    Legacy face analysis endpoint (maintains backward compatibility).
    
    This endpoint matches the original /analyze behavior with temporary file handling.
    Use /analyze-face for the new, optimized version.
    
    Args:
        file: Image file upload
        
    Returns:
        Raw dictionary with analysis results
    """
    try:
        service = get_face_analysis_service()
        
        # Save uploaded file temporarily (legacy behavior)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        try:
            # Run analysis with file path
            result = service.process_image(tmp_path)
            
            # Cleanup
            os.remove(tmp_path)
            
            if "error" in result:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=result["error"]
                )
                 
            return result
            
        except Exception as e:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
            raise
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in legacy face analysis: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


def initialize_service(
    segmentation_weights: str = "weights/resnet18.pt",
    model_path: str = "weights/season_resnet18.pth",
    device: str = "cuda"
):
    """
    Initialize the face analysis service.
    
    This should be called from main.py during application startup.
    
    Args:
        segmentation_weights: Path to segmentation weights
        model_path: Path to ResNet model
        device: Device to use (cuda/cpu/mps)
    """
    global face_analysis_service
    
    try:
        face_analysis_service = FaceAnalysisService(
            segmentation_weights=segmentation_weights,
            model_path=model_path,
            device=device
        )
        logger.info(f"Face analysis service initialized on {device}")
    except Exception as e:
        logger.error(f"Failed to initialize face analysis service: {e}", exc_info=True)
        raise
