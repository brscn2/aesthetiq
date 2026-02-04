"""Integration tests for Langfuse tracing service.

These tests require valid Langfuse credentials set via environment variables:
- LANGFUSE_PUBLIC_KEY
- LANGFUSE_SECRET_KEY
- LANGFUSE_HOST (optional, defaults to cloud.langfuse.com)
"""
import pytest
import os
import time

# Mark all tests in this module as integration tests
pytestmark = pytest.mark.integration


def langfuse_configured() -> bool:
    """Check if Langfuse credentials are configured."""
    return bool(
        os.environ.get("LANGFUSE_PUBLIC_KEY") and 
        os.environ.get("LANGFUSE_SECRET_KEY")
    )


@pytest.fixture
def fresh_tracing_service():
    """Create a fresh tracing service instance for each test."""
    # Reset the global instance
    import app.services.tracing.langfuse_service as module
    module._tracing_service = None
    
    # Import after reset to get fresh instance
    from app.services.tracing.langfuse_service import LangfuseTracingService
    service = LangfuseTracingService()
    
    yield service
    
    # Cleanup
    service.shutdown()


class TestLangfuseRealConnection:
    """Tests that verify real Langfuse connectivity."""
    
    @pytest.mark.skipif(not langfuse_configured(), reason="Langfuse credentials not configured")
    def test_service_initializes_with_credentials(self, fresh_tracing_service):
        """Test that service initializes successfully with valid credentials."""
        service = fresh_tracing_service
        
        assert service.enabled is True
        assert service._client is not None
    
    @pytest.mark.skipif(not langfuse_configured(), reason="Langfuse credentials not configured")
    def test_create_and_end_trace(self, fresh_tracing_service):
        """Test creating and ending a real trace."""
        service = fresh_tracing_service
        
        # Skip if not enabled (credentials invalid)
        if not service.enabled:
            pytest.skip("Langfuse not enabled (credentials may be invalid)")
        
        # Create trace
        trace_id = service.start_trace(
            user_id="test_user_integration",
            session_id="test_session_integration",
            name="integration_test_trace",
            metadata={"test": True, "purpose": "integration_test"},
        )
        
        assert trace_id is not None
        assert len(trace_id) > 10  # Valid UUID-like string
        assert trace_id in service._traces
        
        # End trace
        service.end_trace(
            trace_id=trace_id,
            output="Integration test completed successfully",
            metadata={"status": "success"},
        )
        
        # Trace should be removed from active traces
        assert trace_id not in service._traces
        
        # Flush to send to Langfuse
        service.flush()
    
    @pytest.mark.skipif(not langfuse_configured(), reason="Langfuse credentials not configured")
    def test_log_llm_call(self, fresh_tracing_service):
        """Test logging an LLM call to a trace."""
        service = fresh_tracing_service
        
        if not service.enabled:
            pytest.skip("Langfuse not enabled")
        
        # Create trace
        trace_id = service.start_trace(
            user_id="test_user_llm",
            session_id="test_session_llm",
            name="llm_test_trace",
        )
        
        # Log LLM call
        span_id = service.log_llm_call(
            trace_id=trace_id,
            agent_name="test_agent",
            input_text="What jacket should I wear?",
            output_text="Based on your style profile, I recommend a navy blazer.",
            model="gpt-4o",
            metadata={"test": True},
        )
        
        assert span_id is not None
        assert span_id in service._spans
        
        # End trace
        service.end_trace(trace_id=trace_id, output="LLM test completed")
        service.flush()
    
    @pytest.mark.skipif(not langfuse_configured(), reason="Langfuse credentials not configured")
    def test_log_tool_call(self, fresh_tracing_service):
        """Test logging a tool call to a trace."""
        service = fresh_tracing_service
        
        if not service.enabled:
            pytest.skip("Langfuse not enabled")
        
        # Create trace
        trace_id = service.start_trace(
            user_id="test_user_tool",
            session_id="test_session_tool",
            name="tool_test_trace",
        )
        
        # Log tool call
        span_id = service.log_tool_call(
            trace_id=trace_id,
            tool_name="search_wardrobe",
            input_params={"category": "TOP", "color": "navy"},
            output={"items": [{"id": "1", "name": "Navy Jacket"}]},
            duration_ms=150.5,
            metadata={"test": True},
        )
        
        assert span_id is not None
        assert span_id in service._spans
        
        # End trace
        service.end_trace(trace_id=trace_id, output="Tool test completed")
        service.flush()
    
    @pytest.mark.skipif(not langfuse_configured(), reason="Langfuse credentials not configured")
    def test_log_agent_transition(self, fresh_tracing_service):
        """Test logging an agent transition event."""
        service = fresh_tracing_service
        
        if not service.enabled:
            pytest.skip("Langfuse not enabled")
        
        # Create trace
        trace_id = service.start_trace(
            user_id="test_user_transition",
            session_id="test_session_transition",
            name="transition_test_trace",
        )
        
        # Log transition
        event_id = service.log_agent_transition(
            trace_id=trace_id,
            from_agent="query_analyzer",
            to_agent="clothing_recommender",
            state_snapshot={
                "user_id": "test_user",
                "intent": "clothing",
                "search_scope": "wardrobe",
                "retrieved_items": [{"id": "1"}, {"id": "2"}],
                "iteration": 1,
            },
            reason="Clothing intent detected",
        )
        
        assert event_id is not None
        
        # End trace
        service.end_trace(trace_id=trace_id, output="Transition test completed")
        service.flush()
    
    @pytest.mark.skipif(not langfuse_configured(), reason="Langfuse credentials not configured")
    def test_log_error(self, fresh_tracing_service):
        """Test logging an error event."""
        service = fresh_tracing_service
        
        if not service.enabled:
            pytest.skip("Langfuse not enabled")
        
        # Create trace
        trace_id = service.start_trace(
            user_id="test_user_error",
            session_id="test_session_error",
            name="error_test_trace",
        )
        
        # Log error
        test_error = ValueError("Test error for integration testing")
        service.log_error(
            trace_id=trace_id,
            error=test_error,
            context={"step": "integration_test", "test": True},
        )
        
        # End trace
        service.end_trace(trace_id=trace_id, output="Error test completed")
        service.flush()
    
    @pytest.mark.skipif(not langfuse_configured(), reason="Langfuse credentials not configured")
    def test_full_conversation_trace(self, fresh_tracing_service):
        """Test a complete conversation trace with multiple events."""
        service = fresh_tracing_service
        
        if not service.enabled:
            pytest.skip("Langfuse not enabled")
        
        # Create trace
        trace_id = service.start_trace(
            user_id="test_user_full",
            session_id="test_session_full",
            name="full_conversation_trace",
            metadata={"source": "integration_test"},
        )
        
        # 1. Log query analysis LLM call
        service.log_llm_call(
            trace_id=trace_id,
            agent_name="query_analyzer",
            input_text="I need a jacket for a business meeting",
            output_text='{"intent": "clothing", "search_scope": "both", "filters": {"category": "TOP", "occasion": "formal"}}',
        )
        
        # 2. Log transition to recommender
        service.log_agent_transition(
            trace_id=trace_id,
            from_agent="query_analyzer",
            to_agent="clothing_recommender",
            reason="Clothing intent detected",
        )
        
        # 3. Log tool call to search wardrobe
        service.log_tool_call(
            trace_id=trace_id,
            tool_name="search_wardrobe",
            input_params={"category": "TOP", "sub_category": "Jacket"},
            output={"items": [{"id": "w1", "name": "Navy Blazer"}]},
            duration_ms=120.0,
        )
        
        # 4. Log tool call to search commerce
        service.log_tool_call(
            trace_id=trace_id,
            tool_name="search_commerce",
            input_params={"category": "TOP", "occasion": "formal"},
            output={"items": [{"id": "c1", "name": "Gray Wool Blazer", "price": 199.99}]},
            duration_ms=250.0,
        )
        
        # 5. Log transition to analyzer
        service.log_agent_transition(
            trace_id=trace_id,
            from_agent="clothing_recommender",
            to_agent="clothing_analyzer",
            reason="Items retrieved, analyzing quality",
        )
        
        # 6. Log analysis LLM call
        service.log_llm_call(
            trace_id=trace_id,
            agent_name="clothing_analyzer",
            input_text="Analyze these items for a business meeting...",
            output_text='{"decision": "approve", "confidence": 0.92, "notes": ["Good color match", "Professional style"]}',
        )
        
        # 7. Log final response LLM call
        service.log_llm_call(
            trace_id=trace_id,
            agent_name="conversation_agent",
            input_text="Generate final response...",
            output_text="I found two great options for your business meeting: a Navy Blazer from your wardrobe and a Gray Wool Blazer available for $199.99.",
        )
        
        # End trace
        service.end_trace(
            trace_id=trace_id,
            output="I found two great options for your business meeting...",
            metadata={
                "items_retrieved": 2,
                "sources_used": ["wardrobe", "commerce"],
                "analysis_decision": "approve",
            },
        )
        
        # Flush to send all events
        service.flush()
        
        # Give a moment for flush to complete
        time.sleep(0.5)
        
        print("\n✅ Full conversation trace sent to Langfuse successfully!")
        print(f"   Trace ID: {trace_id}")
        print("   Check your Langfuse dashboard to see the trace.")
