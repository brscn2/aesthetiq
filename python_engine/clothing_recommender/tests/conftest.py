"""Test fixtures for Clothing Recommender service."""
import pytest
from unittest.mock import AsyncMock, MagicMock
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


@pytest.fixture
def sample_recommend_request():
    """Sample recommendation request payload."""
    return {
        "message": "Find me party clothes",
        "user_id": "test-user-123",
        "session_id": "test-session-123",
    }


@pytest.fixture
def mock_llm_service():
    """Create a mock LangChain service."""
    service = MagicMock()
    service.generate_response = AsyncMock(return_value="Mock LLM response")
    return service


@pytest.fixture
def mock_embedding_client():
    """Create a mock embedding client."""
    client = AsyncMock()
    client.embed_text = AsyncMock(return_value=[0.1] * 512)
    client.health_check = AsyncMock(return_value=True)
    return client


@pytest.fixture
def mock_wardrobe_repo():
    """Create a mock wardrobe repository."""
    repo = AsyncMock()
    repo.vector_search = AsyncMock(return_value=[
        {
            "_id": "6938855c485e1f7c84ad1145",
            "category": "TOP",
            "subCategory": "Jacket",
            "brand": "Zara",
            "colorHex": "#000000",
            "score": 0.95,
        },
        {
            "_id": "6938855d485e1f7c84ad1146",
            "category": "TOP",
            "subCategory": "Blazer",
            "brand": "COS",
            "colorHex": "#1a1a1a",
            "score": 0.90,
        },
        {
            "_id": "6938855e485e1f7c84ad1147",
            "category": "TOP",
            "subCategory": "Shirt",
            "brand": "Nike",
            "colorHex": "#ffffff",
            "score": 0.85,
        },
    ])
    repo.get_by_ids = AsyncMock(return_value=[])
    repo.count_items = AsyncMock(return_value=100)
    return repo


@pytest.fixture
def mock_profile_repo():
    """Create a mock profile repository."""
    repo = AsyncMock()
    repo.get_by_user_id = AsyncMock(return_value={
        "userId": "test-user-123",
        "archetype": "Minimalist",
        "sliders": {"formal": 70, "colorful": 50},
        "favoriteBrands": ["Zara", "COS"],
        "sizes": {"top": "M", "bottom": "32"},
        "negativeConstraints": [],
    })
    repo.has_profile = AsyncMock(return_value=True)
    return repo


@pytest.fixture
def sample_search_results():
    """Sample vector search results."""
    return [
        {
            "_id": "item1",
            "userId": "admin",
            "imageUrl": "https://example.com/1.jpg",
            "category": "TOP",
            "subCategory": "Jacket",
            "brand": "Zara",
            "colorHex": "#000000",
            "isFavorite": False,
            "score": 0.95,
        },
        {
            "_id": "item2",
            "userId": "admin",
            "imageUrl": "https://example.com/2.jpg",
            "category": "TOP",
            "subCategory": "Blazer",
            "brand": "COS",
            "colorHex": "#1a1a1a",
            "isFavorite": True,
            "score": 0.90,
        },
        {
            "_id": "item3",
            "userId": "admin",
            "imageUrl": "https://example.com/3.jpg",
            "category": "BOTTOM",
            "subCategory": "Jeans",
            "brand": "Zara",
            "colorHex": "#494947",
            "isFavorite": False,
            "score": 0.85,
        },
    ]


@pytest.fixture
def sample_user_profile():
    """Sample user style profile."""
    return {
        "userId": "test-user-123",
        "archetype": "Minimalist",
        "sliders": {
            "formal": 74,
            "colorful": 66,
        },
        "favoriteBrands": ["Zara", "Nike", "COS"],
        "sizes": {
            "top": "L",
            "bottom": "42",
            "shoe": "40",
        },
        "negativeConstraints": [],
    }

