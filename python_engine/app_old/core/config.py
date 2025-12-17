"""Application configuration management."""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache
from typing import Optional, Union


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "Aesthetiq Python Engine"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # API
    API_V1_PREFIX: str = "/api/v1"
    
    # CORS
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
    LLM_PROVIDER: str = "openai"  # openai, anthropic, azure
    LLM_MODEL: str = "gpt-4o-mini"  # gpt-4, gpt-4o, gpt-4o-mini, gpt-3.5-turbo, etc.
    
    # Langfuse (Observability)
    LANGFUSE_PUBLIC_KEY: Optional[str] = None
    LANGFUSE_SECRET_KEY: Optional[str] = None
    LANGFUSE_HOST: str = "https://cloud.langfuse.com"  # Also accepts LANGFUSE_BASE_URL
    
    # Database (Future)
    MONGODB_URL: Optional[str] = None
    MONGODB_DB_NAME: str = "aesthetiq"
    
    # Azure Services (Future)
    AZURE_STORAGE_CONNECTION_STRING: Optional[str] = None
    AZURE_STORAGE_CONTAINER_NAME: Optional[str] = None
    
    # Redis Cache (Future)
    REDIS_URL: Optional[str] = None
    CACHE_TTL: int = 3600  # 1 hour
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"  # or "console"
    
    # Server (for uvicorn)
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields in .env


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
