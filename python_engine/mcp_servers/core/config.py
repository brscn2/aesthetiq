"""MCP Servers application configuration."""

from functools import lru_cache
from typing import Optional, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Settings loaded from environment variables."""

    # Application
    APP_NAME: str = "Aesthetiq MCP Servers"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # API
    API_PREFIX: str = "/mcp"

    # CORS (internal service, called via gateway/agent)
    ALLOWED_ORIGINS: Union[list[str], str] = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    # Mongo
    MONGODB_URI: Optional[str] = None
    MONGODB_DB_NAME: str = "test"  # Base database name (can be overridden via env)
    MONGODB_DB_WARDROBE: Optional[str] = None  # Defaults to MONGODB_DB_NAME if not set
    MONGODB_DB_COMMERCE: Optional[str] = None  # Defaults to MONGODB_DB_NAME if not set
    MONGODB_DB_USERS: Optional[str] = None  # Defaults to MONGODB_DB_NAME if not set
    MONGODB_DB_STYLE: Optional[str] = None  # Defaults to MONGODB_DB_NAME if not set
    MONGODB_DB_COLOR_ANALYSIS: Optional[str] = (
        None  # Defaults to MONGODB_DB_NAME if not set
    )

    def model_post_init(self, __context):
        """Set default database names from MONGODB_DB_NAME if not explicitly set."""
        if self.MONGODB_DB_WARDROBE is None:
            self.MONGODB_DB_WARDROBE = self.MONGODB_DB_NAME
        if self.MONGODB_DB_COMMERCE is None:
            self.MONGODB_DB_COMMERCE = self.MONGODB_DB_NAME
        if self.MONGODB_DB_USERS is None:
            self.MONGODB_DB_USERS = self.MONGODB_DB_NAME
        if self.MONGODB_DB_STYLE is None:
            self.MONGODB_DB_STYLE = self.MONGODB_DB_NAME
        if self.MONGODB_DB_COLOR_ANALYSIS is None:
            self.MONGODB_DB_COLOR_ANALYSIS = self.MONGODB_DB_NAME

    # Matches NestJS WardrobeItem model collection name
    # (backend `WardrobeItem` model → Mongo collection `wardrobeitems`)
    MONGODB_COLLECTION_WARDROBE: str = "wardrobeitems"
    # Matches NestJS CommerceItem model collection name
    # (backend `CommerceItem` model → Mongo collection `commerceitems`)
    MONGODB_COLLECTION_COMMERCE: str = "commerceitems"
    # Retail items collection (for crawler-scraped items)
    MONGODB_COLLECTION_RETAIL: str = "retailitems"
    # Matches NestJS User model collection name
    # (backend `User` model → Mongo collection `users`)
    MONGODB_COLLECTION_USERS: str = "users"
    # Matches NestJS style profile collection name
    # (backend `StyleProfile` model → Mongo collection `styleprofiles`)
    MONGODB_COLLECTION_STYLE: str = "styleprofiles"
    # Matches NestJS color analysis collection name
    # (backend `ColorAnalysis` model → Mongo collection `coloranalyses`)
    MONGODB_COLLECTION_COLOR_ANALYSIS: str = "coloranalyses"

    # Embedding service (default to localhost for local dev, override to embedding_service:8004 for Docker)
    EMBEDDING_SERVICE_URL: str = "http://localhost:8004"

    # Google Custom Search API
    GOOGLE_API_KEY: Optional[str] = None
    GOOGLE_CX: Optional[str] = None  # Custom Search Engine ID

    # Crawler service
    CRAWLER_TARGET_URLS_PATH: Optional[str] = None  # Path to target URLs YAML file
    CACHE_FRESHNESS_DAYS: int = 30  # Days for cache freshness threshold
    ENABLE_RETAILITEMS_FALLBACK: bool = (
        False  # Enable fallback to retailitems if commerceitems empty
    )

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8010

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance. Clear cache if config changes."""
    return Settings()


def clear_settings_cache():
    """Clear the settings cache to force reload."""
    get_settings.cache_clear()
