"""Embedding service HTTP client.

This module provides an async HTTP client for the embedding_service
to generate CLIP embeddings for text queries.
"""
from typing import Optional
import httpx

from app.core.config import get_settings
from app.core.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


class EmbeddingClient:
    """
    Async HTTP client for the embedding service.
    
    Uses httpx for async HTTP requests to the embedding microservice.
    """
    
    def __init__(self, base_url: Optional[str] = None, timeout: Optional[float] = None):
        """
        Initialize embedding client.
        
        Args:
            base_url: Embedding service URL (default from settings)
            timeout: Request timeout in seconds (default from settings)
        """
        self.base_url = base_url or settings.EMBEDDING_SERVICE_URL
        self.timeout = timeout or settings.EMBEDDING_SERVICE_TIMEOUT
        self._client: Optional[httpx.AsyncClient] = None
    
    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create async HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=httpx.Timeout(self.timeout),
            )
        return self._client
    
    async def close(self):
        """Close HTTP client."""
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
            self._client = None
    
    async def embed_text(self, text: str) -> list[float]:
        """
        Generate embedding for text input.
        
        Args:
            text: Text to embed (e.g., "elegant party dress")
            
        Returns:
            512-dimensional embedding vector
            
        Raises:
            httpx.HTTPError: If request fails
            ValueError: If response is invalid
        """
        logger.info(f"Generating embedding for text: {text[:50]}...")
        
        client = await self._get_client()
        
        try:
            response = await client.post(
                "/embed/text",
                json={"text": text}
            )
            response.raise_for_status()
            
            data = response.json()
            embedding = data.get("embedding")
            
            if not embedding:
                raise ValueError("No embedding in response")
            
            dimension = len(embedding)
            if dimension != settings.EMBEDDING_DIMENSION:
                logger.warning(
                    f"Unexpected embedding dimension: {dimension}, "
                    f"expected {settings.EMBEDDING_DIMENSION}"
                )
            
            logger.info(f"Generated embedding with dimension: {dimension}")
            return embedding
            
        except httpx.HTTPError as e:
            logger.error(f"Embedding service request failed: {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to parse embedding response: {e}")
            raise
    
    async def health_check(self) -> bool:
        """
        Check if embedding service is healthy.
        
        Returns:
            True if service is healthy
        """
        try:
            client = await self._get_client()
            response = await client.get("/health")
            response.raise_for_status()
            
            data = response.json()
            is_healthy = data.get("status") == "healthy" and data.get("model_loaded", False)
            
            logger.info(f"Embedding service health: {data}")
            return is_healthy
            
        except Exception as e:
            logger.error(f"Embedding service health check failed: {e}")
            return False


# Singleton instance for reuse
_embedding_client: Optional[EmbeddingClient] = None


def get_embedding_client() -> EmbeddingClient:
    """Get singleton embedding client instance."""
    global _embedding_client
    if _embedding_client is None:
        _embedding_client = EmbeddingClient()
    return _embedding_client


async def close_embedding_client():
    """Close singleton embedding client (call on app shutdown)."""
    global _embedding_client
    if _embedding_client is not None:
        await _embedding_client.close()
        _embedding_client = None
