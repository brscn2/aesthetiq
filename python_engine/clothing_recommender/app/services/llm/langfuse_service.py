"""Langfuse service for LLM observability and tracing (v3 API)."""
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from functools import wraps

from app.core.config import get_settings
from app.core.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

# Import langfuse components
_langfuse_observe = None
_Langfuse = None
_TraceContext = None

if settings.LANGFUSE_PUBLIC_KEY and settings.LANGFUSE_SECRET_KEY:
    try:
        from langfuse import observe as lf_observe, Langfuse as LangfuseClient
        from langfuse.types import TraceContext
        _langfuse_observe = lf_observe
        _Langfuse = LangfuseClient
        _TraceContext = TraceContext
        logger.info("Langfuse SDK v3 loaded successfully")
    except ImportError:
        logger.warning("Langfuse not installed")


def observe(name: Optional[str] = None):
    """Decorator to trace a function with Langfuse."""
    def decorator(func):
        if _langfuse_observe:
            return _langfuse_observe(name=name)(func)
        
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await func(*args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator


class LangfuseService:
    """Service for LLM observability and monitoring with Langfuse v3."""
    
    def __init__(self):
        """Initialize Langfuse service."""
        self.enabled = bool(
            settings.LANGFUSE_PUBLIC_KEY and 
            settings.LANGFUSE_SECRET_KEY
        )
        self.client = None
        
        if self.enabled and _Langfuse:
            try:
                self.client = _Langfuse(
                    public_key=settings.LANGFUSE_PUBLIC_KEY,
                    secret_key=settings.LANGFUSE_SECRET_KEY,
                    host=settings.LANGFUSE_HOST or "https://cloud.langfuse.com"
                )
                logger.info("Langfuse observability enabled")
            except Exception as e:
                logger.error(f"Failed to initialize Langfuse client: {e}")
                self.enabled = False
        elif not self.enabled:
            logger.warning("Langfuse keys not configured, observability disabled")
    
    @property
    def is_enabled(self) -> bool:
        """Check if Langfuse is enabled."""
        return self.enabled
    
    def start_trace(
        self,
        name: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """Start a new trace for monitoring."""
        if not self.enabled or not self.client:
            return None
        
        try:
            trace_id = self.client.create_trace_id()
            trace_context = _TraceContext(trace_id=trace_id) if _TraceContext else None
            
            self.client.create_event(
                name=f"{name}_start",
                trace_context=trace_context,
                input={"user_id": user_id, "session_id": session_id},
                metadata={"trace_name": name, **(metadata or {})}
            )
            
            logger.debug(f"Started trace: {name} ({trace_id})")
            
            return {
                "trace_id": trace_id,
                "trace_context": trace_context,
                "name": name,
                "user_id": user_id,
                "session_id": session_id
            }
        except Exception as e:
            logger.error(f"Error starting trace: {e}")
            return None
    
    def end_trace(
        self,
        trace_context: Optional[Dict[str, Any]],
        output: Optional[Any] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """End a trace with output and metadata."""
        if not self.enabled or not self.client or not trace_context:
            return
        
        try:
            trace_id = trace_context.get("trace_id")
            name = trace_context.get("name", "trace")
            tc = trace_context.get("trace_context")
            
            self.client.create_event(
                name=f"{name}_end",
                trace_context=tc,
                output=str(output)[:1000] if output else None,
                metadata=metadata or {}
            )
            
            self.client.flush()
            logger.debug(f"Ended trace: {name} ({trace_id})")
        except Exception as e:
            logger.error(f"Error ending trace: {e}")
    
    def log_event(
        self,
        name: str,
        input_data: Optional[Any] = None,
        output_data: Optional[Any] = None,
        trace_context: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log a generic event linked to a trace."""
        if not self.enabled or not self.client:
            return
        
        try:
            tc = trace_context.get("trace_context") if trace_context else None
            
            self.client.create_event(
                name=name,
                trace_context=tc,
                input=input_data,
                output=output_data,
                metadata=metadata
            )
            logger.debug(f"Logged event: {name}")
        except Exception as e:
            logger.error(f"Error logging event: {e}")
    
    def log_generation(
        self,
        name: str,
        model: str,
        input_text: str,
        output_text: str,
        trace_context: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log a single LLM generation as an event."""
        if not self.enabled or not self.client:
            return
        
        try:
            tc = trace_context.get("trace_context") if trace_context else None
            
            self.client.create_event(
                name=name,
                trace_context=tc,
                input=input_text[:2000] if input_text else None,
                output=output_text[:2000] if output_text else None,
                metadata={"model": model, **(metadata or {})}
            )
            logger.debug(f"Logged generation: {name}")
        except Exception as e:
            logger.error(f"Error logging generation: {e}")
    
    def score_trace(
        self,
        trace_context: Optional[Dict[str, Any]],
        name: str,
        value: float,
        comment: Optional[str] = None
    ):
        """Add a score/rating to a trace."""
        if not self.enabled or not self.client or not trace_context:
            return
        
        try:
            trace_id = trace_context.get("trace_id")
            self.client.create_score(
                name=name,
                value=value,
                trace_id=trace_id,
                comment=comment
            )
            logger.debug(f"Scored trace {trace_id}: {name}={value}")
        except Exception as e:
            logger.error(f"Error scoring trace: {e}")
    
    def flush(self):
        """Flush any pending events to Langfuse."""
        if self.client:
            try:
                self.client.flush()
            except Exception as e:
                logger.error(f"Error flushing Langfuse: {e}")
    
    def get_langchain_callback(self):
        """Get Langfuse callback handler for LangChain integration."""
        if not self.enabled:
            return None
        
        try:
            from langfuse.callback import CallbackHandler
            
            return CallbackHandler(
                public_key=settings.LANGFUSE_PUBLIC_KEY,
                secret_key=settings.LANGFUSE_SECRET_KEY,
                host=settings.LANGFUSE_HOST
            )
        except ImportError:
            logger.warning("Langfuse callback handler not available")
            return None
