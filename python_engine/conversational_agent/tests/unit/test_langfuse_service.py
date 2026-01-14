"""Unit tests for the Langfuse tracing service."""
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime

from app.services.tracing.langfuse_service import (
    LangfuseTracingService,
    get_tracing_service,
)


class TestLangfuseTracingService:
    """Tests for LangfuseTracingService."""
    
    def test_create_service_disabled(self):
        """Test creating service when disabled."""
        with patch("app.services.tracing.langfuse_service.get_settings") as mock_settings:
            mock_settings.return_value.LANGFUSE_ENABLED = False
            mock_settings.return_value.LANGFUSE_PUBLIC_KEY = None
            mock_settings.return_value.LANGFUSE_SECRET_KEY = None
            mock_settings.return_value.LANGFUSE_HOST = "https://cloud.langfuse.com"
            
            service = LangfuseTracingService()
            
            assert service.enabled is False
    
    def test_start_trace_when_disabled(self):
        """Test starting trace when disabled returns mock ID."""
        with patch("app.services.tracing.langfuse_service.get_settings") as mock_settings:
            mock_settings.return_value.LANGFUSE_ENABLED = False
            mock_settings.return_value.LANGFUSE_PUBLIC_KEY = None
            mock_settings.return_value.LANGFUSE_SECRET_KEY = None
            mock_settings.return_value.LANGFUSE_HOST = "https://cloud.langfuse.com"
            
            service = LangfuseTracingService()
            trace_id = service.start_trace(
                user_id="user_123",
                session_id="session_456",
            )
            
            assert trace_id.startswith("trace_")
    
    def test_log_llm_call_when_disabled(self):
        """Test logging LLM call when disabled returns None."""
        with patch("app.services.tracing.langfuse_service.get_settings") as mock_settings:
            mock_settings.return_value.LANGFUSE_ENABLED = False
            mock_settings.return_value.LANGFUSE_PUBLIC_KEY = None
            mock_settings.return_value.LANGFUSE_SECRET_KEY = None
            mock_settings.return_value.LANGFUSE_HOST = "https://cloud.langfuse.com"
            mock_settings.return_value.OPENAI_MODEL = "gpt-4o"
            
            service = LangfuseTracingService()
            span_id = service.log_llm_call(
                trace_id="trace_123",
                agent_name="conversation_agent",
                input_text="Hello",
                output_text="Hi there!",
            )
            
            assert span_id is None
    
    def test_log_tool_call_when_disabled(self):
        """Test logging tool call when disabled returns None."""
        with patch("app.services.tracing.langfuse_service.get_settings") as mock_settings:
            mock_settings.return_value.LANGFUSE_ENABLED = False
            mock_settings.return_value.LANGFUSE_PUBLIC_KEY = None
            mock_settings.return_value.LANGFUSE_SECRET_KEY = None
            mock_settings.return_value.LANGFUSE_HOST = "https://cloud.langfuse.com"
            
            service = LangfuseTracingService()
            span_id = service.log_tool_call(
                trace_id="trace_123",
                tool_name="search",
                input_params={"query": "jacket"},
                output={"items": []},
            )
            
            assert span_id is None
    
    def test_log_agent_transition_when_disabled(self):
        """Test logging agent transition when disabled returns None."""
        with patch("app.services.tracing.langfuse_service.get_settings") as mock_settings:
            mock_settings.return_value.LANGFUSE_ENABLED = False
            mock_settings.return_value.LANGFUSE_PUBLIC_KEY = None
            mock_settings.return_value.LANGFUSE_SECRET_KEY = None
            mock_settings.return_value.LANGFUSE_HOST = "https://cloud.langfuse.com"
            
            service = LangfuseTracingService()
            event_id = service.log_agent_transition(
                trace_id="trace_123",
                from_agent="recommender",
                to_agent="analyzer",
            )
            
            assert event_id is None
    
    def test_log_error_when_disabled(self):
        """Test logging error when disabled (should not raise)."""
        with patch("app.services.tracing.langfuse_service.get_settings") as mock_settings:
            mock_settings.return_value.LANGFUSE_ENABLED = False
            mock_settings.return_value.LANGFUSE_PUBLIC_KEY = None
            mock_settings.return_value.LANGFUSE_SECRET_KEY = None
            mock_settings.return_value.LANGFUSE_HOST = "https://cloud.langfuse.com"
            
            service = LangfuseTracingService()
            
            # Should not raise
            service.log_error(
                trace_id="trace_123",
                error=ValueError("Test error"),
                context={"step": "testing"},
            )
    
    def test_end_trace_when_disabled(self):
        """Test ending trace when disabled (should not raise)."""
        with patch("app.services.tracing.langfuse_service.get_settings") as mock_settings:
            mock_settings.return_value.LANGFUSE_ENABLED = False
            mock_settings.return_value.LANGFUSE_PUBLIC_KEY = None
            mock_settings.return_value.LANGFUSE_SECRET_KEY = None
            mock_settings.return_value.LANGFUSE_HOST = "https://cloud.langfuse.com"
            
            service = LangfuseTracingService()
            
            # Should not raise
            service.end_trace(
                trace_id="trace_123",
                output="Final response",
            )
    
    def test_sanitize_state(self):
        """Test state sanitization."""
        with patch("app.services.tracing.langfuse_service.get_settings") as mock_settings:
            mock_settings.return_value.LANGFUSE_ENABLED = False
            mock_settings.return_value.LANGFUSE_PUBLIC_KEY = None
            mock_settings.return_value.LANGFUSE_SECRET_KEY = None
            mock_settings.return_value.LANGFUSE_HOST = "https://cloud.langfuse.com"
            
            service = LangfuseTracingService()
            
            state = {
                "user_id": "user_123",
                "session_id": "session_456",
                "intent": "clothing",
                "search_scope": "commerce",
                "retrieved_items": [{"id": "1"}, {"id": "2"}, {"id": "3"}],
                "conversation_history": [{"role": "user", "content": "Hello"}],
                "streaming_events": [{"type": "chunk"}],
                "needs_clarification": False,
                "iteration": 1,
                "fallback_used": False,
                "user_profile": {"email": "test@example.com"},  # Should be excluded
            }
            
            sanitized = service._sanitize_state(state)
            
            # Should include simple fields
            assert sanitized["user_id"] == "user_123"
            assert sanitized["intent"] == "clothing"
            assert sanitized["iteration"] == 1
            
            # Should summarize large fields
            assert sanitized["retrieved_items"] == "3 items"
            assert sanitized["conversation_history"] == "1 messages"
            
            # Should exclude sensitive fields
            assert "user_profile" not in sanitized
    
    def test_flush_when_disabled(self):
        """Test flush when disabled (should not raise)."""
        with patch("app.services.tracing.langfuse_service.get_settings") as mock_settings:
            mock_settings.return_value.LANGFUSE_ENABLED = False
            mock_settings.return_value.LANGFUSE_PUBLIC_KEY = None
            mock_settings.return_value.LANGFUSE_SECRET_KEY = None
            mock_settings.return_value.LANGFUSE_HOST = "https://cloud.langfuse.com"
            
            service = LangfuseTracingService()
            
            # Should not raise
            service.flush()
    
    def test_shutdown(self):
        """Test shutdown clears traces and spans."""
        with patch("app.services.tracing.langfuse_service.get_settings") as mock_settings:
            mock_settings.return_value.LANGFUSE_ENABLED = False
            mock_settings.return_value.LANGFUSE_PUBLIC_KEY = None
            mock_settings.return_value.LANGFUSE_SECRET_KEY = None
            mock_settings.return_value.LANGFUSE_HOST = "https://cloud.langfuse.com"
            
            service = LangfuseTracingService()
            service._traces["trace_1"] = MagicMock()
            service._spans["span_1"] = MagicMock()
            
            service.shutdown()
            
            assert len(service._traces) == 0
            assert len(service._spans) == 0


class TestGetTracingService:
    """Tests for get_tracing_service function."""
    
    def test_get_service_returns_singleton(self):
        """Test that get_tracing_service returns the same instance."""
        # Reset global for test
        import app.services.tracing.langfuse_service as module
        module._tracing_service = None
        
        with patch("app.services.tracing.langfuse_service.get_settings") as mock_settings:
            mock_settings.return_value.LANGFUSE_ENABLED = False
            mock_settings.return_value.LANGFUSE_PUBLIC_KEY = None
            mock_settings.return_value.LANGFUSE_SECRET_KEY = None
            mock_settings.return_value.LANGFUSE_HOST = "https://cloud.langfuse.com"
            
            service1 = get_tracing_service()
            service2 = get_tracing_service()
            
            assert service1 is service2
