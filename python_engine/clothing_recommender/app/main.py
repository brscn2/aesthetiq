"""Clothing Recommender Service - LLM/Agents for fashion recommendations."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logger import get_logger
from app.api.v1.router import api_router
from app.services.llm.langchain_service import LangChainService
from app.services.llm.langgraph_service import LangGraphService
from app.agents.conversational_agent import ConversationalAgent

logger = get_logger(__name__)

# Global service instances
llm_service: LangChainService = None
langgraph_service: LangGraphService = None
conversational_agent: ConversationalAgent = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan - startup and shutdown events."""
    global llm_service, langgraph_service, conversational_agent
    
    logger.info("Starting Clothing Recommender Service...")
    
    # Initialize LLM service
    llm_service = LangChainService()
    logger.info("LangChain service initialized")
    
    # Initialize LangGraph service
    langgraph_service = LangGraphService(llm_service)
    logger.info("LangGraph service initialized")
    
    # Initialize conversational agent
    conversational_agent = ConversationalAgent()
    logger.info("Conversational agent initialized")
    
    # Store in app state for access in routes
    app.state.llm_service = llm_service
    app.state.langgraph_service = langgraph_service
    app.state.conversational_agent = conversational_agent
    
    logger.info("Clothing Recommender Service startup complete")
    
    yield
    
    # Cleanup on shutdown
    logger.info("Shutting down Clothing Recommender Service...")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Clothing Recommender Service",
        description="LLM-powered fashion recommendation and conversational agent",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )
    
    # CORS middleware - internal service, but allows gateway access
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Gateway will handle external CORS
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include API routes
    app.include_router(api_router, prefix="/api/v1")
    
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8002,
        reload=settings.DEBUG,
        log_level="debug" if settings.DEBUG else "info",
    )
