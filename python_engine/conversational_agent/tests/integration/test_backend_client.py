"""Integration tests for the backend client.

These tests require the backend to be running.
Skip with: pytest -m "not integration"
"""
import pytest
import os

from app.services.backend_client import BackendClient, BackendClientError


# Mark all tests in this module as integration tests
pytestmark = pytest.mark.integration


@pytest.fixture
def backend_url():
    """Get backend URL from environment or use default."""
    return os.environ.get("BACKEND_URL", "http://localhost:3001")


@pytest.fixture
def backend_client(backend_url):
    """Create a backend client for testing."""
    return BackendClient(base_url=backend_url)


class TestBackendClientIntegration:
    """Integration tests for BackendClient.
    
    These tests require the NestJS backend to be running at BACKEND_URL.
    Run with: BACKEND_URL=http://localhost:3001 pytest tests/integration/ -v
    """
    
    @pytest.mark.asyncio
    async def test_health_check(self, backend_client):
        """Test backend health check."""
        is_healthy = await backend_client.health_check()
        
        # Note: This may fail if backend is not running
        # The test documents expected behavior
        if is_healthy:
            assert is_healthy is True
        else:
            pytest.skip("Backend not available")
    
    @pytest.mark.asyncio
    async def test_create_and_get_session(self, backend_client):
        """Test creating and retrieving a session."""
        # Check if backend is available
        is_healthy = await backend_client.health_check()
        if not is_healthy:
            pytest.skip("Backend not available")
        
        # This test requires authentication in a real environment
        # For testing, we need to mock or bypass auth
        pytest.skip("Requires authentication - implement with test tokens")
    
    @pytest.mark.asyncio
    async def test_add_message_to_session(self, backend_client):
        """Test adding a message to a session."""
        is_healthy = await backend_client.health_check()
        if not is_healthy:
            pytest.skip("Backend not available")
        
        # This test requires authentication
        pytest.skip("Requires authentication - implement with test tokens")
    
    @pytest.mark.asyncio
    async def test_get_nonexistent_session(self, backend_client):
        """Test getting a session that doesn't exist."""
        is_healthy = await backend_client.health_check()
        if not is_healthy:
            pytest.skip("Backend not available")
        
        # Should raise BackendClientError with 404
        with pytest.raises(BackendClientError) as exc_info:
            await backend_client.get_session("nonexistent_session_12345")
        
        # Note: Exact behavior depends on backend auth
        # May return 401 if auth is required, or 404 if not found
        assert exc_info.value.status_code in [401, 404]


class TestBackendClientConnectionHandling:
    """Tests for connection handling."""
    
    @pytest.mark.asyncio
    async def test_client_close(self, backend_client):
        """Test closing the client."""
        # Should not raise
        await backend_client.close()
        
        # Client should be None after close
        assert backend_client._client is None
    
    @pytest.mark.asyncio
    async def test_client_reopen_after_close(self, backend_client):
        """Test that client can be reopened after close."""
        # Close the client
        await backend_client.close()
        
        # Should be able to make requests again
        # (client will be recreated)
        is_healthy = await backend_client.health_check()
        # Health check might fail if backend not running, but shouldn't raise connection error
        assert isinstance(is_healthy, bool)
    
    @pytest.mark.asyncio
    async def test_connection_to_invalid_url(self):
        """Test connection to invalid URL."""
        client = BackendClient(base_url="http://localhost:99999", timeout=1.0)
        
        # Should return False for health check, not raise
        is_healthy = await client.health_check()
        
        assert is_healthy is False
        
        await client.close()


class TestBackendClientWithMockAuth:
    """Tests with mock authentication.
    
    These tests use a mock auth token to test the auth header handling.
    They don't actually authenticate with the backend.
    """
    
    def test_client_with_auth_token(self, backend_url):
        """Test that client includes auth token in headers."""
        client = BackendClient(
            base_url=backend_url,
            auth_token="test_token_12345",
        )
        
        assert "Authorization" in client.headers
        assert client.headers["Authorization"] == "Bearer test_token_12345"
    
    def test_client_without_auth_token(self, backend_url):
        """Test that client doesn't include auth header without token."""
        client = BackendClient(base_url=backend_url)
        
        assert "Authorization" not in client.headers


# =============================================================================
# Test with Real Backend (requires running backend with test data)
# =============================================================================

class TestBackendClientRealRequests:
    """Real request tests - require backend with test setup.
    
    These tests are skipped by default. To run them:
    1. Start the backend with test configuration
    2. Set environment variables:
       - BACKEND_URL=http://localhost:3001
       - TEST_AUTH_TOKEN=<valid_test_token>
    3. Run: pytest tests/integration/test_backend_client.py -v -k "real"
    """
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token from environment."""
        token = os.environ.get("TEST_AUTH_TOKEN")
        if not token:
            pytest.skip("TEST_AUTH_TOKEN not set")
        return token
    
    @pytest.fixture
    def authenticated_client(self, backend_url, auth_token):
        """Create an authenticated client."""
        return BackendClient(base_url=backend_url, auth_token=auth_token)
    
    @pytest.mark.asyncio
    async def test_real_create_session(self, authenticated_client):
        """Test creating a real session (requires auth)."""
        is_healthy = await authenticated_client.health_check()
        if not is_healthy:
            pytest.skip("Backend not available")
        
        session = await authenticated_client.create_session(
            user_id="test_user_integration",
            title="Integration Test Session",
        )
        
        assert "sessionId" in session
        assert session["title"] == "Integration Test Session"
    
    @pytest.mark.asyncio
    async def test_real_full_conversation_flow(self, authenticated_client):
        """Test full conversation flow (requires auth)."""
        is_healthy = await authenticated_client.health_check()
        if not is_healthy:
            pytest.skip("Backend not available")
        
        # Create session
        session = await authenticated_client.create_session(
            user_id="test_user_integration",
            title="Full Flow Test",
        )
        session_id = session["sessionId"]
        
        # Add user message
        await authenticated_client.add_message(
            session_id=session_id,
            role="user",
            content="Hello, I need a jacket",
            metadata={"source": "integration_test"},
        )
        
        # Add assistant message
        await authenticated_client.add_message(
            session_id=session_id,
            role="assistant",
            content="I can help you find a jacket!",
            metadata={"intent": "clothing"},
        )
        
        # Get session and verify
        updated_session = await authenticated_client.get_session(session_id)
        
        assert len(updated_session["messages"]) == 2
        assert updated_session["messages"][0]["role"] == "user"
        assert updated_session["messages"][1]["role"] == "assistant"
