"""Response schemas for Clothing Recommender API endpoints."""
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class ConversationResponse(BaseModel):
    """Response schema for conversational agent."""
    
    message: str = Field(
        ...,
        description="Agent's response message",
        examples=["I'd be happy to help you with your style!"]
    )
    
    session_id: str = Field(
        ...,
        description="Session identifier for conversation continuity",
        examples=["session_abc123"]
    )
    
    metadata: Optional[Dict[str, Any]] = Field(
        None,
        description="Additional metadata about the response",
        examples=[{
            "timestamp": "2025-12-13T10:30:00Z",
            "model": "gpt-4",
            "tokens_used": 150
        }]
    )


class ConversationStreamResponse(BaseModel):
    """Response schema for streaming conversation chunks."""
    
    chunk: str = Field(
        ...,
        description="Response chunk (token or event)"
    )
    
    session_id: str = Field(
        ...,
        description="Session identifier"
    )
    
    is_final: bool = Field(
        False,
        description="Whether this is the final chunk"
    )
    
    metadata: Optional[Dict[str, Any]] = Field(
        None,
        description="Metadata for this chunk"
    )


class HealthResponse(BaseModel):
    """Response schema for health check endpoint."""
    
    status: str = Field(
        ...,
        description="Overall health status",
        examples=["healthy", "degraded", "unhealthy"]
    )
    
    app_name: str = Field(..., description="Application name")
    version: str = Field(..., description="Application version")
    timestamp: str = Field(..., description="Health check timestamp")


class ErrorResponse(BaseModel):
    """Standard error response schema."""
    
    error: str = Field(..., description="Error type or code")
    detail: str = Field(..., description="Detailed error message")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="Error timestamp"
    )
