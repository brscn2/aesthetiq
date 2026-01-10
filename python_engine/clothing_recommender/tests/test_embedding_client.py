"""Tests for the embedding client."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import httpx

from app.services.embedding_client import EmbeddingClient


@pytest.fixture
def embedding_client():
    """Create embedding client for testing."""
    return EmbeddingClient(
        base_url="http://test-embedding:8004",
        timeout=5.0
    )


class TestEmbeddingClient:
    """Tests for EmbeddingClient class."""
    
    @pytest.mark.asyncio
    async def test_embed_text_success(self, embedding_client):
        """Test successful text embedding."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "embedding": [0.1] * 512,
            "dimension": 512,
            "model": "clip-ViT-B-32"
        }
        mock_response.raise_for_status = MagicMock()
        
        with patch.object(httpx.AsyncClient, 'post', new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response
            
            # Need to manually set the client
            embedding_client._client = httpx.AsyncClient(
                base_url=embedding_client.base_url,
                timeout=httpx.Timeout(embedding_client.timeout)
            )
            
            with patch.object(embedding_client._client, 'post', new_callable=AsyncMock) as mock_client_post:
                mock_client_post.return_value = mock_response
                
                result = await embedding_client.embed_text("party outfit")
                
                assert len(result) == 512
                assert all(v == 0.1 for v in result)
    
    @pytest.mark.asyncio
    async def test_embed_text_http_error(self, embedding_client):
        """Test handling of HTTP errors."""
        with patch.object(embedding_client, '_get_client', new_callable=AsyncMock) as mock_get_client:
            mock_client = AsyncMock()
            mock_client.post.side_effect = httpx.HTTPError("Connection failed")
            mock_get_client.return_value = mock_client
            
            with pytest.raises(httpx.HTTPError):
                await embedding_client.embed_text("test query")
    
    @pytest.mark.asyncio
    async def test_health_check_healthy(self, embedding_client):
        """Test health check when service is healthy."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "status": "healthy",
            "model_loaded": True,
            "device": "cuda"
        }
        mock_response.raise_for_status = MagicMock()
        
        with patch.object(embedding_client, '_get_client', new_callable=AsyncMock) as mock_get_client:
            mock_client = AsyncMock()
            mock_client.get.return_value = mock_response
            mock_get_client.return_value = mock_client
            
            result = await embedding_client.health_check()
            
            assert result is True
    
    @pytest.mark.asyncio
    async def test_health_check_unhealthy(self, embedding_client):
        """Test health check when service is unhealthy."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "status": "unhealthy",
            "model_loaded": False
        }
        mock_response.raise_for_status = MagicMock()
        
        with patch.object(embedding_client, '_get_client', new_callable=AsyncMock) as mock_get_client:
            mock_client = AsyncMock()
            mock_client.get.return_value = mock_response
            mock_get_client.return_value = mock_client
            
            result = await embedding_client.health_check()
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_health_check_error(self, embedding_client):
        """Test health check when request fails."""
        with patch.object(embedding_client, '_get_client', new_callable=AsyncMock) as mock_get_client:
            mock_client = AsyncMock()
            mock_client.get.side_effect = Exception("Connection refused")
            mock_get_client.return_value = mock_client
            
            result = await embedding_client.health_check()
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_close_client(self, embedding_client):
        """Test closing the HTTP client."""
        # Create a mock client
        mock_client = AsyncMock()
        mock_client.is_closed = False
        embedding_client._client = mock_client
        
        await embedding_client.close()
        
        mock_client.aclose.assert_called_once()
        assert embedding_client._client is None
