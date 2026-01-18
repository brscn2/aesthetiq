import sys
from pathlib import Path

import pytest


@pytest.mark.asyncio
async def test_mcp_client_calls_mcp_servers_app_via_asgi_transport(monkeypatch):
    # Ensure python_engine/ is on path so we can import mcp_servers.*
    python_engine_dir = Path(__file__).resolve().parents[3]
    if str(python_engine_dir) not in sys.path:
        sys.path.insert(0, str(python_engine_dir))

    from mcp_servers.main import app as mcp_app
    from mcp_servers.style_dna_server import tools as style_tools

    async def fake_get_color_season(user_id: str):
        assert user_id == "u1"
        return "warm_autumn"

    monkeypatch.setattr(style_tools, "get_color_season", fake_get_color_season)

    import httpx
    from httpx import ASGITransport

    from app.mcp.client import MCPClient, MCPServerConfig, MCPTransport

    # Patch the AsyncClient used by MCPClient to use ASGITransport for in-process calls.
    real_async_client = httpx.AsyncClient

    def client_factory(*args, **kwargs):
        timeout = kwargs.get("timeout", 30.0)
        return real_async_client(transport=ASGITransport(app=mcp_app), base_url="http://testserver", timeout=timeout)

    monkeypatch.setattr("app.mcp.client.httpx.AsyncClient", client_factory)

    client = MCPClient(
        server_config=MCPServerConfig(name="mcp", transport=MCPTransport.HTTP, url="http://testserver"),
        retry_attempts=1,
    )

    await client.connect()
    result = await client.call_tool("get_color_season", {"user_id": "u1"})

    assert result.success is True
    assert result.result["color_season"] == "warm_autumn"

