"""Response schemas for Clothing Recommender API endpoints."""
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class ClothingData(BaseModel):
    """Clothing recommendation data included in conversation responses."""
    
    item_ids: List[str] = Field(
        default_factory=list,
        description="List of recommended wardrobe item IDs"
    )
    
    count: int = Field(
        0,
        description="Number of items found"
    )
    
    iterations: int = Field(
        1,
        description="Number of search iterations performed"
    )
    
    fallback: Optional[bool] = Field(
        None,
        description="True if no results were found and fallback message used"
    )
    
    error: Optional[str] = Field(
        None,
        description="Error message if recommendation failed"
    )


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
    
    clothing_data: Optional[ClothingData] = Field(
        None,
        description="Clothing recommendation data (only present for clothing queries)"
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


class RecommendResponse(BaseModel):
    """Response schema for clothing recommendations."""
    
    item_ids: list[str] = Field(
        ...,
        description="List of recommended wardrobe item IDs",
        examples=[["6938855c485e1f7c84ad1145", "6938855d485e1f7c84ad1146"]]
    )
    
    message: Optional[str] = Field(
        None,
        description="Optional message (e.g., fallback message when no items found)",
        examples=["No matching items found. Try a different search."]
    )
    
    session_id: str = Field(
        ...,
        description="Session identifier for tracking",
        examples=["rec_20260110120000"]
    )
    
    iterations: int = Field(
        1,
        description="Number of search iterations performed",
        ge=1,
        le=3
    )
    
    metadata: Optional[Dict[str, Any]] = Field(
        None,
        description="Additional metadata about the recommendation",
        examples=[{
            "success": True,
            "total_items": 5,
            "filters_used": {"category": "TOP"}
        }]
    )

