"""Response schemas for Fashion Expert API endpoints."""
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field


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
