"""MCP (Model Context Protocol) client for tool calls."""
import asyncio
import json
from typing import Dict, Any, Optional, List, Callable, Awaitable
from dataclasses import dataclass, field
from enum import Enum
import time

from app.core.config import get_settings
from app.core.logger import get_logger

logger = get_logger(__name__)


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
        # For HTTP transport, we'll verify the server is available
        # and fetch the list of available tools
        # This is a placeholder - actual MCP HTTP protocol implementation
        # will be added when MCP servers are implemented in Issue 2
        pass
    
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
        # Placeholder implementation
        # In the real implementation, this will:
        # 1. Send JSON-RPC request to the MCP server
        # 2. Wait for response with timeout
        # 3. Parse and return the result
        
        raise MCPToolError(
            message="MCP server not implemented yet (see Issue 2)",
            tool_name=tool_name,
            error_code="NOT_IMPLEMENTED",
        )
    
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
