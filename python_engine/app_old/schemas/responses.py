"""Response schemas for API endpoints."""
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class ConversationResponse(BaseModel):
    """Response schema for conversational agent."""
    
    message: str = Field(
        ...,
        description="Agent's response message",
        examples=["I'd be happy to help you with your style! What are you looking for?"]
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
            "user_id": "user_123",
            "model": "gpt-4",
            "tokens_used": 150,
            "latency_ms": 1200
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
    
    app_name: str = Field(
        ...,
        description="Application name"
    )
    
    version: str = Field(
        ...,
        description="Application version"
    )
    
    timestamp: str = Field(
        ...,
        description="Health check timestamp (ISO format)"
    )


class ReadinessResponse(BaseModel):
    """Response schema for readiness check endpoint."""
    
    status: str = Field(
        ...,
        description="Readiness status",
        examples=["ready", "not_ready"]
    )
    
    checks: Dict[str, str] = Field(
        ...,
        description="Status of individual service checks",
        examples=[{
            "database": "connected",
            "llm_service": "available",
            "cache": "connected"
        }]
    )
    
    timestamp: str = Field(
        ...,
        description="Readiness check timestamp (ISO format)"
    )


class ErrorResponse(BaseModel):
    """Standard error response schema."""
    
    error: str = Field(
        ...,
        description="Error type or code",
        examples=["ValidationError", "ServerError"]
    )
    
    detail: str = Field(
        ...,
        description="Detailed error message",
        examples=["Message field is required"]
    )
    
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="Error timestamp (ISO format)"
    )
    
    request_id: Optional[str] = Field(
        None,
        description="Request identifier for tracking"
    )


class FaceAnalysisResponse(BaseModel):
    """Response schema for face analysis endpoint."""
    
    face_shape: str = Field(
        ...,
        description="Detected face shape",
        examples=["Oval", "Round", "Square", "Heart", "Diamond"]
    )
    
    face_shape_score: float = Field(
        ...,
        description="Confidence score for face shape detection (0-1)",
        ge=0.0,
        le=1.0,
        examples=[0.87]
    )
    
    palette: str = Field(
        ...,
        description="Detected color season/palette",
        examples=["Warm Spring", "Cool Summer", "Dark Autumn"]
    )
    
    palette_scores: Dict[str, float] = Field(
        ...,
        description="Confidence scores for all color seasons",
        examples=[{
            "WARM SPRING": 0.75,
            "LIGHT SPRING": 0.15,
            "BRIGHT SPRING": 0.05,
            "COOL SUMMER": 0.03,
            "...": 0.0
        }]
    )
    
    features: List[Any] = Field(
        default_factory=list,
        description="Additional facial features (future use)"
    )
    
    processing_time_ms: Optional[float] = Field(
        None,
        description="Time taken to process the image in milliseconds"
    )
