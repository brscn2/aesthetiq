"""Helper utility functions."""
from typing import Dict, Any, Optional
import hashlib
import uuid
from datetime import datetime, timezone


def generate_session_id(user_id: str, timestamp: Optional[datetime] = None) -> str:
    """
    Generate a unique session ID for a conversation.
    
    Args:
        user_id: User identifier
        timestamp: Optional timestamp (defaults to current time)
        
    Returns:
        Unique session ID string
    """
    if timestamp is None:
        timestamp = datetime.now(timezone.utc)
    
    salt = str(uuid.uuid4())
    data = f"{user_id}_{timestamp.isoformat()}_{salt}"
    return hashlib.sha256(data.encode()).hexdigest()[:16]


def validate_session_id(session_id: str) -> bool:
    """
    Validate session ID format.
    
    Args:
        session_id: Session ID to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not session_id or len(session_id) > 64:
        return False
    return all(c.isalnum() or c in "-_" for c in session_id)


def sanitize_input(text: str, max_length: int = 10000) -> str:
    """
    Sanitize user input text.
    
    Args:
        text: Input text
        max_length: Maximum allowed length
        
    Returns:
        Sanitized text
    """
    text = text.strip()
    if len(text) > max_length:
        text = text[:max_length]
    text = text.replace('\x00', '')
    return text


def format_conversation_history(
    history: list[Dict[str, str]],
    max_messages: int = 10
) -> list[Dict[str, str]]:
    """
    Format and limit conversation history.
    
    Args:
        history: List of message dictionaries
        max_messages: Maximum number of messages to keep
        
    Returns:
        Formatted history list
    """
    recent_history = history[-max_messages:] if len(history) > max_messages else history
    
    formatted = []
    for msg in recent_history:
        if "role" in msg and "content" in msg:
            formatted.append({
                "role": msg["role"],
                "content": msg["content"]
            })
    
    return formatted
