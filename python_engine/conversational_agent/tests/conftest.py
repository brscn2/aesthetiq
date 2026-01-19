"""Pytest configuration and shared fixtures for tests."""
import pytest
from unittest.mock import AsyncMock, MagicMock
from typing import Dict, Any, List

from app.services.backend_client import BackendClient
from app.services.session.session_service import SessionService
from app.services.tracing.langfuse_service import LangfuseTracingService
from app.mcp.client import MCPClient


@pytest.fixture
def mock_backend_client() -> AsyncMock:
    """Create a mock backend client."""
    client = AsyncMock(spec=BackendClient)
    client.create_session.return_value = {
        "sessionId": "test-session-123",
        "userId": "test-user-123",
        "title": "Test Session",
        "messages": [],
    }
    client.get_session.return_value = {
        "sessionId": "test-session-123",
        "userId": "test-user-123",
        "title": "Test Session",
        "messages": [
            {"role": "user", "content": "Hello", "timestamp": "2024-01-01T00:00:00Z"},
            {"role": "assistant", "content": "Hi there!", "timestamp": "2024-01-01T00:00:01Z"},
        ],
    }
    client.add_message.return_value = None
    return client


@pytest.fixture
def mock_session_service(mock_backend_client: AsyncMock) -> SessionService:
    """Create a session service with mocked backend client."""
    return SessionService(backend_client=mock_backend_client)


@pytest.fixture
def mock_langfuse_client() -> MagicMock:
    """Create a mock Langfuse client."""
    client = MagicMock()
    client.trace.return_value = MagicMock(id="trace-123")
    return client


@pytest.fixture
def sample_conversation_history() -> List[Dict[str, Any]]:
    """Sample conversation history for testing."""
    return [
        {"role": "user", "content": "I need a jacket", "timestamp": "2024-01-01T00:00:00Z"},
        {"role": "assistant", "content": "I can help you find a jacket!", "timestamp": "2024-01-01T00:00:01Z"},
        {"role": "user", "content": "Something formal", "timestamp": "2024-01-01T00:00:02Z"},
    ]


@pytest.fixture
def sample_user_profile() -> Dict[str, Any]:
    """Sample user profile for testing."""
    return {
        "id": "user-123",
        "email": "test@example.com",
        "preferences": {
            "sizes": {"top": "M", "bottom": "32"},
            "brands": ["Zara", "H&M"],
        },
    }


@pytest.fixture
def sample_style_dna() -> Dict[str, Any]:
    """Sample style DNA for testing."""
    return {
        "colorSeason": "warm_autumn",
        "faceShape": "oval",
        "archetype": "classic",
        "recommendedColors": ["#8B4513", "#D2691E", "#A0522D"],
    }
