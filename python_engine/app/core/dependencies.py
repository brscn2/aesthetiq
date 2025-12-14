"""FastAPI dependencies for dependency injection."""
from typing import Optional
from fastapi import Header, HTTPException, status

from app.core.config import get_settings
from app.core.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


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
    # TODO: Implement actual API key validation
    # For now, this is a passthrough
    # Example implementation:
    # if not x_api_key or x_api_key != settings.INTERNAL_API_KEY:
    #     raise HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED,
    #         detail="Invalid or missing API key"
    #     )
    return x_api_key or "development"


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
    # TODO: Implement Clerk JWT verification or custom auth
    # Example:
    # if api_key.startswith("Bearer "):
    #     token = api_key.split(" ")[1]
    #     user = await verify_clerk_token(token)
    #     return user
    
    return {
        "id": "dev-user",
        "email": "dev@example.com",
        "role": "admin"
    }
