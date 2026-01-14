"""Langfuse tracing service for LLM observability."""
from typing import Dict, Any, Optional, List
from datetime import datetime
import uuid

from app.core.config import get_settings
from app.core.logger import get_logger

logger = get_logger(__name__)

# Try to import langfuse, gracefully handle if not available
try:
    from langfuse import Langfuse
    from langfuse.types import TraceContext
    LANGFUSE_AVAILABLE = True
except ImportError:
    LANGFUSE_AVAILABLE = False
    Langfuse = None
    TraceContext = None


class LangfuseTracingService:
    """
    Service for tracing LLM calls, tool calls, and agent transitions.
    
    Provides comprehensive observability for the multi-agent workflow.
    Uses Langfuse SDK v3 API.
    """
    
    def __init__(self):
        """Initialize the Langfuse tracing service."""
        self.settings = get_settings()
        self.enabled = self.settings.LANGFUSE_ENABLED and LANGFUSE_AVAILABLE
        self._client: Optional[Any] = None
        self._traces: Dict[str, Any] = {}  # Store trace contexts
        self._spans: Dict[str, Any] = {}   # Store active spans
        
        if self.enabled:
            self._init_client()
        else:
            if not LANGFUSE_AVAILABLE:
                logger.warning("Langfuse package not installed. Tracing disabled.")
            else:
                logger.info("Langfuse tracing disabled in settings.")
    
    def _init_client(self) -> None:
        """Initialize the Langfuse client."""
        if not self.settings.LANGFUSE_PUBLIC_KEY or not self.settings.LANGFUSE_SECRET_KEY:
            logger.warning("Langfuse API keys not configured. Tracing disabled.")
            self.enabled = False
            return
        
        try:
            self._client = Langfuse(
                public_key=self.settings.LANGFUSE_PUBLIC_KEY,
                secret_key=self.settings.LANGFUSE_SECRET_KEY,
                host=self.settings.LANGFUSE_HOST,
            )
            logger.info(f"Langfuse client initialized (host: {self.settings.LANGFUSE_HOST})")
        except Exception as e:
            logger.error(f"Failed to initialize Langfuse client: {e}")
            self.enabled = False
    
    def start_trace(
        self,
        user_id: str,
        session_id: str,
        name: str = "conversation",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Start a new trace for a conversation.
        
        Args:
            user_id: The user's identifier
            session_id: The session identifier
            name: Trace name
            metadata: Additional metadata
            
        Returns:
            Trace ID
        """
        # Generate a unique trace ID
        trace_id = self._client.create_trace_id() if self.enabled and self._client else f"trace_{uuid.uuid4().hex[:16]}"
        
        if not self.enabled:
            logger.debug(f"Tracing disabled, returning mock trace ID: {trace_id}")
            return trace_id
        
        try:
            # Create trace context (Langfuse v3 API)
            trace_context = TraceContext(
                trace_id=trace_id,
                user_id=user_id,
                session_id=session_id,
                tags=[name],
                metadata=metadata or {},
            )
            
            # Store the trace context for later use
            self._traces[trace_id] = {
                "context": trace_context,
                "name": name,
                "user_id": user_id,
                "session_id": session_id,
                "metadata": metadata or {},
            }
            
            logger.debug(f"Started trace: {trace_id}")
            return trace_id
        except Exception as e:
            logger.error(f"Failed to start trace: {e}")
            return trace_id
    
    def log_llm_call(
        self,
        trace_id: str,
        agent_name: str,
        input_text: str,
        output_text: str,
        model: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> Optional[str]:
        """
        Log an LLM call as a generation span.
        
        Args:
            trace_id: The parent trace ID
            agent_name: Name of the agent making the call
            input_text: Input to the LLM
            output_text: Output from the LLM
            model: Model name (defaults to settings)
            metadata: Additional metadata
            start_time: When the call started
            end_time: When the call ended
            
        Returns:
            Span ID or None if tracing disabled
        """
        if not self.enabled:
            return None
        
        trace_data = self._traces.get(trace_id)
        if not trace_data:
            logger.warning(f"Trace not found: {trace_id}")
            return None
        
        try:
            trace_context = trace_data["context"]
            
            # Start a generation span
            generation = self._client.start_generation(
                trace_context=trace_context,
                name=f"{agent_name}_llm_call",
                model=model or self.settings.OPENAI_MODEL,
                input=input_text,
                metadata=metadata or {},
            )
            
            # Update with output and end
            generation.update(output=output_text)
            generation.end()
            
            span_id = f"gen_{uuid.uuid4().hex[:8]}"
            self._spans[span_id] = generation
            logger.debug(f"Logged LLM call for {agent_name}: {span_id}")
            return span_id
        except Exception as e:
            logger.error(f"Failed to log LLM call: {e}")
            return None
    
    def log_tool_call(
        self,
        trace_id: str,
        tool_name: str,
        input_params: Dict[str, Any],
        output: Any,
        duration_ms: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """
        Log an MCP tool call as a span.
        
        Args:
            trace_id: The parent trace ID
            tool_name: Name of the tool
            input_params: Input parameters to the tool
            output: Output from the tool
            duration_ms: Duration in milliseconds
            metadata: Additional metadata
            
        Returns:
            Span ID or None if tracing disabled
        """
        if not self.enabled:
            return None
        
        trace_data = self._traces.get(trace_id)
        if not trace_data:
            logger.warning(f"Trace not found: {trace_id}")
            return None
        
        try:
            trace_context = trace_data["context"]
            
            # Start a span for the tool call
            span = self._client.start_span(
                trace_context=trace_context,
                name=f"tool_{tool_name}",
                input=input_params,
                metadata={
                    **(metadata or {}),
                    "duration_ms": duration_ms,
                    "tool_type": "mcp",
                },
            )
            
            # Update with output and end
            span.update(output=output if isinstance(output, (dict, list, str)) else str(output))
            span.end()
            
            span_id = f"span_{uuid.uuid4().hex[:8]}"
            self._spans[span_id] = span
            logger.debug(f"Logged tool call: {tool_name}")
            return span_id
        except Exception as e:
            logger.error(f"Failed to log tool call: {e}")
            return None
    
    def log_agent_transition(
        self,
        trace_id: str,
        from_agent: str,
        to_agent: str,
        state_snapshot: Optional[Dict[str, Any]] = None,
        reason: Optional[str] = None,
    ) -> Optional[str]:
        """
        Log an agent transition event.
        
        Args:
            trace_id: The parent trace ID
            from_agent: Source agent name
            to_agent: Target agent name
            state_snapshot: Current state (will be sanitized)
            reason: Reason for transition
            
        Returns:
            Event ID or None if tracing disabled
        """
        if not self.enabled:
            return None
        
        trace_data = self._traces.get(trace_id)
        if not trace_data:
            logger.warning(f"Trace not found: {trace_id}")
            return None
        
        try:
            trace_context = trace_data["context"]
            
            # Sanitize state snapshot (remove large/sensitive data)
            sanitized_state = self._sanitize_state(state_snapshot) if state_snapshot else {}
            
            # Create a span for the transition event
            span = self._client.start_span(
                trace_context=trace_context,
                name="agent_transition",
                input={
                    "from_agent": from_agent,
                    "to_agent": to_agent,
                    "reason": reason,
                },
            )
            span.update(output=sanitized_state)
            span.end()
            
            event_id = f"event_{uuid.uuid4().hex[:8]}"
            logger.debug(f"Logged transition: {from_agent} -> {to_agent}")
            return event_id
        except Exception as e:
            logger.error(f"Failed to log agent transition: {e}")
            return None
    
    def log_error(
        self,
        trace_id: str,
        error: Exception,
        context: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Log an error event.
        
        Args:
            trace_id: The parent trace ID
            error: The exception
            context: Additional context
        """
        if not self.enabled:
            return
        
        trace_data = self._traces.get(trace_id)
        if not trace_data:
            return
        
        try:
            trace_context = trace_data["context"]
            
            span = self._client.start_span(
                trace_context=trace_context,
                name="error",
                input={
                    "error_type": type(error).__name__,
                    "error_message": str(error),
                    "context": context or {},
                },
                level="ERROR",
            )
            span.end()
            
            logger.debug(f"Logged error: {type(error).__name__}")
        except Exception as e:
            logger.error(f"Failed to log error: {e}")
    
    def end_trace(
        self,
        trace_id: str,
        output: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        End a trace and finalize it.
        
        Args:
            trace_id: The trace ID to end
            output: Final output
            metadata: Final metadata
        """
        if not self.enabled:
            return
        
        trace_data = self._traces.pop(trace_id, None)
        if not trace_data:
            logger.warning(f"Trace not found for ending: {trace_id}")
            return
        
        try:
            # In Langfuse v3, we use update_current_trace or just log a final event
            trace_context = trace_data["context"]
            
            # Create a final "complete" span to mark the trace end
            span = self._client.start_span(
                trace_context=trace_context,
                name="trace_complete",
                input={"trace_id": trace_id},
                metadata=metadata or {},
            )
            span.update(output={"response": output} if output else {})
            span.end()
            
            logger.debug(f"Ended trace: {trace_id}")
        except Exception as e:
            logger.error(f"Failed to end trace: {e}")
    
    def _sanitize_state(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitize state for logging (remove large/sensitive data).
        
        Args:
            state: State dictionary
            
        Returns:
            Sanitized state dictionary
        """
        sanitized = {}
        
        # Keys to include (non-sensitive, small data)
        include_keys = [
            "user_id", "session_id", "intent", "search_scope",
            "needs_clarification", "iteration", "fallback_used",
        ]
        
        # Keys to summarize (large data)
        summarize_keys = {
            "retrieved_items": lambda v: f"{len(v)} items" if v else "0 items",
            "conversation_history": lambda v: f"{len(v)} messages" if v else "0 messages",
            "streaming_events": lambda v: f"{len(v)} events" if v else "0 events",
        }
        
        for key in include_keys:
            if key in state:
                sanitized[key] = state[key]
        
        for key, summarizer in summarize_keys.items():
            if key in state:
                sanitized[key] = summarizer(state[key])
        
        return sanitized
    
    def flush(self) -> None:
        """Flush all pending traces."""
        if self.enabled and self._client:
            try:
                self._client.flush()
                logger.debug("Flushed Langfuse client")
            except Exception as e:
                logger.error(f"Failed to flush Langfuse client: {e}")
    
    def shutdown(self) -> None:
        """Shutdown the tracing service."""
        self.flush()
        self._traces.clear()
        self._spans.clear()
        if self.enabled and self._client:
            try:
                self._client.shutdown()
            except Exception:
                pass
        logger.info("Langfuse tracing service shut down")


# Global tracing service instance
_tracing_service: Optional[LangfuseTracingService] = None


def get_tracing_service() -> LangfuseTracingService:
    """Get the global tracing service instance."""
    global _tracing_service
    
    if _tracing_service is None:
        _tracing_service = LangfuseTracingService()
    
    return _tracing_service
