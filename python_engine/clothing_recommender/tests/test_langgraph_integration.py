"""Tests for LangGraphService with RecommenderGraph integration."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.llm.langgraph_service import (
    LangGraphService,
    StreamEvent,
    StreamEventType,
    Route,
)
from app.agents.recommender import RecommenderGraph, RecommenderStage
from app.agents.recommender.graph import StreamEventType as RecommenderEventType
from app.agents.recommender.graph import StreamEvent as RecommenderStreamEvent


@pytest.fixture
def mock_llm_service():
    """Create mock LLM service."""
    service = MagicMock()
    service.generate_response = AsyncMock(return_value="I can help you with that!")
    return service


@pytest.fixture
def mock_recommender_graph():
    """Create mock recommender graph."""
    graph = MagicMock(spec=RecommenderGraph)
    
    # Mock recommend method
    graph.recommend = AsyncMock(return_value={
        "item_ids": ["item_1", "item_2", "item_3"],
        "message": None,
        "iterations": 1,
        "metadata": {"success": True},
    })
    
    # Mock recommend_stream method
    async def mock_stream(*args, **kwargs):
        yield RecommenderStreamEvent(
            type=RecommenderEventType.STAGE,
            data={"stage": "analyzing", "node": "analyze", "iteration": 1}
        )
        yield RecommenderStreamEvent(
            type=RecommenderEventType.STAGE,
            data={"stage": "searching", "node": "search", "iteration": 1}
        )
        yield RecommenderStreamEvent(
            type=RecommenderEventType.RESULT,
            data={"item_ids": ["item_1", "item_2"], "count": 2}
        )
        yield RecommenderStreamEvent(
            type=RecommenderEventType.DONE,
            data={"success": True, "session_id": "test_session", "total_iterations": 1}
        )
    
    graph.recommend_stream = mock_stream
    return graph


@pytest.fixture
def langgraph_service(mock_llm_service, mock_recommender_graph):
    """Create LangGraphService with mocked dependencies."""
    with patch('app.services.llm.langgraph_service.LangfuseService') as mock_langfuse:
        mock_langfuse.return_value.log_event = MagicMock()
        mock_langfuse.return_value.create_trace_context = MagicMock(return_value={})
        
        service = LangGraphService(
            llm_service=mock_llm_service,
            recommender_graph=mock_recommender_graph,
        )
        return service


class TestLangGraphServiceInit:
    """Test LangGraphService initialization."""
    
    def test_init_with_recommender_graph(self, mock_llm_service, mock_recommender_graph):
        """Test that LangGraphService accepts recommender_graph parameter."""
        with patch('app.services.llm.langgraph_service.LangfuseService'):
            service = LangGraphService(
                llm_service=mock_llm_service,
                recommender_graph=mock_recommender_graph,
            )
            
            assert service.recommender_graph is mock_recommender_graph
    
    def test_init_creates_recommender_if_not_provided(self, mock_llm_service):
        """Test that LangGraphService creates recommender graph if not provided."""
        with patch('app.services.llm.langgraph_service.LangfuseService'):
            with patch('app.services.llm.langgraph_service.RecommenderGraph') as mock_graph_class:
                mock_graph_class.return_value = MagicMock()
                
                service = LangGraphService(llm_service=mock_llm_service)
                
                mock_graph_class.assert_called_once_with(llm_service=mock_llm_service)


class TestHandleClothingQuery:
    """Test _handle_clothing_query method."""
    
    @pytest.mark.asyncio
    async def test_handle_clothing_query_calls_recommender(self, langgraph_service):
        """Test that clothing query routes to recommender."""
        state = {
            "message": "find me a blue shirt",
            "user_id": "user_123",
            "session_id": "session_456",
            "route": Route.CLOTHING.value,
            "context": {},
            "metadata": {},
            "trace_context": {},
        }
        
        result = await langgraph_service._handle_clothing_query(state)
        
        # Verify recommender was called
        langgraph_service.recommender_graph.recommend.assert_called_once_with(
            user_query="find me a blue shirt",
            user_id="user_123",
            session_id="session_456",
        )
        
        # Verify response was formatted
        assert "item" in result["response"].lower() or "found" in result["response"].lower()
        assert result["clothing_data"]["item_ids"] == ["item_1", "item_2", "item_3"]
        assert result["clothing_data"]["count"] == 3
        assert result["metadata"]["agent_used"] == "RecommenderGraph"
    
    @pytest.mark.asyncio
    async def test_handle_clothing_query_no_results(self, langgraph_service, mock_recommender_graph):
        """Test handling when no items are found."""
        mock_recommender_graph.recommend = AsyncMock(return_value={
            "item_ids": [],
            "message": "No matching items found",
            "iterations": 2,
            "metadata": {},
        })
        
        state = {
            "message": "find purple unicorn shoes",
            "user_id": "user_123",
            "session_id": "session_456",
            "route": Route.CLOTHING.value,
            "context": {},
            "metadata": {},
            "trace_context": {},
        }
        
        result = await langgraph_service._handle_clothing_query(state)
        
        assert result["clothing_data"]["item_ids"] == []
        assert result["clothing_data"]["fallback"] is True
        assert "No matching items" in result["response"]
    
    @pytest.mark.asyncio
    async def test_handle_clothing_query_error(self, langgraph_service, mock_recommender_graph):
        """Test error handling in clothing query."""
        mock_recommender_graph.recommend = AsyncMock(side_effect=Exception("DB connection failed"))
        
        state = {
            "message": "find me shoes",
            "user_id": "user_123",
            "session_id": "session_456",
            "route": Route.CLOTHING.value,
            "context": {},
            "metadata": {},
            "trace_context": {},
        }
        
        result = await langgraph_service._handle_clothing_query(state)
        
        assert "trouble" in result["response"].lower()
        assert result["clothing_data"]["error"] == "DB connection failed"


class TestStreamMessage:
    """Test stream_message method with recommender integration."""
    
    @pytest.mark.asyncio
    async def test_stream_clothing_query(self, langgraph_service):
        """Test streaming clothing query through recommender."""
        # Mock classification to return clothing route
        langgraph_service._classify_intent = AsyncMock(return_value={
            "message": "find blue jacket",
            "user_id": "user_123",
            "session_id": "session_456",
            "route": Route.CLOTHING.value,
            "context": {},
            "metadata": {},
        })
        
        events = []
        async for event in langgraph_service.stream_message(
            message="find blue jacket",
            user_id="user_123",
            session_id="session_456",
        ):
            events.append(event)
        
        # Verify event types
        event_types = [e.type for e in events]
        
        # Should have: STATUS (understanding), METADATA (route), STATUS (starting), 
        # RECOMMENDER_STAGE events, CLOTHING_RESULT, CHUNK, DONE
        assert StreamEventType.STATUS in event_types
        assert StreamEventType.METADATA in event_types
        assert StreamEventType.RECOMMENDER_STAGE in event_types
        assert StreamEventType.CLOTHING_RESULT in event_types
        assert StreamEventType.CHUNK in event_types
        assert StreamEventType.DONE in event_types
    
    @pytest.mark.asyncio
    async def test_stream_general_query(self, langgraph_service, mock_llm_service):
        """Test streaming general (non-clothing) query."""
        # Mock classification to return general route
        langgraph_service._classify_intent = AsyncMock(return_value={
            "message": "what is fashion?",
            "user_id": "user_123",
            "session_id": "session_456",
            "route": Route.GENERAL.value,
            "context": {},
            "metadata": {},
        })
        
        # Mock stream_response
        async def mock_stream(*args, **kwargs):
            yield "Fashion "
            yield "is "
            yield "style."
        
        mock_llm_service.stream_response = mock_stream
        
        events = []
        async for event in langgraph_service.stream_message(
            message="what is fashion?",
            user_id="user_123",
            session_id="session_456",
        ):
            events.append(event)
        
        event_types = [e.type for e in events]
        
        # General route should NOT have recommender events
        assert StreamEventType.RECOMMENDER_STAGE not in event_types
        assert StreamEventType.CLOTHING_RESULT not in event_types
        
        # Should have chunks from LLM
        assert StreamEventType.CHUNK in event_types


class TestFormatClothingResponse:
    """Test _format_clothing_response helper method."""
    
    def test_format_single_item(self, langgraph_service):
        """Test formatting response for single item."""
        result = langgraph_service._format_clothing_response(["item_1"], "find a shirt")
        assert "1 item" in result
    
    def test_format_few_items(self, langgraph_service):
        """Test formatting response for few items."""
        result = langgraph_service._format_clothing_response(
            ["item_1", "item_2", "item_3"], "find shirts"
        )
        assert "3 items" in result
    
    def test_format_many_items(self, langgraph_service):
        """Test formatting response for many items."""
        items = [f"item_{i}" for i in range(10)]
        result = langgraph_service._format_clothing_response(items, "find clothes")
        assert "10 items" in result
        assert "Great" in result or "great" in result.lower()
