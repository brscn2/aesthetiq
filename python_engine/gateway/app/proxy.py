"""Request proxying logic for the gateway.

This module is intentionally small and explicit.

Key constraints / reasoning:
- We are not an open proxy: targets are configured and fixed.
- We forward most headers, but must strip hop-by-hop headers to avoid
    protocol issues and request smuggling edge cases.
- We avoid returning raw exception strings to clients (information leakage).
"""

import logging

import httpx
from fastapi import HTTPException, Request, Response
from fastapi.responses import StreamingResponse

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


# RFC 7230 hop-by-hop headers (plus commonly associated ones).
# These must not be forwarded by proxies.
HOP_BY_HOP_HEADERS: set[str] = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
}


def _strip_hop_by_hop_headers(headers: dict) -> dict:
    """Return a copy of headers with hop-by-hop headers removed.

    Reasoning:
    - Hop-by-hop headers are only meaningful for a single transport-level
      connection; forwarding them can break semantics or create security issues.
    """
    cleaned = dict(headers)

    # Explicit removals.
    for header in list(cleaned.keys()):
        if header.lower() in HOP_BY_HOP_HEADERS:
            cleaned.pop(header, None)

    # "Connection" can list additional hop-by-hop headers to remove.
    connection_header = headers.get("connection") or headers.get("Connection")
    if connection_header:
        for token in str(connection_header).split(","):
            cleaned.pop(token.strip(), None)

    # Host is derived from the upstream URL.
    cleaned.pop("host", None)
    cleaned.pop("Host", None)
    return cleaned


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
        headers = _strip_hop_by_hop_headers(dict(request.headers))
        
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
            # Note: content-length/encoding can be recalculated by the server.
            response_headers = _strip_hop_by_hop_headers(dict(response.headers))
            response_headers.pop("content-encoding", None)
            response_headers.pop("content-length", None)
            
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
            # Do not leak internal exception detail to clients.
            logger.error(f"Error proxying to {target_url}: {e}", exc_info=True)
            raise HTTPException(status_code=502, detail="Gateway error")
    
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
        headers = _strip_hop_by_hop_headers(dict(request.headers))
        
        try:
            body = await request.body()

            # We need the upstream status code before returning the StreamingResponse.
            # httpx `send(..., stream=True)` gives us a response object immediately.
            upstream_request = client.build_request(
                method=request.method,
                url=target_url,
                headers=headers,
                content=body,
                params=request.query_params,
            )
            upstream_response = await client.send(upstream_request, stream=True)

            # If upstream errors, return a normal (non-streaming) response.
            if upstream_response.status_code >= 400:
                content = await upstream_response.aread()
                response_headers = _strip_hop_by_hop_headers(dict(upstream_response.headers))
                response_headers.pop("content-encoding", None)
                response_headers.pop("content-length", None)
                await upstream_response.aclose()
                return Response(
                    content=content,
                    status_code=upstream_response.status_code,
                    headers=response_headers,
                    media_type=upstream_response.headers.get("content-type"),
                )

            async def stream_generator():
                try:
                    async for line in upstream_response.aiter_lines():
                        if line:
                            yield line + "\n"
                        else:
                            # Empty line marks end of SSE event.
                            yield "\n"
                finally:
                    await upstream_response.aclose()

            return StreamingResponse(
                stream_generator(),
                status_code=upstream_response.status_code,
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",
                },
            )
            
        except httpx.TimeoutException:
            logger.error(f"Timeout streaming from {target_url}")
            raise HTTPException(status_code=504, detail="Service timeout")
        except httpx.ConnectError:
            logger.error(f"Connection error to {target_url}")
            raise HTTPException(status_code=503, detail="Service unavailable")
        except Exception as e:
            logger.error(f"Error streaming from {target_url}: {e}", exc_info=True)
            raise HTTPException(status_code=502, detail="Gateway error")


# Global proxy instance
proxy = ServiceProxy()
