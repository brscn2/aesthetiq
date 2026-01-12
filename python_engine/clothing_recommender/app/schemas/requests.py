"""Request schemas for Clothing Recommender API endpoints."""
from typing import Optional, Dict, Any
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
        return sanitize_input(v, max_length=10000)


class ConversationRequest(BaseConversationRequest):
    """Request schema for conversational agent (non-streaming)."""
    pass


class ConversationStreamRequest(BaseConversationRequest):
    """Request schema for streaming conversational responses."""
    pass


class RecommendRequest(BaseModel):
    """Request schema for clothing recommendations."""
    
    message: str = Field(
        ...,
        description="User's clothing request/query",
        min_length=1,
        max_length=2000,
        examples=["Find me a jacket for a party", "I need casual clothes for the weekend"]
    )
    
    user_id: str = Field(
        ...,
        description="Unique identifier for the user",
        examples=["user_36On4ZlnKfasGRPkKfsqX7W8FDm"]
    )
    
    session_id: Optional[str] = Field(
        None,
        description="Optional session ID for tracking",
        examples=["rec_20260110120000"]
    )
    
    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        """Validate and sanitize message input."""
        if not v.strip():
            raise ValueError("Message cannot be empty or whitespace")
        return sanitize_input(v, max_length=2000)

