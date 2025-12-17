"""
FastAPI application entry point.

This is the main application file for the Aesthetiq Python Engine.
It includes both legacy face analysis endpoints and new conversational agent endpoints.
"""
import uvicorn
import sys
import os
import torch
from contextlib import asynccontextmanager

# Add the parent directory (python_engine) to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
import shutil
import tempfile

# Import new modules
from app.core.config import get_settings
from app.core.logger import get_logger
from app.api.v1.router import api_router
from app.api.v1.endpoints import face_analysis

# Initialize settings and logger
settings = get_settings()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler for startup and shutdown events.
    
    Handles:
        - Model loading on startup
        - Resource cleanup on shutdown
        - Database connections
        - Cache initialization
    """
    # Startup
    logger.info("Starting Aesthetiq Python Engine")
    
    # Initialize face analysis service (ML models)
    try:
        base_path = parent_dir
        face_analysis.initialize_service(
            segmentation_weights=os.path.join(base_path, "weights/resnet18.pt"),
            model_path=os.path.join(base_path, "weights/season_resnet18.pth"),
            device="cuda" if torch.cuda.is_available() else "cpu"
        )
    except Exception as e:
        logger.error(f"Failed to initialize face analysis service: {e}", exc_info=True)
    
    # TODO: Initialize other services
    # - Database connections
    # - Cache connections
    # - LLM service warmup
    
    logger.info("Application startup complete")
    
    yield
    
    # Shutdown
    logger.info("Shutting down application")
    # TODO: Cleanup resources
    # - Close database connections
    # - Close cache connections
    # - Save any pending data


# Create FastAPI app with configuration
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered fashion and style analysis platform",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

# Include API routers
app.include_router(
    api_router,
    prefix=settings.API_V1_PREFIX
)

# Legacy endpoints (keeping for backward compatibility)
@app.get("/health")
def legacy_health_check():
    """
    Legacy health check endpoint.
    
    Deprecated: Use /api/v1/health instead
    """
    # Check if face analysis service is initialized
    service_status = "ready" if face_analysis.face_analysis_service else "loading_failed"
    return {"status": service_status}


@app.get("/ready")
def legacy_ready_check():
    """
    Legacy readiness check endpoint.
    
    Redirects to /api/v1/ready for compatibility
    """
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/api/v1/ready")
    

@app.post("/analyze")
async def legacy_analyze_face(file: UploadFile = File(...)):
    """
    Legacy face analysis endpoint.
    
    Deprecated: Use /api/v1/ml/analyze-face instead
    
    Analyzes uploaded face image for color season and face shape attributes.
    Maintained for backward compatibility with existing clients.
    """
    # Redirect to new endpoint implementation
    return await face_analysis.analyze_face_legacy(file)


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "endpoints": {
            "health": "/api/v1/health",
            "agent_chat": "/api/v1/agent/chat",
            "face_analysis": "/api/v1/ml/analyze-face",
            "legacy_health": "/health (deprecated)",
            "legacy_analyze": "/analyze (deprecated)"
        }
    }


if __name__ == "__main__":
    # Azure App Service provides PORT environment variable
    # Default to 8000 for local development
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    
    # Run with uvicorn
    # For production, use: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
