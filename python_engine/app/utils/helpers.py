"""Helper utility functions."""
from typing import Dict, Any, Optional
import hashlib
import json
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
    
    data = f"{user_id}_{timestamp.isoformat()}"
    return hashlib.sha256(data.encode()).hexdigest()[:16]


def hash_message(message: str) -> str:
    """
    Generate a hash for a message (useful for caching).
    Can avoid LLM call if same message is called again.
    
    Args:
        message: Message text
        
    Returns:
        SHA256 hash of the message
    """
    return hashlib.sha256(message.encode()).hexdigest()


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


def calculate_tokens_estimate(text: str) -> int:
    """
    Estimate token count for text (rough approximation).
    Can be used to check if token-limit will be exceeded.
    
    Args:
        text: Input text
        
    Returns:
        Estimated token count
        
    Note:
        This is a rough estimate. For accurate counts, use tiktoken library.
    """
    # Rough estimate: 1 token ≈ 4 characters for English
    return len(text) // 4


#TODO: Remove this
def dict_to_cache_key(data: Dict[str, Any]) -> str:
    """
    Convert a dictionary to a stable cache key.
    
    Args:
        data: Dictionary to convert
        
    Returns:
        Cache key string
    """
    # Sort keys for stability
    json_str = json.dumps(data, sort_keys=True)
    return hashlib.md5(json_str.encode()).hexdigest()


def mask_sensitive_data(data: str, visible_chars: int = 4) -> str:
    """
    Mask sensitive data (API keys, tokens, etc.) for logging.
    This is the most useless function I have ever seen in my life but fck it.
    
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
