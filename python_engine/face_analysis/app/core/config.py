"""Face Analysis application configuration."""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache
from typing import Optional, Union


class Settings(BaseSettings):
    """Face Analysis settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "Aesthetiq Face Analysis"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # API
    API_V1_PREFIX: str = "/api/v1"
    
    # CORS (internal service, but keep for flexibility)
    ALLOWED_ORIGINS: Union[list[str], str] = ["*"]
    
    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v):
        """Parse comma-separated origins string into list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    # ML Configuration
    DEVICE: str = "cpu"  # cuda, cpu, mps
    WEIGHTS_DIR: str = "weights"
    
    # Azure Storage (Future - for image storage)
    AZURE_STORAGE_CONNECTION_STRING: Optional[str] = None
    AZURE_STORAGE_CONTAINER_NAME: Optional[str] = None
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "console"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
