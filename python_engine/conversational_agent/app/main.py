"""
Conversational Agent FastAPI application entry point.

This service handles multi-agent conversational workflows for fashion assistance.
It uses LangGraph for orchestration and MCP servers for tool calls.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.logger import get_logger
from app.api.v1 import router as api_v1_router
from app.services.backend_client import get_backend_client
from app.services.tracing.langfuse_service import get_tracing_service
from app.mcp.client import get_mcp_manager

# Configure logging
logger = get_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    
    # Initialize services
    tracing_service = get_tracing_service()
    mcp_manager = get_mcp_manager()
    
    # Log configuration
    logger.info(f"Backend URL: {settings.BACKEND_URL}")
    logger.info(f"Langfuse enabled: {tracing_service.enabled}")
    
    yield
    
    # Cleanup
    logger.info(f"Shutting down {settings.APP_NAME}")
    
    # Shutdown services
    tracing_service.shutdown()
    await mcp_manager.disconnect_all()
    
    # Close backend client
    backend_client = get_backend_client()
    await backend_client.close()
    
    logger.info("Shutdown complete")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Multi-agent conversational system for fashion assistance. "
                "Uses LangGraph for orchestration and MCP servers for tool calls.",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(
    api_v1_router,
    prefix=settings.API_V1_PREFIX,
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": f"{settings.API_V1_PREFIX}/health",
    }


# =============================================================================
# Main Entry Point
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
