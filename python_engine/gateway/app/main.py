"""
Gateway FastAPI application entry point.

This is a thin reverse proxy that routes requests to internal services:
- /api/v1/ml/* → fashion_expert service
- /api/v1/agent/* → clothing_recommender service
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.proxy import proxy
from app.routes import health, ml, agent

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info("Starting Aesthetiq Gateway")
    yield
    logger.info("Shutting down Aesthetiq Gateway")
    await proxy.close()


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="API Gateway for Aesthetiq - Routes requests to internal microservices",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["health"])
app.include_router(ml.router, prefix=f"{settings.API_V1_PREFIX}/ml", tags=["machine-learning"])
app.include_router(agent.router, prefix=f"{settings.API_V1_PREFIX}/agent", tags=["conversational-agent"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs"
    }
