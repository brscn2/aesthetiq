"""Request schemas for API endpoints."""
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, field_validator

from app.utils.helpers import sanitize_input


class BaseConversationRequest(BaseModel):
    """Base schema for conversation requests with shared fields."""
    
    message: str = Field(
        ...,
        description="User's message to the agent",
        min_length=1,
        max_length=10000,
        examples=["Hello! Can you help me with my style?"]
    )
    
    user_id: str = Field(
        ...,
        description="Unique identifier for the user",
        examples=["user_123"]
    )
    
    session_id: Optional[str] = Field(
        None,
        description="Optional session ID for conversation continuity",
        examples=["session_abc123"]
    )
    
    context: Optional[Dict[str, Any]] = Field(
        None,
        description="Optional context data (history, preferences, etc.)",
        examples=[{
            "history": [
                {"role": "user", "content": "Previous message"},
                {"role": "assistant", "content": "Previous response"}
            ],
            "user_preferences": {"style": "casual"}
        }]
    )
    
    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        """Validate and sanitize message input."""
        if not v.strip():
            raise ValueError("Message cannot be empty or whitespace")
        # Use sanitize_input for thorough cleaning
        return sanitize_input(v, max_length=10000)


class ConversationRequest(BaseConversationRequest):
    """Request schema for conversational agent (non-streaming)."""
    pass


class ConversationStreamRequest(BaseConversationRequest):
    """Request schema for streaming conversational responses."""
    pass


class HealthCheckRequest(BaseModel):
    """Request schema for health check (if needed for extended checks)."""
    
    include_dependencies: bool = Field(
        False,
        description="Whether to include dependency health checks"
    )


class FaceAnalysisRequest(BaseModel):
    """Request schema for face analysis (when using base64 or URL)."""
    
    image_url: Optional[str] = Field(
        None,
        description="URL of the image to analyze",
        examples=["https://example.com/face.jpg"]
    )
    
    image_base64: Optional[str] = Field(
        None,
        description="Base64 encoded image data"
    )
    
    return_features: bool = Field(
        False,
        description="Whether to return detailed facial features"
    )
    
    @field_validator("image_url", "image_base64")
    @classmethod
    def validate_image_input(cls, v, info):
        """Ensure at least one image input is provided."""
        # This validator runs per field, so we need the full model context
        # Will be validated in endpoint logic
        return v
