"""MCP tools integration using langchain-mcp-adapters.

This module provides the integration between the conversational agent
and MCP servers using the official langchain-mcp-adapters package.
Tools are automatically discovered from MCP servers and converted to
LangChain tools that can be used with LangGraph agents.
"""
from typing import List, Optional

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
    
    try:
        _mcp_client = MultiServerMCPClient(config)
        await _mcp_client.__aenter__()
        
        # Pre-load tools
        _mcp_tools = _mcp_client.get_tools()
        logger.info(f"MCP client initialized, loaded {len(_mcp_tools)} tools")
        
        # Log available tools
        for tool in _mcp_tools:
            logger.debug(f"  - {tool.name}: {tool.description[:50]}...")
        
        return _mcp_client
        
    except Exception as e:
        logger.error(f"Failed to initialize MCP client: {e}")
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
            await _mcp_client.__aexit__(None, None, None)
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
