"""Unit tests for MCP tools integration."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.fixture
def mock_settings(monkeypatch):
    """Mock settings with MCP configuration."""
    mock = MagicMock()
    mock.MCP_SERVERS_URL = "http://test-mcp:8010"
    monkeypatch.setattr("app.mcp.tools.get_settings", lambda: mock)
    return mock


def test_get_mcp_client_config(mock_settings):
    """Test MCP client configuration generation."""
    from app.mcp.tools import get_mcp_client_config
    
    config = get_mcp_client_config()
    
    assert "aesthetiq" in config
    assert config["aesthetiq"]["transport"] == "streamable_http"
    assert config["aesthetiq"]["url"] == "http://test-mcp:8010/mcp"


def test_is_mcp_connected_when_not_initialized():
    """Test is_mcp_connected returns False when client not initialized."""
    from app.mcp.tools import is_mcp_connected
    
    # Reset global state
    import app.mcp.tools as tools_module
    tools_module._mcp_client = None
    tools_module._mcp_tools = None
    
    assert is_mcp_connected() is False


def test_get_mcp_client_returns_none_when_not_initialized():
    """Test get_mcp_client returns None when not initialized."""
    from app.mcp.tools import get_mcp_client
    
    # Reset global state
    import app.mcp.tools as tools_module
    tools_module._mcp_client = None
    
    assert get_mcp_client() is None


@pytest.mark.asyncio
async def test_init_mcp_client_connects_and_loads_tools(mock_settings):
    """Test init_mcp_client connects and loads tools."""
    from app.mcp.tools import init_mcp_client, close_mcp_client, is_mcp_connected
    
    # Reset global state
    import app.mcp.tools as tools_module
    tools_module._mcp_client = None
    tools_module._mcp_tools = None
    
    # Mock the MultiServerMCPClient
    mock_tool = MagicMock()
    mock_tool.name = "test_tool"
    mock_tool.description = "A test tool for testing purposes"
    
    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.get_tools = AsyncMock(return_value=[mock_tool])
    
    with patch("app.mcp.tools.MultiServerMCPClient", return_value=mock_client):
        client = await init_mcp_client()
        
        assert client is mock_client
        assert is_mcp_connected() is True
        
        # Cleanup
        await close_mcp_client()
        assert is_mcp_connected() is False


@pytest.mark.asyncio
async def test_get_mcp_tools_returns_tools(mock_settings):
    """Test get_mcp_tools returns list of tools."""
    from app.mcp.tools import get_mcp_tools, close_mcp_client
    
    # Reset global state
    import app.mcp.tools as tools_module
    tools_module._mcp_client = None
    tools_module._mcp_tools = None
    
    # Mock tools
    mock_tool1 = MagicMock()
    mock_tool1.name = "search_wardrobe"
    mock_tool1.description = "Search wardrobe items"
    
    mock_tool2 = MagicMock()
    mock_tool2.name = "get_style_dna"
    mock_tool2.description = "Get user style DNA"
    
    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.get_tools = AsyncMock(return_value=[mock_tool1, mock_tool2])
    
    with patch("app.mcp.tools.MultiServerMCPClient", return_value=mock_client):
        tools = await get_mcp_tools()
        
        assert len(tools) == 2
        assert tools[0].name == "search_wardrobe"
        assert tools[1].name == "get_style_dna"
        
        # Cleanup
        await close_mcp_client()


@pytest.mark.asyncio
async def test_get_mcp_tools_returns_empty_on_error(mock_settings):
    """Test get_mcp_tools returns empty list on connection error."""
    from app.mcp.tools import get_mcp_tools
    
    # Reset global state
    import app.mcp.tools as tools_module
    tools_module._mcp_client = None
    tools_module._mcp_tools = None
    
    with patch("app.mcp.tools.MultiServerMCPClient", side_effect=Exception("Connection failed")):
        tools = await get_mcp_tools()
        
        assert tools == []


@pytest.mark.asyncio
async def test_close_mcp_client_handles_not_initialized():
    """Test close_mcp_client handles case when client not initialized."""
    from app.mcp.tools import close_mcp_client
    
    # Reset global state
    import app.mcp.tools as tools_module
    tools_module._mcp_client = None
    tools_module._mcp_tools = None
    
    # Should not raise
    await close_mcp_client()


@pytest.mark.asyncio
async def test_init_mcp_client_is_idempotent(mock_settings):
    """Test calling init_mcp_client multiple times returns same client."""
    from app.mcp.tools import init_mcp_client, close_mcp_client
    
    # Reset global state
    import app.mcp.tools as tools_module
    tools_module._mcp_client = None
    tools_module._mcp_tools = None
    
    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.get_tools = AsyncMock(return_value=[])
    
    with patch("app.mcp.tools.MultiServerMCPClient", return_value=mock_client) as mock_class:
        client1 = await init_mcp_client()
        client2 = await init_mcp_client()
        
        # Should only create one client
        assert mock_class.call_count == 1
        assert client1 is client2
        
        # Cleanup
        await close_mcp_client()
