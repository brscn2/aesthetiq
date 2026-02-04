"""MCP module - Model Context Protocol integration.

This module provides MCP tool integration using langchain-mcp-adapters.
Tools are automatically discovered from MCP servers and converted to
LangChain tools that can be used with LangGraph agents.

Usage:
    from app.mcp import get_mcp_tools

    tools = await get_mcp_tools()
    agent = create_react_agent(llm, tools)
"""

from app.mcp.tools import (
    get_mcp_tools,
    get_mcp_client,
    init_mcp_client,
    close_mcp_client,
    is_mcp_connected,
)

__all__ = [
    "get_mcp_tools",
    "get_mcp_client",
    "init_mcp_client",
    "close_mcp_client",
    "is_mcp_connected",
]
