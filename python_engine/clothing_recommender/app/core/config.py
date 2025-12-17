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
    
    # Database (Future)
    MONGODB_URL: Optional[str] = None
    MONGODB_DB_NAME: str = "aesthetiq"
    
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
