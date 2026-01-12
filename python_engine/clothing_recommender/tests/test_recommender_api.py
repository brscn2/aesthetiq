"""Tests for the recommender API endpoints."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import FastAPI

from app.api.v1.endpoints.recommender import router


@pytest.fixture
def app_with_recommender():
    """Create test app with recommender router."""
    app = FastAPI()
    app.include_router(router, prefix="/recommend")
    
    # Mock recommender graph
    mock_recommender = MagicMock()
    app.state.recommender_graph = mock_recommender
    
    return app, mock_recommender


@pytest.fixture
def client(app_with_recommender):
    """Create test client."""
    app, _ = app_with_recommender
    return TestClient(app)


class TestRecommendEndpoint:
    """Tests for POST /recommend endpoint."""
    
    def test_recommend_success(self, app_with_recommender):
        """Test successful recommendation."""
        app, mock_recommender = app_with_recommender
        
        mock_recommender.recommend = AsyncMock(return_value={
            "item_ids": ["item1", "item2", "item3"],
            "message": None,
            "session_id": "session_123",
            "iterations": 1,
            "metadata": {"success": True},
        })
        
        with TestClient(app) as client:
            response = client.post(
                "/recommend",
                json={
                    "message": "Find me a jacket for a party",
                    "user_id": "user_123",
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert len(data["item_ids"]) == 3
            assert data["iterations"] == 1
    
    def test_recommend_no_results(self, app_with_recommender):
        """Test recommendation with no results."""
        app, mock_recommender = app_with_recommender
        
        mock_recommender.recommend = AsyncMock(return_value={
            "item_ids": [],
            "message": "No matching items found.",
            "session_id": "session_123",
            "iterations": 3,
            "metadata": {"success": False, "fallback": True},
        })
        
        with TestClient(app) as client:
            response = client.post(
                "/recommend",
                json={
                    "message": "Find me a rare vintage piece",
                    "user_id": "user_123",
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["item_ids"] == []
            assert data["message"] is not None
            assert data["iterations"] == 3
    
    def test_recommend_with_session_id(self, app_with_recommender):
        """Test recommendation with provided session ID."""
        app, mock_recommender = app_with_recommender
        
        mock_recommender.recommend = AsyncMock(return_value={
            "item_ids": ["item1"],
            "message": None,
            "session_id": "my_session",
            "iterations": 1,
            "metadata": {},
        })
        
        with TestClient(app) as client:
            response = client.post(
                "/recommend",
                json={
                    "message": "Find me jeans",
                    "user_id": "user_123",
                    "session_id": "my_session",
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["session_id"] == "my_session"
    
    def test_recommend_missing_message(self, app_with_recommender):
        """Test recommendation with missing message."""
        app, _ = app_with_recommender
        
        with TestClient(app) as client:
            response = client.post(
                "/recommend",
                json={
                    "user_id": "user_123",
                }
            )
            
            assert response.status_code == 422  # Validation error
    
    def test_recommend_missing_user_id(self, app_with_recommender):
        """Test recommendation with missing user_id."""
        app, _ = app_with_recommender
        
        with TestClient(app) as client:
            response = client.post(
                "/recommend",
                json={
                    "message": "Find me clothes",
                }
            )
            
            assert response.status_code == 422  # Validation error
    
    def test_recommend_empty_message(self, app_with_recommender):
        """Test recommendation with empty message."""
        app, _ = app_with_recommender
        
        with TestClient(app) as client:
            response = client.post(
                "/recommend",
                json={
                    "message": "   ",
                    "user_id": "user_123",
                }
            )
            
            assert response.status_code == 422  # Validation error
    
    def test_recommend_service_unavailable(self, app_with_recommender):
        """Test recommendation when service not initialized."""
        app, _ = app_with_recommender
        app.state.recommender_graph = None  # Remove recommender
        
        with TestClient(app) as client:
            response = client.post(
                "/recommend",
                json={
                    "message": "Find me clothes",
                    "user_id": "user_123",
                }
            )
            
            assert response.status_code == 503


class TestRecommendStreamEndpoint:
    """Tests for POST /recommend/stream endpoint."""
    
    def test_stream_response_type(self, app_with_recommender):
        """Test that stream endpoint returns SSE content type."""
        app, mock_recommender = app_with_recommender
        
        async def mock_stream(*args, **kwargs):
            from app.agents.recommender.graph import StreamEvent, StreamEventType
            yield StreamEvent(type=StreamEventType.STAGE, data={"stage": "analyzing"})
            yield StreamEvent(type=StreamEventType.DONE, data={"success": True})
        
        mock_recommender.recommend_stream = mock_stream
        
        with TestClient(app) as client:
            response = client.post(
                "/recommend/stream",
                json={
                    "message": "Find me a jacket",
                    "user_id": "user_123",
                }
            )
            
            assert response.status_code == 200
            assert "text/event-stream" in response.headers["content-type"]
    
    def test_stream_service_unavailable(self, app_with_recommender):
        """Test stream when service not initialized."""
        app, _ = app_with_recommender
        app.state.recommender_graph = None
        
        with TestClient(app) as client:
            response = client.post(
                "/recommend/stream",
                json={
                    "message": "Find me clothes",
                    "user_id": "user_123",
                }
            )
            
            # Stream endpoint catches error and returns it in stream
            assert response.status_code == 200
            assert "error" in response.text
