"""Tests for the recommender graph."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.agents.recommender.graph import (
    RecommenderGraph,
    NodeName,
    StreamEventType,
    StreamEvent,
)
from app.agents.recommender.state import RecommenderState, RecommenderStage


class TestStreamEvent:
    """Tests for StreamEvent class."""
    
    def test_to_sse(self):
        """Test SSE formatting."""
        event = StreamEvent(
            type=StreamEventType.STAGE,
            data={"stage": "searching", "iteration": 1}
        )
        
        sse = event.to_sse()
        
        assert "event: stage" in sse
        assert "data:" in sse
        assert "searching" in sse
        assert sse.endswith("\n\n")
    
    def test_to_sse_result(self):
        """Test SSE formatting for result event."""
        event = StreamEvent(
            type=StreamEventType.RESULT,
            data={"item_ids": ["id1", "id2"], "count": 2}
        )
        
        sse = event.to_sse()
        
        assert "event: result" in sse
        assert "id1" in sse


class TestRecommenderGraph:
    """Tests for RecommenderGraph class."""
    
    @pytest.fixture
    def mock_llm_service(self):
        """Create mock LLM service."""
        return MagicMock()
    
    @pytest.fixture
    def mock_embedding_client(self):
        """Create mock embedding client."""
        client = AsyncMock()
        client.embed_text.return_value = [0.1] * 512
        return client
    
    @pytest.fixture
    def mock_wardrobe_repo(self):
        """Create mock wardrobe repository."""
        repo = AsyncMock()
        repo.vector_search.return_value = [
            {"_id": "item1", "category": "TOP", "score": 0.9},
            {"_id": "item2", "category": "TOP", "score": 0.85},
            {"_id": "item3", "category": "TOP", "score": 0.8},
        ]
        return repo
    
    @pytest.fixture
    def mock_profile_repo(self):
        """Create mock profile repository."""
        repo = AsyncMock()
        repo.get_by_user_id.return_value = {
            "userId": "user_123",
            "archetype": "Minimalist",
            "sliders": {"formal": 70, "colorful": 50},
            "favoriteBrands": ["Zara"],
        }
        return repo
    
    def test_create_initial_state(self, mock_llm_service):
        """Test initial state creation."""
        graph = RecommenderGraph.__new__(RecommenderGraph)
        graph.llm_service = mock_llm_service
        
        state = graph._create_initial_state(
            user_query="Find me a jacket",
            user_id="user_123",
            session_id="session_123",
        )
        
        assert state["user_query"] == "Find me a jacket"
        assert state["user_id"] == "user_123"
        assert state["iteration"] == 0
        assert state["filters"] == {}
    
    def test_route_after_analyze_needs_profile(self, mock_llm_service):
        """Test routing to profile fetcher when needed."""
        graph = RecommenderGraph.__new__(RecommenderGraph)
        graph.llm_service = mock_llm_service
        
        state: RecommenderState = {
            "needs_profile": True,
            "user_profile": None,
            "iteration": 0,
        }
        
        result = graph._route_after_analyze(state)
        
        assert result == NodeName.FETCH_PROFILE.value
    
    def test_route_after_analyze_skip_profile(self, mock_llm_service):
        """Test skipping profile fetcher when not needed."""
        graph = RecommenderGraph.__new__(RecommenderGraph)
        graph.llm_service = mock_llm_service
        
        state: RecommenderState = {
            "needs_profile": False,
            "user_profile": None,
            "iteration": 0,
        }
        
        result = graph._route_after_analyze(state)
        
        assert result == NodeName.SEARCH.value
    
    def test_route_after_analyze_profile_exists(self, mock_llm_service):
        """Test skipping profile fetcher when profile already loaded."""
        graph = RecommenderGraph.__new__(RecommenderGraph)
        graph.llm_service = mock_llm_service
        
        state: RecommenderState = {
            "needs_profile": True,
            "user_profile": {"userId": "user_123"},  # Already loaded
            "iteration": 1,
        }
        
        result = graph._route_after_analyze(state)
        
        assert result == NodeName.SEARCH.value
    
    def test_route_after_verify_sufficient(self, mock_llm_service):
        """Test routing to respond when results are sufficient."""
        graph = RecommenderGraph.__new__(RecommenderGraph)
        graph.llm_service = mock_llm_service
        
        state: RecommenderState = {
            "is_sufficient": True,
            "iteration": 0,
        }
        
        result = graph._route_after_verify(state)
        
        assert result == NodeName.RESPOND.value
    
    def test_route_after_verify_max_iterations(self, mock_llm_service):
        """Test routing to respond at max iterations."""
        graph = RecommenderGraph.__new__(RecommenderGraph)
        graph.llm_service = mock_llm_service
        
        state: RecommenderState = {
            "is_sufficient": False,
            "iteration": 2,  # 0, 1, 2 = 3 iterations
        }
        
        with patch('app.agents.recommender.graph.settings') as mock_settings:
            mock_settings.RECOMMENDER_MAX_ITERATIONS = 3
            result = graph._route_after_verify(state)
        
        assert result == NodeName.RESPOND.value
    
    def test_route_after_verify_retry(self, mock_llm_service):
        """Test routing to retry when insufficient results."""
        graph = RecommenderGraph.__new__(RecommenderGraph)
        graph.llm_service = mock_llm_service
        
        state: RecommenderState = {
            "is_sufficient": False,
            "iteration": 0,
        }
        
        with patch('app.agents.recommender.graph.settings') as mock_settings:
            mock_settings.RECOMMENDER_MAX_ITERATIONS = 3
            result = graph._route_after_verify(state)
        
        assert result == NodeName.ANALYZE.value


class TestNodeName:
    """Tests for NodeName enum."""
    
    def test_node_names(self):
        """Test all node names are defined."""
        assert NodeName.ANALYZE.value == "analyze"
        assert NodeName.FETCH_PROFILE.value == "fetch_profile"
        assert NodeName.SEARCH.value == "search"
        assert NodeName.VERIFY.value == "verify"
        assert NodeName.RESPOND.value == "respond"


class TestStreamEventType:
    """Tests for StreamEventType enum."""
    
    def test_event_types(self):
        """Test all event types are defined."""
        assert StreamEventType.STAGE.value == "stage"
        assert StreamEventType.RESULT.value == "result"
        assert StreamEventType.DONE.value == "done"
        assert StreamEventType.ERROR.value == "error"
