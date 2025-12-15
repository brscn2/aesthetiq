"""FastAPI dependencies for dependency injection."""
from typing import Optional
from fastapi import Header, HTTPException, status

from app.core.config import get_settings
from app.core.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


# AUTH PLACEHOLDER: Implement when Clerk/JWT authentication is set up
async def verify_api_key(x_api_key: Optional[str] = Header(None)) -> str:
    """
    Verify API key from request headers.
    
    This is a placeholder for future authentication.
    Integrate with Clerk, JWT, or custom API key validation.
    
    Args:
        x_api_key: API key from X-API-Key header
        
    Returns:
        Validated API key
        
    Raises:
        HTTPException: If API key is invalid or missing
    """
    # TODO: Passthrough for development - implement actual validation for production
    return x_api_key or "development"


# AUTH PLACEHOLDER: Implement when Clerk integration is set up
async def get_current_user(api_key: str = Header(..., alias="Authorization")) -> dict:
    """
    Get current user from JWT token or API key.
    
    This is a placeholder for Clerk integration or custom auth.
    
    Args:
        api_key: Authorization header (Bearer token or API key)
        
    Returns:
        User information dictionary
        
    Raises:
        HTTPException: If authentication fails
    """
    # Return mock user for development - implement Clerk JWT verification for production
    return {
        "id": "dev-user",
        "email": "dev@example.com",
        "role": "admin"
    }
