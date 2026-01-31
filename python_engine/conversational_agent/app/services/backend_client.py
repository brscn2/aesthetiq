"""HTTP client for the NestJS Backend Chat API."""
import httpx
import jwt
import time
from typing import Dict, Any, Optional, List
from contextlib import asynccontextmanager

from app.core.config import get_settings
from app.core.logger import get_logger

logger = get_logger(__name__)


class BackendClientError(Exception):
    """Exception raised for backend client errors."""
    
    def __init__(self, message: str, status_code: Optional[int] = None, response: Optional[Dict] = None):
        super().__init__(message)
        self.status_code = status_code
        self.response = response


class InvalidTokenError(BackendClientError):
    """Exception raised for invalid or expired tokens."""
    
    def __init__(self, message: str = "Invalid or expired authentication token"):
        super().__init__(message, status_code=401)


class BackendClient:
    """
    HTTP client for interacting with the NestJS Backend Chat API.
    
    Provides methods for:
    - Creating chat sessions
    - Getting session details and history
    - Adding messages to sessions
    """
    
    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None,
        auth_token: Optional[str] = None,
    ):
        """
        Initialize the backend client.
        
        Args:
            base_url: Backend API base URL (defaults to settings)
            timeout: Request timeout in seconds (defaults to settings)
            auth_token: Bearer token for authentication (optional)
            
        Raises:
            InvalidTokenError: If auth_token is provided but expired or invalid
        """
        settings = get_settings()
        self.base_url = base_url or settings.BACKEND_URL
        self.timeout = timeout or settings.BACKEND_TIMEOUT
        self.auth_token = auth_token
        self._client: Optional[httpx.AsyncClient] = None
        
        # Validate token on initialization if provided
        if self.auth_token:
            self._validate_token()
    
    def _validate_token(self) -> None:
        """
        Validate JWT token expiration without external key validation.
        
        This checks the JWT exp claim to detect expired tokens before
        making API calls. Full validation happens on backend.
        
        Raises:
            InvalidTokenError: If token is expired
        """
        if not self.auth_token:
            return
        
        try:
            # Decode without verification to check exp claim
            # Full verification happens on NestJS backend
            payload = jwt.decode(
                self.auth_token,
                options={"verify_signature": False}
            )
            
            # Check expiration
            exp = payload.get("exp")
            if exp and exp < time.time():
                logger.warning(f"Token expired at {exp}, current time: {time.time()}")
                raise InvalidTokenError("Authentication token has expired")
            
            logger.debug(f"Token validated, expires at {exp}")
        except jwt.DecodeError as e:
            logger.error(f"Failed to decode token: {e}")
            raise InvalidTokenError(f"Invalid authentication token: {e}")
        except InvalidTokenError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error validating token: {e}")
            raise InvalidTokenError(f"Token validation failed: {e}")
    
    async def validate_token_with_backend(self) -> bool:
        """
        Validate token by making a test API call to the backend.
        
        This ensures the token is not only structurally valid but also
        accepted by Clerk authentication on the backend.
        
        Returns:
            True if token is valid, False otherwise
            
        Raises:
            InvalidTokenError: If token is rejected by backend
        """
        if not self.auth_token:
            raise InvalidTokenError("No authentication token provided")
        
        try:
            # Make a lightweight API call to test token validity
            # Using /api/chat/user which requires auth
            client = await self._get_client()
            response = await client.get("/api/chat/user")
            
            if response.status_code == 401:
                raise InvalidTokenError("Token rejected by backend authentication")
            elif response.status_code >= 400:
                raise BackendClientError(f"Backend returned {response.status_code}")
            
            logger.debug("Token validated successfully with backend")
            return True
        except InvalidTokenError:
            raise
        except httpx.RequestError as e:
            logger.error(f"Network error validating token: {e}")
            raise BackendClientError(f"Network error: {e}")
    
    @property
    def headers(self) -> Dict[str, str]:
        """Get default headers for requests."""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        return headers
    
    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=self.timeout,
                headers=self.headers,
            )
        return self._client
    
    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None
    
    @asynccontextmanager
    async def session(self):
        """Context manager for using the client."""
        try:
            yield self
        finally:
            await self.close()
    
    async def _handle_response(self, response: httpx.Response) -> Dict[str, Any]:
        """
        Handle HTTP response and raise errors if needed.
        
        Args:
            response: HTTP response object
            
        Returns:
            Parsed JSON response
            
        Raises:
            InvalidTokenError: If response indicates authentication failure (401)
            BackendClientError: If response indicates any other error
        """
        try:
            data = response.json()
        except Exception:
            data = {"raw": response.text}
        
        if response.status_code >= 400:
            error_message = data.get("message", data.get("error", "Unknown error"))
            
            # Handle 401 Unauthorized as token error
            if response.status_code == 401:
                logger.error(
                    f"Authentication failed: {error_message}",
                    extra={"url": str(response.url)},
                )
                raise InvalidTokenError(error_message)
            
            logger.error(
                f"Backend API error: {response.status_code} - {error_message}",
                extra={"url": str(response.url), "response": data},
            )
            raise BackendClientError(
                message=f"Backend API error: {error_message}",
                status_code=response.status_code,
                response=data,
            )
        
        return data
    
    async def create_session(
        self,
        user_id: str,
        title: str = "New Conversation",
        session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create a new chat session.
        
        Args:
            user_id: The user's identifier (used for logging, auth comes from token)
            title: Session title (default: "New Conversation")
            session_id: Optional custom session ID
            
        Returns:
            Created session data with sessionId
            
        Raises:
            BackendClientError: If creation fails
        """
        client = await self._get_client()
        
        # Note: userId is NOT sent in payload - it's extracted from the auth token
        # by the NestJS backend. We only send title and optional sessionId.
        payload: Dict[str, Any] = {
            "title": title,
        }
        if session_id:
            payload["sessionId"] = session_id
        
        logger.debug(f"Creating session for user {user_id}")
        
        try:
            response = await client.post("/api/chat", json=payload)
            result = await self._handle_response(response)
            logger.info(f"Created session: {result.get('sessionId')}")
            return result
        except httpx.RequestError as e:
            logger.error(f"Network error creating session: {e}")
            raise BackendClientError(f"Network error: {e}")
    
    async def get_session(self, session_id: str) -> Dict[str, Any]:
        """
        Get a chat session by session ID.
        
        Args:
            session_id: The session identifier
            
        Returns:
            Session data including messages
            
        Raises:
            BackendClientError: If session not found or request fails
        """
        client = await self._get_client()
        
        logger.debug(f"Getting session: {session_id}")
        
        try:
            response = await client.get(f"/api/chat/session/{session_id}")
            return await self._handle_response(response)
        except httpx.RequestError as e:
            logger.error(f"Network error getting session: {e}")
            raise BackendClientError(f"Network error: {e}")
    
    async def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Add a message to a chat session.
        
        Args:
            session_id: The session identifier
            role: Message role ("user" or "assistant")
            content: Message content
            metadata: Optional metadata for the message
            
        Returns:
            Updated session data
            
        Raises:
            BackendClientError: If message addition fails
        """
        client = await self._get_client()
        
        payload = {
            "role": role,
            "content": content,
            "metadata": metadata or {},
        }
        
        logger.debug(f"Adding {role} message to session {session_id}")
        
        try:
            response = await client.post(f"/api/chat/{session_id}/message", json=payload)
            return await self._handle_response(response)
        except httpx.RequestError as e:
            logger.error(f"Network error adding message: {e}")
            raise BackendClientError(f"Network error: {e}")
    
    async def get_user_sessions(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get all sessions for a user.
        
        Note: This requires the auth token to be set to the user's token.
        
        Args:
            user_id: The user's identifier (used for logging)
            
        Returns:
            List of session data
            
        Raises:
            BackendClientError: If request fails
        """
        client = await self._get_client()
        
        logger.debug(f"Getting sessions for user {user_id}")
        
        try:
            response = await client.get("/api/chat/user")
            return await self._handle_response(response)
        except httpx.RequestError as e:
            logger.error(f"Network error getting user sessions: {e}")
            raise BackendClientError(f"Network error: {e}")
    
    async def update_session_metadata(
        self,
        session_id: str,
        metadata: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Update session metadata by merging with existing metadata (atomic).
        
        Backend handles the merge atomically using MongoDB $set with nested paths,
        preventing race conditions in concurrent update scenarios.
        
        Args:
            session_id: The session identifier
            metadata: Metadata to merge with existing metadata
            
        Returns:
            Updated session data
            
        Raises:
            BackendClientError: If update fails
        """
        client = await self._get_client()
        payload = {"metadata": metadata}  # Backend will merge atomically
        
        logger.debug(f"Updating metadata for session {session_id}")
        
        try:
            # Use agent API endpoint which accepts sessionId directly
            # Backend's mergeMetadata() handles atomic merge using MongoDB $set
            response = await client.patch(f"/api/agent/sessions/{session_id}", json=payload)
            return await self._handle_response(response)
        except httpx.RequestError as e:
            logger.error(f"Network error updating session metadata: {e}")
            raise BackendClientError(f"Network error: {e}")
    
    async def update_session_title(
        self,
        session_id: str,
        title: str,
    ) -> Dict[str, Any]:
        """
        Update session title.
        
        Args:
            session_id: The session identifier
            title: New title for the session
            
        Returns:
            Updated session data
            
        Raises:
            BackendClientError: If update fails
        """
        client = await self._get_client()
        payload = {"title": title}
        
        logger.debug(f"Updating title for session {session_id}")
        
        try:
            response = await client.patch(f"/api/agent/sessions/{session_id}", json=payload)
            return await self._handle_response(response)
        except httpx.RequestError as e:
            logger.error(f"Network error updating session title: {e}")
            raise BackendClientError(f"Network error: {e}")
    
    async def health_check(self) -> bool:
        """
        Check if the backend is healthy.
        
        Returns:
            True if backend is healthy, False otherwise
        """
        client = await self._get_client()
        
        try:
            # Backend uses /api prefix and returns "Hello World!" at root
            response = await client.get("/api")
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"Backend health check failed: {e}")
            return False


# Global client instance (created on demand)
_backend_client: Optional[BackendClient] = None


def get_backend_client(auth_token: Optional[str] = None) -> BackendClient:
    """
    Get a backend client instance.
    
    Args:
        auth_token: Optional bearer token for authentication
        
    Returns:
        BackendClient instance
    """
    global _backend_client
    
    if auth_token:
        # Return a new client with the auth token
        return BackendClient(auth_token=auth_token)
    
    if _backend_client is None:
        _backend_client = BackendClient()
    
    return _backend_client
