"""Unit tests for the MCP client."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import asyncio

from app.mcp.client import (
    MCPClient,
    MCPClientManager,
    MCPServerConfig,
    MCPTransport,
    MCPToolResult,
    MCPError,
    MCPConnectionError,
    MCPToolError,
    get_mcp_manager,
)


class TestMCPServerConfig:
    """Tests for MCPServerConfig."""
    
    def test_create_http_config(self):
        """Test creating HTTP server config."""
        config = MCPServerConfig(
            name="wardrobe",
            transport=MCPTransport.HTTP,
            url="http://localhost:8005",
            timeout=30.0,
        )
        
        assert config.name == "wardrobe"
        assert config.transport == MCPTransport.HTTP
        assert config.url == "http://localhost:8005"
        assert config.timeout == 30.0
    
    def test_create_stdio_config(self):
        """Test creating stdio server config."""
        config = MCPServerConfig(
            name="commerce",
            transport=MCPTransport.STDIO,
            command="python",
            args=["-m", "commerce_server"],
            env={"DEBUG": "true"},
        )
        
        assert config.name == "commerce"
        assert config.transport == MCPTransport.STDIO
        assert config.command == "python"
        assert config.args == ["-m", "commerce_server"]
        assert config.env == {"DEBUG": "true"}


class TestMCPToolResult:
    """Tests for MCPToolResult."""
    
    def test_successful_result(self):
        """Test successful tool result."""
        result = MCPToolResult(
            success=True,
            result={"items": [{"id": "1", "name": "Jacket"}]},
            duration_ms=150.5,
            metadata={"tool_name": "search"},
        )
        
        assert result.success is True
        assert result.result["items"][0]["name"] == "Jacket"
        assert result.error is None
        assert result.duration_ms == 150.5
    
    def test_failed_result(self):
        """Test failed tool result."""
        result = MCPToolResult(
            success=False,
            result=None,
            error="Connection timeout",
            duration_ms=30000.0,
        )
        
        assert result.success is False
        assert result.result is None
        assert result.error == "Connection timeout"


class TestMCPClient:
    """Tests for MCPClient."""
    
    def test_create_client_with_config(self):
        """Test creating client with config."""
        config = MCPServerConfig(
            name="test",
            transport=MCPTransport.HTTP,
            url="http://localhost:8005",
        )
        
        client = MCPClient(server_config=config)
        
        assert client.server_config == config
        assert client.is_connected is False
    
    def test_create_client_without_config(self):
        """Test creating client without config."""
        client = MCPClient()
        
        assert client.server_config is None
        assert client.is_connected is False
    
    @pytest.mark.asyncio
    async def test_connect_without_config_raises_error(self):
        """Test that connecting without config raises error."""
        client = MCPClient()
        
        with pytest.raises(MCPConnectionError) as exc_info:
            await client.connect()
        
        assert "No server configuration provided" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_call_tool_returns_not_implemented(self):
        """Test that tool call returns not implemented (placeholder)."""
        config = MCPServerConfig(
            name="test",
            transport=MCPTransport.HTTP,
            url="http://localhost:8005",
        )
        client = MCPClient(server_config=config, retry_attempts=1)
        
        result = await client.call_tool("search", {"query": "jacket"})
        
        # Currently returns error because MCP servers aren't implemented yet
        assert result.success is False
        assert "NOT_IMPLEMENTED" in result.error or "not implemented" in result.error.lower()
    
    @pytest.mark.asyncio
    async def test_disconnect_when_not_connected(self):
        """Test disconnecting when not connected (should be safe)."""
        client = MCPClient()
        
        # Should not raise
        await client.disconnect()
        
        assert client.is_connected is False
    
    @pytest.mark.asyncio
    async def test_list_tools_when_not_connected(self):
        """Test listing tools when not connected raises error."""
        client = MCPClient()
        
        with pytest.raises(MCPConnectionError) as exc_info:
            await client.list_tools()
        
        assert "Not connected" in str(exc_info.value)


class TestMCPClientManager:
    """Tests for MCPClientManager."""
    
    def test_create_manager(self):
        """Test creating manager."""
        manager = MCPClientManager()
        
        assert manager._clients == {}
        assert manager._configs == {}
    
    def test_register_server(self):
        """Test registering server."""
        manager = MCPClientManager()
        config = MCPServerConfig(
            name="wardrobe",
            transport=MCPTransport.HTTP,
            url="http://localhost:8005",
        )
        
        manager.register_server(config)
        
        assert "wardrobe" in manager._configs
        assert manager._configs["wardrobe"] == config
    
    def test_get_client_not_connected(self):
        """Test getting client that's not connected."""
        manager = MCPClientManager()
        
        client = manager.get_client("wardrobe")
        
        assert client is None
    
    @pytest.mark.asyncio
    async def test_call_tool_server_not_connected(self):
        """Test calling tool when server not connected."""
        manager = MCPClientManager()
        
        result = await manager.call_tool("wardrobe", "search", {"query": "jacket"})
        
        assert result.success is False
        assert "not connected" in result.error.lower()
    
    @pytest.mark.asyncio
    async def test_disconnect_all_empty(self):
        """Test disconnecting all when none connected."""
        manager = MCPClientManager()
        
        # Should not raise
        await manager.disconnect_all()
        
        assert manager._clients == {}


class TestMCPExceptions:
    """Tests for MCP exceptions."""
    
    def test_mcp_error(self):
        """Test MCPError exception."""
        error = MCPError("Something went wrong")
        
        assert str(error) == "Something went wrong"
    
    def test_mcp_connection_error(self):
        """Test MCPConnectionError exception."""
        error = MCPConnectionError("Failed to connect")
        
        assert str(error) == "Failed to connect"
        assert isinstance(error, MCPError)
    
    def test_mcp_tool_error(self):
        """Test MCPToolError exception."""
        error = MCPToolError(
            message="Tool failed",
            tool_name="search",
            error_code="TIMEOUT",
        )
        
        assert str(error) == "Tool failed"
        assert error.tool_name == "search"
        assert error.error_code == "TIMEOUT"
        assert isinstance(error, MCPError)


class TestGetMCPManager:
    """Tests for get_mcp_manager function."""
    
    def test_get_manager_returns_singleton(self):
        """Test that get_mcp_manager returns the same instance."""
        # Note: This test may be affected by other tests that use the global
        manager1 = get_mcp_manager()
        manager2 = get_mcp_manager()
        
        assert manager1 is manager2
