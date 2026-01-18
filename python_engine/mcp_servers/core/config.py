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
    ALLOWED_ORIGINS: Union[list[str], str] = ["http://localhost:3000", "http://localhost:5173"]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    # Mongo
    MONGODB_URI: Optional[str] = None
    MONGODB_DB_WARDROBE: str = "aesthetiq"
    MONGODB_DB_COMMERCE: str = "aesthetiq"
    MONGODB_DB_USERS: str = "aesthetiq"
    MONGODB_DB_STYLE: str = "aesthetiq"
    MONGODB_DB_COLOR_ANALYSIS: str = "aesthetiq"

    # Matches NestJS WardrobeItem model collection name
    # (backend `WardrobeItem` model → Mongo collection `wardrobeitems`)
    MONGODB_COLLECTION_WARDROBE: str = "wardrobeitems"
    # Matches NestJS CommerceItem model collection name
    # (backend `CommerceItem` model → Mongo collection `commerceitems`)
    MONGODB_COLLECTION_COMMERCE: str = "commerceitems"
    # Matches NestJS User model collection name
    # (backend `User` model → Mongo collection `users`)
    MONGODB_COLLECTION_USERS: str = "users"
    # Matches NestJS style profile collection name
    # (backend `StyleProfile` model → Mongo collection `styleprofiles`)
    MONGODB_COLLECTION_STYLE: str = "styleprofiles"
    # Matches NestJS color analysis collection name
    # (backend `ColorAnalysis` model → Mongo collection `coloranalyses`)
    MONGODB_COLLECTION_COLOR_ANALYSIS: str = "coloranalyses"

    # Embedding service
    EMBEDDING_SERVICE_URL: str = "http://embedding_service:8004"

    # Web search
    TAVILY_API_KEY: Optional[str] = None
    TAVILY_BASE_URL: str = "https://api.tavily.com"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8010

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()

