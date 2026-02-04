"""MCP tools integration using langchain-mcp-adapters.

This module provides the integration between the conversational agent
and MCP servers using the official langchain-mcp-adapters package.
Tools are automatically discovered from MCP servers and converted to
LangChain tools that can be used with LangGraph agents.
"""

from typing import List, Optional
import traceback

import httpx
from langchain_core.tools import BaseTool
from langchain_mcp_adapters.client import MultiServerMCPClient

from app.core.config import get_settings
from app.core.logger import get_logger

logger = get_logger(__name__)

# Global MCP client instance
_mcp_client: Optional[MultiServerMCPClient] = None
_mcp_tools: Optional[List[BaseTool]] = None


def get_mcp_client_config() -> dict:
    """
    Get MCP client configuration for connecting to MCP servers.

    Returns:
        Configuration dict for MultiServerMCPClient
    """
    settings = get_settings()
    return {
        "aesthetiq": {
            "transport": "streamable_http",
            "url": f"{settings.MCP_SERVERS_URL}/mcp",
        }
    }


async def test_mcp_connectivity() -> dict:
    """
    Test direct connectivity to MCP servers before initializing the client.

    Returns:
        dict with connectivity test results
    """
    settings = get_settings()
    mcp_url = settings.MCP_SERVERS_URL
    results = {
        "base_url": mcp_url,
        "health_check": None,
        "mcp_endpoint": None,
        "openapi": None,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Test health endpoint
        try:
            health_resp = await client.get(f"{mcp_url}/health")
            results["health_check"] = {
                "status_code": health_resp.status_code,
                "body": (
                    health_resp.json()
                    if health_resp.status_code == 200
                    else health_resp.text[:200]
                ),
            }
            logger.info(
                f"MCP health check: {health_resp.status_code} - {health_resp.json() if health_resp.status_code == 200 else 'error'}"
            )
        except Exception as e:
            results["health_check"] = {"error": str(e)}
            logger.error(f"MCP health check failed: {e}")

        # Test MCP endpoint directly
        try:
            mcp_resp = await client.get(f"{mcp_url}/mcp")
            results["mcp_endpoint"] = {
                "status_code": mcp_resp.status_code,
                "headers": dict(mcp_resp.headers),
                "body_preview": mcp_resp.text[:500] if mcp_resp.text else None,
            }
            logger.info(f"MCP endpoint response: {mcp_resp.status_code}")
        except Exception as e:
            results["mcp_endpoint"] = {"error": str(e)}
            logger.error(f"MCP endpoint test failed: {e}")

        # Test OpenAPI for tool discovery
        try:
            openapi_resp = await client.get(f"{mcp_url}/openapi.json")
            if openapi_resp.status_code == 200:
                openapi = openapi_resp.json()
                paths = list(openapi.get("paths", {}).keys())
                tool_paths = [p for p in paths if "/tools/" in p]
                results["openapi"] = {
                    "status_code": 200,
                    "total_paths": len(paths),
                    "tool_paths": tool_paths,
                }
                logger.info(f"MCP OpenAPI: {len(tool_paths)} tool endpoints found")
            else:
                results["openapi"] = {"status_code": openapi_resp.status_code}
        except Exception as e:
            results["openapi"] = {"error": str(e)}
            logger.error(f"MCP OpenAPI fetch failed: {e}")

    return results


async def init_mcp_client() -> MultiServerMCPClient:
    """
    Initialize the MCP client and connect to MCP servers.

    This should be called during application startup (in lifespan).

    Returns:
        Initialized MultiServerMCPClient instance
    """
    global _mcp_client, _mcp_tools

    if _mcp_client is not None:
        logger.debug("MCP client already initialized")
        return _mcp_client

    config = get_mcp_client_config()
    logger.info(f"Initializing MCP client with config: {list(config.keys())}")
    logger.info(f"MCP server URL: {config['aesthetiq']['url']}")

    # Test connectivity first
    logger.info("Testing MCP server connectivity before client initialization...")
    try:
        connectivity = await test_mcp_connectivity()
        logger.info(f"Connectivity test results: {connectivity}")
    except Exception as e:
        logger.error(f"Connectivity test failed: {e}")

    try:
        logger.info("Creating MultiServerMCPClient...")
        _mcp_client = MultiServerMCPClient(config)
        logger.info("MultiServerMCPClient created, fetching tools...")

        # Pre-load tools (get_tools is async in v0.1.0+)
        _mcp_tools = await _mcp_client.get_tools()
        logger.info(f"MCP client initialized, loaded {len(_mcp_tools)} tools")

        # Log available tools
        for tool in _mcp_tools:
            logger.debug(f"  - {tool.name}: {tool.description[:50]}...")

        return _mcp_client

    except ExceptionGroup as eg:
        # Handle ExceptionGroup from asyncio.TaskGroup (Python 3.11+)
        logger.error(f"MCP client initialization failed with ExceptionGroup:")
        for i, exc in enumerate(eg.exceptions):
            logger.error(f"  Sub-exception {i+1}: {type(exc).__name__}: {exc}")
            logger.error(
                f"  Traceback: {traceback.format_exception(type(exc), exc, exc.__traceback__)}"
            )
        _mcp_client = None
        _mcp_tools = None
        raise
    except Exception as e:
        logger.error(f"Failed to initialize MCP client: {type(e).__name__}: {e}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        _mcp_client = None
        _mcp_tools = None
        raise


async def close_mcp_client() -> None:
    """
    Close the MCP client connection.

    This should be called during application shutdown (in lifespan).
    """
    global _mcp_client, _mcp_tools

    if _mcp_client is not None:
        try:
            # MultiServerMCPClient doesn't need explicit cleanup in v0.1.0+
            # Just clear the reference
            logger.info("MCP client closed")
        except Exception as e:
            logger.warning(f"Error closing MCP client: {e}")
        finally:
            _mcp_client = None
            _mcp_tools = None


async def get_mcp_tools() -> List[BaseTool]:
    """
    Get all available MCP tools as LangChain tools.

    If the client is not initialized, this will initialize it first.

    Returns:
        List of LangChain BaseTool objects that agents can use.
        Returns empty list if MCP client is not available.
    """
    global _mcp_tools

    if _mcp_tools is not None:
        return _mcp_tools

    # Try to initialize if not already done
    try:
        await init_mcp_client()
        return _mcp_tools or []
    except Exception as e:
        logger.warning(f"Could not get MCP tools: {e}")
        return []


def get_mcp_client() -> Optional[MultiServerMCPClient]:
    """
    Get the current MCP client instance.

    Returns:
        MultiServerMCPClient if initialized, None otherwise
    """
    return _mcp_client


def is_mcp_connected() -> bool:
    """
    Check if MCP client is connected.

    Returns:
        True if connected, False otherwise
    """
    return _mcp_client is not None
