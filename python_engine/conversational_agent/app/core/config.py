"""Conversational Agent application configuration."""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache
from typing import Optional, Union


class Settings(BaseSettings):
    """Conversational Agent settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "Aesthetiq Conversational Agent"
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
    
    # Backend Integration (NestJS)
    BACKEND_URL: str = "http://localhost:3001"
    BACKEND_TIMEOUT: float = 30.0
    
    # LLM Configuration
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"  # Override via .env;
    OPENAI_TEMPERATURE: float = 0.7
    
    # Langfuse Tracing
    LANGFUSE_PUBLIC_KEY: Optional[str] = None
    LANGFUSE_SECRET_KEY: Optional[str] = None
    LANGFUSE_HOST: str = "https://cloud.langfuse.com"
    LANGFUSE_ENABLED: bool = True
    
    # MongoDB (for MCP servers)
    MONGODB_URI: Optional[str] = None
    
    # MCP Configuration
    MCP_SERVERS_URL: str = "http://mcp_servers:8010"
    MCP_RETRY_ATTEMPTS: int = 3
    MCP_RETRY_DELAY: float = 1.0
    MCP_TIMEOUT: float = 30.0
    
    # Workflow Configuration
    MAX_REFINEMENT_ITERATIONS: int = 3
    MAX_CONVERSATION_HISTORY: int = 10
    
    # Guardrails Configuration (Guardrails AI - prompt injection + toxic content detection)
    GUARDRAIL_PROVIDERS: str = "guardrails-ai"
    GUARDRAIL_MAX_INPUT_LENGTH: int = 10000
    GUARDRAIL_MAX_OUTPUT_LENGTH: int = 50000
    GUARDRAILS_AI_THRESHOLD: float = 0.5  # Toxicity threshold (0.0 to 1.0)
    
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
