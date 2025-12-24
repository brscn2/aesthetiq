"""Test fixtures for Clothing Recommender service."""
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def sample_chat_request():
    """Sample chat request payload."""
    return {
        "message": "Find me a jacket for work",
        "user_id": "test-user-123",
        "session_id": None,
        "context": {}
    }


@pytest.fixture
def sample_general_request():
    """Sample general conversation request."""
    return {
        "message": "What colors suit warm skin tones?",
        "user_id": "test-user-123",
        "session_id": None,
        "context": {}
    }
