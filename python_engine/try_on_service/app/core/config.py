"""Virtual Try-On Service configuration."""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache
from typing import Union


class Settings(BaseSettings):
    """Try-On Service settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "Aesthetiq Virtual Try-On"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # API
    API_V1_PREFIX: str = "/api/v1"
    
    # CORS (internal service, called via gateway)
    ALLOWED_ORIGINS: Union[list[str], str] = ["http://localhost:3000", "http://localhost:5173"]
    
    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v):
        """Parse comma-separated origins string into list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    # Replicate Configuration (IDM-VTON)
    REPLICATE_API_TOKEN: str
    IDM_VTON_MODEL: str = "cuuupid/idm-vton:c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "console"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8005
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
