"""Unit tests for the session service."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.session.session_service import (
    SessionService,
    SessionData,
    get_session_service,
)
from app.services.backend_client import BackendClient, BackendClientError


class TestSessionData:
    """Tests for SessionData dataclass."""
    
    def test_create_from_dict(self):
        """Test creating SessionData from dictionary."""
        data = {
            "sessionId": "session_123",
            "userId": "user_456",
            "title": "Test Session",
            "messages": [
                {"role": "user", "content": "Hello"},
                {"role": "assistant", "content": "Hi there!"},
            ],
            "metadata": {"source": "web"},
        }
        
        session = SessionData.from_dict(data)
        
        assert session.session_id == "session_123"
        assert session.user_id == "user_456"
        assert session.title == "Test Session"
        assert len(session.messages) == 2
        assert session.metadata["source"] == "web"
    
    def test_create_from_dict_with_missing_fields(self):
        """Test creating SessionData with missing optional fields."""
        data = {
            "sessionId": "session_123",
        }
        
        session = SessionData.from_dict(data)
        
        assert session.session_id == "session_123"
        assert session.user_id == ""
        assert session.title == ""
        assert session.messages == []
        assert session.metadata == {}


class TestSessionService:
    """Tests for SessionService."""
    
    @pytest.fixture
    def mock_backend_client(self):
        """Create a mock backend client."""
        client = AsyncMock(spec=BackendClient)
        return client
    
    @pytest.fixture
    def session_service(self, mock_backend_client):
        """Create a session service with mock backend."""
        return SessionService(backend_client=mock_backend_client)
    
    @pytest.mark.asyncio
    async def test_load_existing_session(self, session_service, mock_backend_client):
        """Test loading an existing session."""
        mock_backend_client.get_session.return_value = {
            "sessionId": "session_123",
            "userId": "user_456",
            "title": "Existing Session",
            "messages": [
                {"role": "user", "content": "Hello"},
            ],
        }
        
        session = await session_service.load_session(
            user_id="user_456",
            session_id="session_123",
        )
        
        assert session.session_id == "session_123"
        assert session.title == "Existing Session"
        assert len(session.messages) == 1
        mock_backend_client.get_session.assert_called_once_with("session_123")
    
    @pytest.mark.asyncio
    async def test_load_session_creates_new_when_not_found(self, session_service, mock_backend_client):
        """Test that load_session creates new session when not found."""
        mock_backend_client.get_session.side_effect = BackendClientError(
            "Not found", status_code=404
        )
        mock_backend_client.create_session.return_value = {
            "sessionId": "session_123",
            "userId": "user_456",
            "title": "New Conversation",
            "messages": [],
        }
        
        session = await session_service.load_session(
            user_id="user_456",
            session_id="session_123",
        )
        
        assert session.session_id == "session_123"
        assert session.messages == []
        mock_backend_client.create_session.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_load_session_creates_new_without_session_id(self, session_service, mock_backend_client):
        """Test that load_session creates new session when no session_id provided."""
        mock_backend_client.create_session.return_value = {
            "sessionId": "new_session_123",
            "userId": "user_456",
            "title": "New Conversation",
            "messages": [],
        }
        
        session = await session_service.load_session(
            user_id="user_456",
        )
        
        assert session.session_id == "new_session_123"
        mock_backend_client.create_session.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_save_message(self, session_service, mock_backend_client):
        """Test saving a message."""
        mock_backend_client.add_message.return_value = {}
        
        await session_service.save_message(
            session_id="session_123",
            role="user",
            content="Hello",
            metadata={"source": "test"},
        )
        
        mock_backend_client.add_message.assert_called_once_with(
            session_id="session_123",
            role="user",
            content="Hello",
            metadata={"source": "test"},
        )
    
    @pytest.mark.asyncio
    async def test_save_conversation_turn(self, session_service, mock_backend_client):
        """Test saving a complete conversation turn."""
        mock_backend_client.add_message.return_value = {}
        
        await session_service.save_conversation_turn(
            session_id="session_123",
            user_message="Hello",
            assistant_message="Hi there!",
        )
        
        # Should save both messages
        assert mock_backend_client.add_message.call_count == 2
        
        # First call: user message
        first_call = mock_backend_client.add_message.call_args_list[0]
        assert first_call.kwargs["role"] == "user"
        assert first_call.kwargs["content"] == "Hello"
        
        # Second call: assistant message
        second_call = mock_backend_client.add_message.call_args_list[1]
        assert second_call.kwargs["role"] == "assistant"
        assert second_call.kwargs["content"] == "Hi there!"
    
    def test_format_history_for_llm(self, session_service):
        """Test formatting history for LLM."""
        messages = [
            {"role": "user", "content": "Hello", "timestamp": "2024-01-01T00:00:00Z"},
            {"role": "assistant", "content": "Hi!", "timestamp": "2024-01-01T00:00:01Z"},
            {"role": "user", "content": "How are you?", "timestamp": "2024-01-01T00:00:02Z"},
        ]
        
        formatted = session_service.format_history_for_llm(messages)
        
        assert len(formatted) == 3
        assert formatted[0] == {"role": "user", "content": "Hello"}
        assert formatted[1] == {"role": "assistant", "content": "Hi!"}
        assert formatted[2] == {"role": "user", "content": "How are you?"}
    
    def test_format_history_for_llm_with_limit(self, session_service):
        """Test formatting history with message limit."""
        messages = [
            {"role": "user", "content": f"Message {i}"}
            for i in range(15)
        ]
        
        formatted = session_service.format_history_for_llm(messages, max_messages=5)
        
        assert len(formatted) == 5
        # Should be the last 5 messages
        assert formatted[0]["content"] == "Message 10"
        assert formatted[4]["content"] == "Message 14"
    
    def test_format_history_for_llm_skips_empty(self, session_service):
        """Test that formatting skips empty messages."""
        messages = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": ""},
            {"role": "user", "content": "Still there?"},
        ]
        
        formatted = session_service.format_history_for_llm(messages)
        
        assert len(formatted) == 2
        assert formatted[0]["content"] == "Hello"
        assert formatted[1]["content"] == "Still there?"
    
    def test_generate_session_id(self, session_service):
        """Test session ID generation."""
        session_id1 = session_service._generate_session_id()
        session_id2 = session_service._generate_session_id()
        
        assert session_id1.startswith("session_")
        assert session_id2.startswith("session_")
        assert session_id1 != session_id2
    
    @pytest.mark.asyncio
    async def test_close(self, session_service, mock_backend_client):
        """Test closing the service."""
        await session_service.close()
        
        mock_backend_client.close.assert_called_once()


class TestGetSessionService:
    """Tests for get_session_service function."""
    
    def test_get_service_with_custom_client(self):
        """Test getting service with custom client."""
        mock_client = MagicMock(spec=BackendClient)
        
        service = get_session_service(backend_client=mock_client)
        
        assert service.backend_client is mock_client
    
    def test_get_service_returns_singleton(self):
        """Test that get_session_service returns singleton when no client provided."""
        # Reset global for test
        import app.services.session.session_service as module
        module._session_service = None
        
        with patch("app.services.session.session_service.BackendClient"):
            service1 = get_session_service()
            service2 = get_session_service()
            
            assert service1 is service2
