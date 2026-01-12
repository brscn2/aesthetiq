"""Clothing Recommender Service - LLM/Agents for fashion recommendations.

Design notes / reasoning:
- This service is intended to be called by the internal gateway.
- We build long-lived singletons (LLM client, workflow) once at startup to
    avoid per-request overhead and accidental duplicate initialization.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logger import get_logger
from app.api.v1.router import api_router
from app.services.llm.langchain_service import LangChainService
from app.services.llm.langgraph_service import LangGraphService
from app.agents.conversational_agent import ConversationalAgent
from app.agents.recommender import RecommenderGraph
from app.services.embedding_client import get_embedding_client, close_embedding_client
from app.services.mongodb.connection import close_connection as close_mongodb

logger = get_logger(__name__)

# Global service instances
llm_service: LangChainService = None
langgraph_service: LangGraphService = None
conversational_agent: ConversationalAgent = None
recommender_graph: RecommenderGraph = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan - startup and shutdown events."""
    global llm_service, langgraph_service, conversational_agent, recommender_graph
    
    logger.info("Starting Clothing Recommender Service...")
    
    # Initialize shared services once.
    # Reasoning: creating these per request is expensive and complicates tracing.
    llm_service = LangChainService(provider=settings.LLM_PROVIDER, model=settings.LLM_MODEL)
    logger.info("LangChain service initialized")
    
    # Initialize recommender graph first (will be shared with LangGraphService)
    recommender_graph = RecommenderGraph(llm_service=llm_service)
    logger.info("Recommender graph initialized")
    
    # Initialize LangGraph service with shared recommender graph
    langgraph_service = LangGraphService(llm_service, recommender_graph=recommender_graph)
    logger.info("LangGraph service initialized")
    
    # Initialize conversational agent using the pre-built services.
    conversational_agent = ConversationalAgent(
        llm_service=llm_service,
        langgraph_service=langgraph_service,
    )
    logger.info("Conversational agent initialized")
    
    # Store in app state for access in routes
    app.state.llm_service = llm_service
    app.state.langgraph_service = langgraph_service
    app.state.conversational_agent = conversational_agent
    app.state.recommender_graph = recommender_graph
    
    logger.info("Clothing Recommender Service startup complete")
    
    yield
    
    # Cleanup on shutdown
    logger.info("Shutting down Clothing Recommender Service...")
    await close_embedding_client()
    await close_mongodb()
    logger.info("Cleanup complete")


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
        allow_origins=settings.ALLOWED_ORIGINS,
        # Reasoning: internal service; do not enable credentialed wildcard CORS.
        allow_credentials=False,
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
