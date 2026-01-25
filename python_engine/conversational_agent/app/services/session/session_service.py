"""Session management service for chat sessions."""
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import uuid

from app.services.backend_client import BackendClient, BackendClientError
from app.core.config import get_settings
from app.core.logger import get_logger

logger = get_logger(__name__)


@dataclass
class SessionData:
    """Container for session data."""
    session_id: str
    user_id: str
    title: str
    messages: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SessionData":
        """Create SessionData from API response."""
        return cls(
            session_id=data.get("sessionId", ""),
            user_id=data.get("userId", ""),
            title=data.get("title", ""),
            messages=data.get("messages") or [],
            metadata=data.get("metadata") or {},
        )


class SessionService:
    """
    High-level service for managing chat sessions.
    
    Provides:
    - Session loading and creation
    - Message persistence
    - History formatting for LLM context
    """
    
    def __init__(self, backend_client: Optional[BackendClient] = None):
        """
        Initialize the session service.
        
        Args:
            backend_client: Backend client instance (creates default if not provided)
        """
        self.backend_client = backend_client or BackendClient()
        self.settings = get_settings()
    
    async def load_session(
        self,
        user_id: str,
        session_id: Optional[str] = None,
        title: str = "New Conversation",
    ) -> SessionData:
        """
        Load an existing session or create a new one.
        
        Args:
            user_id: The user's identifier
            session_id: Optional session ID to load (creates new if not provided)
            title: Title for new sessions
            
        Returns:
            SessionData with session details and messages
        """
        if session_id:
            # Try to load existing session
            try:
                session_data = await self.backend_client.get_session(session_id)
                logger.info(f"Loaded existing session: {session_id}")
                return SessionData.from_dict(session_data)
            except BackendClientError as e:
                if e.status_code == 404:
                    logger.warning(f"Session {session_id} not found, creating new session")
                else:
                    raise
        
        # Create new session
        new_session_id = session_id or self._generate_session_id()
        try:
            session_data = await self.backend_client.create_session(
                user_id=user_id,
                title=title,
                session_id=new_session_id,
            )
            logger.info(f"Created new session: {session_data.get('sessionId')}")
            return SessionData.from_dict(session_data)
        except BackendClientError as e:
            logger.error(f"Failed to create session: {e}")
            raise
    
    async def save_message(
        self,
        session_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Save a message to the session.
        
        Args:
            session_id: The session identifier
            role: Message role ("user" or "assistant")
            content: Message content
            metadata: Optional metadata for the message
        """
        try:
            await self.backend_client.add_message(
                session_id=session_id,
                role=role,
                content=content,
                metadata=metadata,
            )
            logger.debug(f"Saved {role} message to session {session_id}")
        except BackendClientError as e:
            logger.error(f"Failed to save message: {e}")
            raise
    
    async def save_conversation_turn(
        self,
        session_id: str,
        user_message: str,
        assistant_message: str,
        user_metadata: Optional[Dict[str, Any]] = None,
        assistant_metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Save a complete conversation turn (user + assistant messages).
        
        Args:
            session_id: The session identifier
            user_message: The user's message
            assistant_message: The assistant's response
            user_metadata: Optional metadata for user message
            assistant_metadata: Optional metadata for assistant message
        """
        await self.save_message(
            session_id=session_id,
            role="user",
            content=user_message,
            metadata=user_metadata,
        )
        await self.save_message(
            session_id=session_id,
            role="assistant",
            content=assistant_message,
            metadata=assistant_metadata,
        )
    
    def format_history_for_llm(
        self,
        messages: List[Dict[str, Any]],
        max_messages: Optional[int] = None,
    ) -> List[Dict[str, str]]:
        """
        Format conversation history for LLM context.
        
        Limits to the most recent messages to avoid token limits.
        
        Args:
            messages: List of message dictionaries
            max_messages: Maximum number of messages to include (defaults to settings)
            
        Returns:
            List of formatted messages with role and content
        """
        max_msgs = max_messages or self.settings.MAX_CONVERSATION_HISTORY
        
        # Ensure messages is a list (handle None case)
        messages = messages or []
        
        # Get the most recent messages
        recent_messages = messages[-max_msgs:] if len(messages) > max_msgs else messages
        
        # Format for LLM
        formatted = []
        for msg in recent_messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            
            if content:  # Skip empty messages
                formatted.append({
                    "role": role,
                    "content": content,
                })
        
        return formatted
    
    def get_pending_context(self, session_data: SessionData) -> Optional[Dict[str, Any]]:
        """
        Extract pending clarification context from session metadata.
        
        Args:
            session_data: Session data from load_session()
            
        Returns:
            Pending clarification context if present, None otherwise
        """
        metadata = session_data.metadata or {}
        pending_context = metadata.get("pendingClarificationContext")
        if pending_context:
            logger.info(f"Found pending clarification context in session {session_data.session_id}")
        return pending_context
    
    async def save_pending_context(
        self,
        session_id: str,
        context: Dict[str, Any],
    ) -> None:
        """
        Save pending clarification context to session metadata.
        
        Args:
            session_id: The session identifier
            context: Clarification context to save
        """
        try:
            await self.backend_client.update_session_metadata(
                session_id=session_id,
                metadata={"pendingClarificationContext": context},
            )
            logger.info(f"Saved pending clarification context to session {session_id}")
        except BackendClientError as e:
            logger.error(f"Failed to save pending context: {e}")
            # Don't raise - this is not critical for workflow execution
            logger.warning("Continuing without saving pending context")
    
    def get_workflow_context(self, session_data: SessionData) -> Optional[Dict[str, Any]]:
        """
        Extract completed workflow context from session metadata.
        
        Args:
            session_data: Session data from load_session()
            
        Returns:
            Completed workflow context if present, None otherwise
        """
        metadata = session_data.metadata or {}
        workflow_context = metadata.get("workflowContext")
        if workflow_context:
            logger.debug(f"Found workflow context in session {session_data.session_id}")
        return workflow_context
    
    async def save_workflow_context(
        self,
        session_id: str,
        context: Dict[str, Any],
    ) -> None:
        """
        Save completed workflow context to session metadata.
        
        Only saves if context contains retrieved_items (clothing recommendations).
        This allows follow-up messages to reference specific items.
        
        Args:
            session_id: The session identifier
            context: Workflow context to save (should include retrieved_items, filters, etc.)
        """
        # Only save if we have items (clothing recommendations)
        # Use 'or []' to handle case where retrieved_items is explicitly None
        retrieved_items = context.get("retrieved_items") or []
        if not retrieved_items:
            logger.debug(f"Skipping workflow context save - no items in context")
            return
        
        try:
            await self.backend_client.update_session_metadata(
                session_id=session_id,
                metadata={"workflowContext": context},
            )
            logger.info(f"Saved workflow context to session {session_id} ({len(retrieved_items)} items)")
        except BackendClientError as e:
            logger.error(f"Failed to save workflow context: {e}")
            # Don't raise - this is not critical for workflow execution
            logger.warning("Continuing without saving workflow context")
    
    async def update_title_if_default(
        self,
        session_id: str,
        user_message: str,
        current_title: str = "New Conversation",
    ) -> None:
        """
        Update session title from user message if it's still the default.
        
        Only updates if current_title matches the default to preserve manual renames.
        
        Args:
            session_id: The session identifier
            user_message: First user message to generate title from
            current_title: Current session title (default: "New Conversation")
        """
        logger.debug(f"Title update check for session {session_id}: current_title='{current_title}', message_length={len(user_message)}")
        
        # Only update if still using default title
        if current_title != "New Conversation":
            logger.debug(f"Skipping title update - session {session_id} already has custom title: '{current_title}'")
            return
        
        try:
            smart_title = self._generate_smart_title(user_message)
            logger.info(f"Updating session {session_id} title from '{current_title}' to '{smart_title}'")
            result = await self.backend_client.update_session_title(
                session_id=session_id,
                title=smart_title,
            )
            logger.info(f"Successfully updated session {session_id} title to: '{smart_title}' (backend returned: {result.get('title', 'N/A')})")
        except BackendClientError as e:
            logger.error(f"Failed to update session title for {session_id}: {e} (status_code: {e.status_code})", exc_info=True)
            # Don't raise - title update is non-critical
        except Exception as e:
            logger.error(f"Unexpected error updating session title for {session_id}: {e}", exc_info=True)
            # Don't raise - title update is non-critical
    
    def _generate_session_id(self) -> str:
        """Generate a unique session ID."""
        return f"session_{uuid.uuid4().hex[:16]}"
    
    @staticmethod
    def _generate_smart_title(user_message: str) -> str:
        """
        Generate a smart title from user message.
        
        Args:
            user_message: The user's message to generate title from
            
        Returns:
            Generated title (max 60 chars, truncated at word boundary)
        """
        if not user_message or not user_message.strip():
            return "New Conversation"
        
        # Remove extra whitespace and get first part
        cleaned = ' '.join(user_message.split())
        
        # Truncate to ~60 chars at word boundary
        if len(cleaned) <= 60:
            title = cleaned
        else:
            title = cleaned[:60].rsplit(' ', 1)[0]
        
        # Capitalize first letter
        if title:
            return title[0].upper() + title[1:]
        return "New Conversation"
    
    async def close(self) -> None:
        """Close the underlying backend client."""
        await self.backend_client.close()


# Global session service instance
_session_service: Optional[SessionService] = None


def get_session_service(backend_client: Optional[BackendClient] = None) -> SessionService:
    """
    Get a session service instance.
    
    Args:
        backend_client: Optional backend client to use
        
    Returns:
        SessionService instance
    """
    global _session_service
    
    if backend_client:
        return SessionService(backend_client=backend_client)
    
    if _session_service is None:
        _session_service = SessionService()
    
    return _session_service
