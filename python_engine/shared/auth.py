"""Authentication and authorization utilities.

This module provides authentication helpers for the Aesthetiq microservices.
Currently provides development passthrough - integrate with Clerk or custom
JWT validation for production.

Usage:
    Copy relevant functions to your service's dependencies.py or import
    this module directly if using a shared volume mount in Docker.
"""
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# API KEY AUTHENTICATION (Simple)
# =============================================================================

async def verify_api_key(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key")
) -> str:
    """
    Verify API key from request headers.
    
    This is a placeholder for future authentication.
    Integrate with API key database or validation service.
    
    Args:
        x_api_key: API key from X-API-Key header
        
    Returns:
        Validated API key
        
    Raises:
        HTTPException: If API key is invalid or missing (when enforced)
    """
    # TODO: Implement actual API key validation for production
    # Example: Check against database, Redis, or external service
    #
    # if not x_api_key:
    #     raise HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED,
    #         detail="API key required"
    #     )
    # if not await validate_key_in_database(x_api_key):
    #     raise HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED,
    #         detail="Invalid API key"
    #     )
    
    return x_api_key or "development"


# =============================================================================
# JWT / CLERK AUTHENTICATION
# =============================================================================

async def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization")
) -> Dict[str, Any]:
    """
    Get current user from JWT token (Bearer token).
    
    This is a placeholder for Clerk integration or custom JWT auth.
    
    Integration Options:
    1. Clerk - Use clerk-backend-api or clerk-sdk-python
    2. Custom JWT - Use python-jose or PyJWT
    3. Auth0/Firebase - Use respective SDKs
    
    Args:
        authorization: Authorization header (Bearer <token>)
        
    Returns:
        User information dictionary with at least:
        - id: User identifier
        - email: User email (optional)
        - role: User role (optional)
        
    Raises:
        HTTPException: If authentication fails (when enforced)
        
    Example Clerk Integration:
        from clerk_backend_api import Clerk
        
        clerk = Clerk(api_key=settings.CLERK_SECRET_KEY)
        
        async def get_current_user(authorization: str = Header(...)):
            if not authorization.startswith("Bearer "):
                raise HTTPException(401, "Invalid authorization header")
            
            token = authorization[7:]  # Remove "Bearer "
            
            try:
                session = clerk.sessions.verify_token(token)
                user = clerk.users.get(session.user_id)
                return {
                    "id": user.id,
                    "email": user.email_addresses[0].email_address,
                    "role": user.public_metadata.get("role", "user")
                }
            except Exception as e:
                raise HTTPException(401, f"Authentication failed: {e}")
    """
    # Development passthrough - returns mock user
    # TODO: Implement actual JWT verification for production
    
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        logger.debug(f"Received token: {token[:10]}...")
    
    return {
        "id": "dev-user",
        "email": "dev@example.com",
        "role": "admin"
    }


# =============================================================================
# ROLE-BASED ACCESS CONTROL
# =============================================================================

def require_role(allowed_roles: list[str]):
    """
    Dependency factory for role-based access control.
    
    Args:
        allowed_roles: List of roles that can access the endpoint
        
    Returns:
        Dependency function that validates user role
        
    Usage:
        @router.get("/admin", dependencies=[Depends(require_role(["admin"]))])
        async def admin_only():
            return {"message": "Admin access granted"}
    """
    async def role_checker(user: Dict[str, Any] = None) -> Dict[str, Any]:
        # In production, get user from get_current_user dependency
        if user is None:
            user = await get_current_user()
        
        user_role = user.get("role", "user")
        
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user_role}' not authorized. Required: {allowed_roles}"
            )
        
        return user
    
    return role_checker


# =============================================================================
# SERVICE-TO-SERVICE AUTHENTICATION
# =============================================================================

async def verify_internal_service(
    x_service_key: Optional[str] = Header(None, alias="X-Service-Key")
) -> bool:
    """
    Verify internal service-to-service communication.
    
    Use this for internal API calls between microservices.
    In Docker network, services can communicate freely, but this
    adds an extra layer of security.
    
    Args:
        x_service_key: Internal service key
        
    Returns:
        True if valid internal service call
        
    Raises:
        HTTPException: If service key is invalid (when enforced)
    """
    # TODO: Implement service key validation
    # Could use a shared secret from environment variables
    #
    # expected_key = os.environ.get("INTERNAL_SERVICE_KEY")
    # if x_service_key != expected_key:
    #     raise HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED,
    #         detail="Invalid service key"
    #     )
    
    return True
