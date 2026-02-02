"""Gateway configuration management."""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache
from typing import Union


class Settings(BaseSettings):
    """Gateway settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "Aesthetiq Gateway"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # API
    API_V1_PREFIX: str = "/api/v1"
    
    # CORS
    ALLOWED_ORIGINS: Union[list[str], str] = ["http://localhost:3000"]
    
    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v):
        """Parse comma-separated origins string into list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    # Internal service URLs
    FACE_ANALYSIS_URL: str = "http://face_analysis:8001"
    CLOTHING_RECOMMENDER_URL: str = "http://clothing_recommender:8002"
    EMBEDDING_SERVICE_URL: str = "http://embedding_service:8004"
    TRY_ON_SERVICE_URL: str = "http://try_on_service:8005/api/v1/try-on"
    
    # Timeouts (seconds) - lenient for agentic workflows
    ML_SERVICE_TIMEOUT: float = 300.0  # 5 min - ML inference can be slow
    LLM_SERVICE_TIMEOUT: float = 600.0  # 10 min - agentic workflows can take time

    # Request limits
    # Reasoning: The gateway currently reads request bodies into memory before proxying.
    # A hard cap prevents accidental/hostile large uploads from exhausting RAM.
    MAX_REQUEST_BODY_BYTES: int = 10 * 1024 * 1024  # 10 MiB
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
