"""Request schemas for API endpoints."""
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, field_validator


class ConversationRequest(BaseModel):
    """Request schema for conversational agent."""
    
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
        """Validate message is not empty or whitespace."""
        if not v.strip():
            raise ValueError("Message cannot be empty or whitespace")
        return v.strip()


class ConversationStreamRequest(BaseModel):
    """Request schema for streaming conversational responses."""
    
    message: str = Field(
        ...,
        description="User's message to the agent",
        min_length=1,
        max_length=10000
    )
    
    user_id: str = Field(
        ...,
        description="Unique identifier for the user"
    )
    
    session_id: Optional[str] = Field(
        None,
        description="Optional session ID"
    )
    
    context: Optional[Dict[str, Any]] = Field(
        None,
        description="Optional context data (history, preferences, etc.)"
    )
    
    stream_mode: str = Field(
        "tokens",
        description="Streaming mode: 'tokens' for token-by-token, 'events' for workflow events",
        pattern="^(tokens|events)$"
    )
    
    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        """Validate message is not empty or whitespace."""
        if not v.strip():
            raise ValueError("Message cannot be empty or whitespace")
        return v.strip()


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
