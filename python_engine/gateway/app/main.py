"""
Gateway FastAPI application entry point.

This is a thin reverse proxy that routes requests to internal services:
- /api/v1/ml/* → face_analysis service
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


@app.middleware("http")
async def enforce_max_request_size(request: "Request", call_next):
    """Reject requests above the configured size limit.

    Reasoning:
    - The gateway forwards requests by first materializing the body (see `ServiceProxy.proxy_request`).
      Without a guard, a single large upload can cause high memory usage or OOM.
    - We check `Content-Length` when available (cheap), then verify after reading
      (covers chunked uploads / missing header).
    """
    from fastapi import status
    from fastapi.responses import JSONResponse

    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > settings.MAX_REQUEST_BODY_BYTES:
                return JSONResponse(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    content={
                        "detail": "Request body too large",
                        "max_bytes": settings.MAX_REQUEST_BODY_BYTES,
                    },
                )
        except ValueError:
            # Ignore invalid header values; we'll enforce the limit after reading the body.
            pass

    body = await request.body()
    if len(body) > settings.MAX_REQUEST_BODY_BYTES:
        return JSONResponse(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            content={
                "detail": "Request body too large",
                "max_bytes": settings.MAX_REQUEST_BODY_BYTES,
            },
        )

    return await call_next(request)

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
