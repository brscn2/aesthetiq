"""Request proxying logic for the gateway."""
import httpx
from fastapi import Request, Response, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional
import logging

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class ServiceProxy:
    """Handles request proxying to internal services."""
    
    def __init__(self):
        """Initialize the proxy with HTTP clients."""
        self.clients = {}
    
    def _get_client(self, timeout: float) -> httpx.AsyncClient:
        """Get or create an async HTTP client with specified timeout."""
        if timeout not in self.clients:
            self.clients[timeout] = httpx.AsyncClient(timeout=timeout)
        return self.clients[timeout]
    
    async def close(self):
        """Close all HTTP clients."""
        for client in self.clients.values():
            await client.aclose()
        self.clients.clear()
    
    async def proxy_request(
        self,
        request: Request,
        target_url: str,
        timeout: float = 30.0
    ) -> Response:
        """
        Proxy an HTTP request to a target service.
        
        Args:
            request: Incoming FastAPI request
            target_url: Full URL to forward the request to
            timeout: Request timeout in seconds
            
        Returns:
            Response from the target service
        """
        client = self._get_client(timeout)
        
        # Build headers (exclude hop-by-hop headers)
        headers = dict(request.headers)
        headers.pop("host", None)
        headers.pop("connection", None)
        headers.pop("transfer-encoding", None)
        
        try:
            # Read the request body
            body = await request.body()
            
            # Forward the request
            response = await client.request(
                method=request.method,
                url=target_url,
                headers=headers,
                content=body,
                params=request.query_params,
            )
            
            # Build response headers
            response_headers = dict(response.headers)
            response_headers.pop("content-encoding", None)
            response_headers.pop("content-length", None)
            response_headers.pop("transfer-encoding", None)
            
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=response_headers,
                media_type=response.headers.get("content-type")
            )
            
        except httpx.TimeoutException:
            logger.error(f"Timeout proxying to {target_url}")
            raise HTTPException(status_code=504, detail="Service timeout")
        except httpx.ConnectError:
            logger.error(f"Connection error to {target_url}")
            raise HTTPException(status_code=503, detail="Service unavailable")
        except Exception as e:
            logger.error(f"Error proxying to {target_url}: {e}")
            raise HTTPException(status_code=502, detail=f"Gateway error: {str(e)}")
    
    async def proxy_streaming_request(
        self,
        request: Request,
        target_url: str,
        timeout: float = 120.0
    ) -> StreamingResponse:
        """
        Proxy a streaming request (SSE) to a target service.
        
        Args:
            request: Incoming FastAPI request
            target_url: Full URL to forward the request to
            timeout: Request timeout in seconds
            
        Returns:
            StreamingResponse that passes through the SSE stream
        """
        client = self._get_client(timeout)
        
        # Build headers
        headers = dict(request.headers)
        headers.pop("host", None)
        headers.pop("connection", None)
        
        try:
            body = await request.body()
            
            async def stream_generator():
                async with client.stream(
                    method=request.method,
                    url=target_url,
                    headers=headers,
                    content=body,
                    params=request.query_params,
                ) as response:
                    # Use aiter_lines for SSE to get events as they arrive
                    async for line in response.aiter_lines():
                        if line:
                            yield line + "\n"
                        else:
                            # Empty line marks end of SSE event
                            yield "\n"
            
            return StreamingResponse(
                stream_generator(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",
                }
            )
            
        except httpx.TimeoutException:
            logger.error(f"Timeout streaming from {target_url}")
            raise HTTPException(status_code=504, detail="Service timeout")
        except httpx.ConnectError:
            logger.error(f"Connection error to {target_url}")
            raise HTTPException(status_code=503, detail="Service unavailable")
        except Exception as e:
            logger.error(f"Error streaming from {target_url}: {e}")
            raise HTTPException(status_code=502, detail=f"Gateway error: {str(e)}")


# Global proxy instance
proxy = ServiceProxy()
