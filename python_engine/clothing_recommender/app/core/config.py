"""Clothing Recommender application configuration."""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache
from typing import Optional, Union


class Settings(BaseSettings):
    """Clothing Recommender settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "Aesthetiq Clothing Recommender"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # API
    API_V1_PREFIX: str = "/api/v1"
    
    # CORS (internal service, called via gateway)
    # Reasoning: This service is not exposed publicly in docker-compose.
    # Keep a sane default allowlist for local development.
    ALLOWED_ORIGINS: Union[list[str], str] = ["http://localhost:3000", "http://localhost:5173"]
    
    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v):
        """Parse comma-separated origins string into list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    # LLM Services
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    AZURE_OPENAI_API_KEY: Optional[str] = None
    AZURE_OPENAI_ENDPOINT: Optional[str] = None
    
    # LLM Configuration
    LLM_PROVIDER: str = "openai"
    LLM_MODEL: str = "gpt-4o-mini"
    
    # Langfuse (Observability)
    LANGFUSE_PUBLIC_KEY: Optional[str] = None
    LANGFUSE_SECRET_KEY: Optional[str] = None
    LANGFUSE_HOST: str = "https://cloud.langfuse.com"
    
    # Database
    MONGODB_URL: Optional[str] = None
    MONGODB_DB_NAME: str = "aesthetiq"
    
    # HuggingFace (for embeddings)
    HUGGINGFACE_API_KEY: Optional[str] = None
    
    # Redis Cache (Future)
    REDIS_URL: Optional[str] = None
    CACHE_TTL: int = 3600

    # Chat logging (development/analytics)
    # Reasoning: Persisting raw conversation text can store PII. Default is off.
    ENABLE_CHAT_LOGGING: bool = False
    CHAT_LOG_FILE: str = "logs/chat_history.jsonl"
    CHAT_LOG_REDACT_CONTENT: bool = True
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "console"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8002
    
    # ==========================================================================
    # Recommender Agent Settings
    # ==========================================================================
    
    # Search Configuration
    RECOMMENDER_SEARCH_LIMIT: int = 20          # Max items to fetch per search
    RECOMMENDER_MIN_RESULTS: int = 3            # Minimum valid results before stopping
    RECOMMENDER_MAX_ITERATIONS: int = 3         # Max search attempts (verification loops)
    RECOMMENDER_NUM_CANDIDATES: int = 100       # Vector search candidates (before limit)
    
    # MongoDB Collections
    MONGODB_WARDROBE_COLLECTION: str = "wardrobe"
    MONGODB_STYLE_PROFILES_COLLECTION: str = "styleprofiles"
    
    # Vector Search
    MONGODB_VECTOR_INDEX_NAME: str = "vector"
    MONGODB_EMBEDDING_FIELD: str = "embedding"
    EMBEDDING_DIMENSION: int = 512
    
    # Embedding Service
    EMBEDDING_SERVICE_URL: str = "http://embedding_service:8004"
    EMBEDDING_SERVICE_TIMEOUT: float = 30.0     # Timeout in seconds
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Singleton instance for easy import
settings = get_settings()
