"""
DEPRECATED: This module is deprecated in favor of langchain-mcp-adapters.

Use app.mcp.tools instead:

    from app.mcp import get_mcp_tools
    
    tools = await get_mcp_tools()
    agent = create_react_agent(llm, tools)

This file is kept for reference only. The custom MCPClient implementation
has been replaced with the official langchain-mcp-adapters package which
provides better integration with LangGraph and follows MCP best practices.
"""
import asyncio
import json
from typing import Dict, Any, Optional, List, Callable, Awaitable
from dataclasses import dataclass, field
from enum import Enum
import time
import warnings

import httpx

from app.core.config import get_settings
from app.core.logger import get_logger

logger = get_logger(__name__)

# Emit deprecation warning when this module is imported
warnings.warn(
    "app.mcp.client is deprecated. Use app.mcp.tools instead.",
    DeprecationWarning,
    stacklevel=2
)


class MCPTransport(str, Enum):
    """MCP transport types."""
    STDIO = "stdio"
    HTTP = "http"
    SSE = "sse"


class MCPError(Exception):
    """Base exception for MCP errors."""
    pass


class MCPConnectionError(MCPError):
    """Exception for MCP connection errors."""
    pass


class MCPToolError(MCPError):
    """Exception for MCP tool call errors."""
    
    def __init__(self, message: str, tool_name: str, error_code: Optional[str] = None):
        super().__init__(message)
        self.tool_name = tool_name
        self.error_code = error_code


@dataclass
class MCPToolResult:
    """Result from an MCP tool call."""
    success: bool
    result: Any
    error: Optional[str] = None
    duration_ms: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MCPServerConfig:
    """Configuration for an MCP server."""
    name: str
    transport: MCPTransport
    url: Optional[str] = None  # For HTTP transport
    command: Optional[str] = None  # For stdio transport
    args: Optional[List[str]] = None  # For stdio transport
    env: Optional[Dict[str, str]] = None  # Environment variables
    timeout: float = 30.0


class MCPClient:
    """
    Client for interacting with MCP (Model Context Protocol) servers.
    
    Supports both stdio and HTTP transports for calling tools.
    Includes retry logic and error handling.
    """
    
    def __init__(
        self,
        server_config: Optional[MCPServerConfig] = None,
        retry_attempts: Optional[int] = None,
        retry_delay: Optional[float] = None,
    ):
        """
        Initialize the MCP client.
        
        Args:
            server_config: Server configuration (optional for lazy configuration)
            retry_attempts: Number of retry attempts (defaults to settings)
            retry_delay: Delay between retries in seconds (defaults to settings)
        """
        self.settings = get_settings()
        self.server_config = server_config
        self.retry_attempts = retry_attempts or self.settings.MCP_RETRY_ATTEMPTS
        self.retry_delay = retry_delay or self.settings.MCP_RETRY_DELAY
        self._connected = False
        self._available_tools: Dict[str, Dict[str, Any]] = {}
    
    async def connect(self, server_config: Optional[MCPServerConfig] = None) -> None:
        """
        Connect to the MCP server.
        
        Args:
            server_config: Optional server config (uses instance config if not provided)
            
        Raises:
            MCPConnectionError: If connection fails
        """
        config = server_config or self.server_config
        if not config:
            raise MCPConnectionError("No server configuration provided")
        
        self.server_config = config
        
        logger.info(f"Connecting to MCP server: {config.name} ({config.transport.value})")
        
        try:
            if config.transport == MCPTransport.HTTP:
                await self._connect_http()
            elif config.transport == MCPTransport.STDIO:
                await self._connect_stdio()
            else:
                raise MCPConnectionError(f"Unsupported transport: {config.transport}")
            
            self._connected = True
            logger.info(f"Connected to MCP server: {config.name}")
            
        except Exception as e:
            logger.error(f"Failed to connect to MCP server: {e}")
            raise MCPConnectionError(f"Connection failed: {e}")
    
    async def _connect_http(self) -> None:
        """Connect to an HTTP-based MCP server."""
        if not self.server_config or not self.server_config.url:
            raise MCPConnectionError("HTTP transport requires server_config.url")

        base_url = self.server_config.url.rstrip("/")

        try:
            async with httpx.AsyncClient(timeout=self.server_config.timeout) as client:
                # Basic liveness check
                health = await client.get(f"{base_url}/health")
                health.raise_for_status()

                # Discover tool endpoints from OpenAPI (paths containing '/tools/')
                openapi = await client.get(f"{base_url}/openapi.json")
                openapi.raise_for_status()
                spec = openapi.json()

        except Exception as e:
            raise MCPConnectionError(f"HTTP MCP server not reachable: {e}")

        tools: Dict[str, Dict[str, Any]] = {}
        paths = spec.get("paths") or {}
        for path, methods in paths.items():
            if "/tools/" not in path:
                continue
            # Example: /mcp/wardrobe/tools/search_wardrobe_items -> search_wardrobe_items
            tool_name = path.split("/tools/")[-1].strip("/")
            tools[tool_name] = {
                "name": tool_name,
                "path": path,
                "methods": list((methods or {}).keys()),
            }

        self._available_tools = tools
    
    async def _connect_stdio(self) -> None:
        """Connect to a stdio-based MCP server."""
        # For stdio transport, we'll spawn the server process
        # and establish communication via stdin/stdout
        # This is a placeholder - actual MCP stdio protocol implementation
        # will be added when MCP servers are implemented in Issue 2
        pass
    
    async def disconnect(self) -> None:
        """Disconnect from the MCP server."""
        if not self._connected:
            return
        
        logger.info(f"Disconnecting from MCP server: {self.server_config.name if self.server_config else 'unknown'}")
        self._connected = False
        self._available_tools.clear()
    
    async def list_tools(self) -> List[Dict[str, Any]]:
        """
        List available tools from the MCP server.
        
        Returns:
            List of tool definitions
            
        Raises:
            MCPConnectionError: If not connected
        """
        if not self._connected:
            raise MCPConnectionError("Not connected to MCP server")
        
        return list(self._available_tools.values())
    
    async def call_tool(
        self,
        tool_name: str,
        arguments: Optional[Dict[str, Any]] = None,
        timeout: Optional[float] = None,
    ) -> MCPToolResult:
        """
        Call a tool on the MCP server.
        
        Args:
            tool_name: Name of the tool to call
            arguments: Arguments to pass to the tool
            timeout: Optional timeout override
            
        Returns:
            MCPToolResult with success status and result/error
        """
        start_time = time.time()
        tool_timeout = timeout or (self.server_config.timeout if self.server_config else self.settings.MCP_TIMEOUT)
        
        logger.debug(f"Calling MCP tool: {tool_name} with args: {arguments}")
        
        # Retry logic
        last_error = None
        for attempt in range(self.retry_attempts):
            try:
                result = await self._execute_tool_call(
                    tool_name=tool_name,
                    arguments=arguments or {},
                    timeout=tool_timeout,
                )
                
                duration_ms = (time.time() - start_time) * 1000
                
                return MCPToolResult(
                    success=True,
                    result=result,
                    duration_ms=duration_ms,
                    metadata={
                        "tool_name": tool_name,
                        "attempt": attempt + 1,
                    },
                )
                
            except MCPToolError as e:
                last_error = e
                logger.warning(f"Tool call failed (attempt {attempt + 1}/{self.retry_attempts}): {e}")
                
                if attempt < self.retry_attempts - 1:
                    await asyncio.sleep(self.retry_delay * (2 ** attempt))  # Exponential backoff
        
        # All retries failed
        duration_ms = (time.time() - start_time) * 1000
        error_message = str(last_error) if last_error else "Unknown error"
        
        logger.error(f"Tool call failed after {self.retry_attempts} attempts: {error_message}")
        
        return MCPToolResult(
            success=False,
            result=None,
            error=error_message,
            duration_ms=duration_ms,
            metadata={
                "tool_name": tool_name,
                "attempts": self.retry_attempts,
            },
        )
    
    async def _execute_tool_call(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        timeout: float,
    ) -> Any:
        """
        Execute a tool call on the MCP server.
        
        This is a placeholder implementation. The actual MCP protocol
        implementation will be added when MCP servers are built in Issue 2.
        
        Args:
            tool_name: Name of the tool
            arguments: Tool arguments
            timeout: Timeout in seconds
            
        Returns:
            Tool result
            
        Raises:
            MCPToolError: If the tool call fails
        """
        if not self.server_config or not self.server_config.url:
            raise MCPToolError("HTTP transport requires server_config.url", tool_name=tool_name, error_code="CONFIG")

        if tool_name not in self._available_tools:
            raise MCPToolError(f"Unknown tool: {tool_name}", tool_name=tool_name, error_code="UNKNOWN_TOOL")

        base_url = self.server_config.url.rstrip("/")
        path = self._available_tools[tool_name]["path"]
        url = f"{base_url}{path}"

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(url, json=arguments)
                resp.raise_for_status()
                # Tools return JSON bodies; pass through
                return resp.json()
        except httpx.HTTPStatusError as e:
            status = e.response.status_code
            body = None
            try:
                body = e.response.json()
            except Exception:
                body = e.response.text
            raise MCPToolError(
                message=f"Tool call failed ({status}): {body}",
                tool_name=tool_name,
                error_code="HTTP_ERROR",
            )
        except Exception as e:
            raise MCPToolError(message=f"Tool call failed: {e}", tool_name=tool_name, error_code="ERROR")
    
    @property
    def is_connected(self) -> bool:
        """Check if connected to the MCP server."""
        return self._connected


class MCPClientManager:
    """
    Manager for multiple MCP clients.
    
    Handles connections to multiple MCP servers (wardrobe, commerce, etc.)
    """
    
    def __init__(self):
        """Initialize the MCP client manager."""
        self._clients: Dict[str, MCPClient] = {}
        self._configs: Dict[str, MCPServerConfig] = {}
    
    def register_server(self, config: MCPServerConfig) -> None:
        """
        Register an MCP server configuration.
        
        Args:
            config: Server configuration
        """
        self._configs[config.name] = config
        logger.info(f"Registered MCP server: {config.name}")
    
    async def connect_all(self) -> Dict[str, bool]:
        """
        Connect to all registered MCP servers.
        
        Returns:
            Dictionary mapping server names to connection success
        """
        results = {}
        
        for name, config in self._configs.items():
            try:
                client = MCPClient(server_config=config)
                await client.connect()
                self._clients[name] = client
                results[name] = True
            except MCPConnectionError as e:
                logger.error(f"Failed to connect to {name}: {e}")
                results[name] = False
        
        return results
    
    async def disconnect_all(self) -> None:
        """Disconnect from all MCP servers."""
        for name, client in self._clients.items():
            try:
                await client.disconnect()
            except Exception as e:
                logger.error(f"Error disconnecting from {name}: {e}")
        
        self._clients.clear()
    
    def get_client(self, server_name: str) -> Optional[MCPClient]:
        """
        Get an MCP client by server name.
        
        Args:
            server_name: Name of the server
            
        Returns:
            MCPClient or None if not connected
        """
        return self._clients.get(server_name)
    
    async def call_tool(
        self,
        server_name: str,
        tool_name: str,
        arguments: Optional[Dict[str, Any]] = None,
    ) -> MCPToolResult:
        """
        Call a tool on a specific MCP server.
        
        Args:
            server_name: Name of the server
            tool_name: Name of the tool
            arguments: Tool arguments
            
        Returns:
            MCPToolResult
        """
        client = self.get_client(server_name)
        if not client:
            return MCPToolResult(
                success=False,
                result=None,
                error=f"Server not connected: {server_name}",
            )
        
        return await client.call_tool(tool_name, arguments)


# Global MCP client manager instance
_mcp_manager: Optional[MCPClientManager] = None


def get_mcp_manager() -> MCPClientManager:
    """Get the global MCP client manager."""
    global _mcp_manager
    
    if _mcp_manager is None:
        _mcp_manager = MCPClientManager()
    
    return _mcp_manager
