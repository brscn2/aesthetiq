"""
Face Analysis FastAPI application entry point.

This service handles ML/Computer Vision analysis:
- Face detection and preprocessing
- Face shape classification
- Color season analysis
"""
import os
import torch
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.core.config import get_settings
from app.core.logger import get_logger
from app.api.v1.router import api_router
from app.api.v1.endpoints import face_analysis

settings = get_settings()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown events."""
    # Startup
    logger.info("Starting Face Analysis Service")
    logger.info(f"Device configuration: {settings.DEVICE}")
    
    # Initialize face analysis service (ML models)
    initialization_successful = False
    try:
        base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        weights_dir = os.environ.get("WEIGHTS_DIR", os.path.join(base_path, "weights"))
        
        logger.info(f"Loading models from weights directory: {weights_dir}")
        logger.info("Step 1/2: Initializing face analysis service...")
        
        face_analysis.initialize_service(
            segmentation_weights=os.path.join(weights_dir, "resnet18.pt"),
            model_path=os.path.join(weights_dir, "season_resnet18.pth"),
            # Reasoning: The service implementation selects the best device available
            # (e.g. MPS on Apple Silicon). We pass the configured preference here.
            device=settings.DEVICE
        )
        
        # Verify service was initialized
        from app.api.v1.endpoints import face_analysis as face_analysis_module
        if face_analysis_module.face_analysis_service is None:
            logger.error("Service initialization returned None - initialization may have failed silently")
            raise RuntimeError("Face analysis service initialization returned None")
        
        # Check if ResNet model loaded (required)
        service = face_analysis_module.face_analysis_service
        if not hasattr(service, 'resnet') or service.resnet is None:
            logger.error("ResNet model failed to load - service will be unhealthy")
            raise RuntimeError("ResNet model (required) failed to load")
        
        initialization_successful = True
        logger.info("Step 2/2: Face analysis service initialized successfully")
        
        # Log model status
        has_face_shape = hasattr(service, 'face_shape_classifier') and service.face_shape_classifier is not None
        logger.info(
            f"Model status - ResNet: loaded, Face Shape Classifier: {'loaded' if has_face_shape else 'not loaded (optional)'}"
        )
        
    except Exception as e:
        logger.error(
            f"Failed to initialize face analysis service: {e}",
            exc_info=True,
            extra={"error_type": type(e).__name__}
        )
        # Don't raise - allow FastAPI to start so health check can report status
        logger.warning(
            "Service will start but will be marked as unhealthy. "
            "Check logs and model files to resolve initialization issues."
        )
    
    if initialization_successful:
        logger.info("Face Analysis startup complete - service is ready")
    else:
        logger.warning("Face Analysis startup complete with errors - service may be unhealthy")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Face Analysis Service")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="ML/Computer Vision service for face and style analysis",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    # Reasoning: These services are internal-only (called via the gateway).
    # Wildcard origins plus credentials is unsafe/invalid in browsers.
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs"
    }
