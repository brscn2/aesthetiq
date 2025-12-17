"""Helper utility functions."""
from typing import Dict, Any, Optional
import hashlib
import uuid
from datetime import datetime, timezone


def generate_session_id(user_id: str, timestamp: Optional[datetime] = None) -> str:
    """
    Generate a unique session ID for a conversation.
    Includes random salt to prevent collisions.
    
    Args:
        user_id: User identifier
        timestamp: Optional timestamp (defaults to current time)
        
    Returns:
        Unique session ID string
    """
    if timestamp is None:
        timestamp = datetime.now(timezone.utc)
    
    # Add random UUID to ensure uniqueness even if same user/time
    salt = str(uuid.uuid4())
    data = f"{user_id}_{timestamp.isoformat()}_{salt}"
    return hashlib.sha256(data.encode()).hexdigest()[:16]


def validate_session_id(session_id: str) -> bool:
    """
    Validate session ID format to prevent injection/abuse.
    Allows alphanumeric characters, hyphens, and underscores.
    Max length 64 characters.
    
    Args:
        session_id: Session ID to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not session_id or len(session_id) > 64:
        return False
        
    # Check for valid characters (alphanumeric, -, _)
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
    # Remove leading/trailing whitespace
    text = text.strip()
    
    # Truncate if too long - careful
    if len(text) > max_length:
        text = text[:max_length]
    
    # Remove null bytes
    text = text.replace('\x00', '')
    
    return text


def format_conversation_history(
    history: list[Dict[str, str]],
    max_messages: int = 10
) -> list[Dict[str, str]]:
    """
    Format and limit conversation history.
    Currently works as simple sliding window, but can be changed to something more complex,
    where information is condenced with e.g. an LLM or other approaches.
    
    Args:
        history: List of message dictionaries
        max_messages: Maximum number of messages to keep
        
    Returns:
        Formatted history list
    """
    # Take only the last N messages
    recent_history = history[-max_messages:] if len(history) > max_messages else history
    
    # Ensure each message has required fields
    formatted = []
    for msg in recent_history:
        if "role" in msg and "content" in msg:
            formatted.append({
                "role": msg["role"],
                "content": msg["content"]
            })
    
    return formatted


def mask_sensitive_data(data: str, visible_chars: int = 4) -> str:
    """
    Mask sensitive data (API keys, tokens, etc.) for logging.
    
    Args:
        data: Sensitive string to mask
        visible_chars: Number of characters to leave visible at start
        
    Returns:
        Masked string
        
    Example:
        >>> mask_sensitive_data("sk-1234567890abcdef")
        "sk-1***************"
    """
    if len(data) <= visible_chars:
        return "*" * len(data)
    
    return data[:visible_chars] + "*" * (len(data) - visible_chars)
