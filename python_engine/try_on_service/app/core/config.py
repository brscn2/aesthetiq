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
    
    # OpenAI Configuration
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-image-1.5"
    OPENAI_INPUT_FIDELITY: str = "high"
    OPENAI_QUALITY: str = "low"
    OPENAI_RESPONSE_FORMAT: str = "b64_json"
    
    # Replicate Configuration (IDM-VTON)
    REPLICATE_API_TOKEN: str = ""  # Optional: Leave empty to use OpenAI
    USE_IDM_VTON: bool = False  # Set to True to use IDM-VTON instead of OpenAI
    IDM_VTON_MODEL: str = "cuuupid/idm-vton:c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4"
    
    # Masking Configuration
    USE_MASKING: bool = True
    MASK_FACE_PROTECTION: bool = True
    MASK_BACKGROUND_PROTECTION: bool = True
    MASK_FACE_HEIGHT_RATIO: float = 0.25  # Face area: top 25% of image
    MASK_EDGE_MARGIN_RATIO: float = 0.05  # Background edge: 5% margin
    MASK_HANDS_HEIGHT_RATIO: float = 0.15  # Hands area: bottom 15%
    
    # MediaPipe Segmentation
    USE_MEDIAPIPE: bool = True  # Use MediaPipe instead of heuristic masking
    MEDIAPIPE_MODEL_SELECTION: int = 1  # 0=general (faster), 1=landscape (better quality for full-body)
    MEDIAPIPE_SEGMENTATION_THRESHOLD: float = 0.3  # Lower threshold = more person pixels detected
    
    # Image Processing
    MAX_IMAGE_SIZE_MB: int = 10
    TEMP_DIR: str = "/tmp/try_on_images"
    
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
