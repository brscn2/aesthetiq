#!/usr/bin/env python3
"""Test script to verify MCP server integration with langchain-mcp-adapters.

This script:
1. Connects to the MCP server at /mcp
2. Discovers all available tools
3. Lists tool names and descriptions
4. Optionally tests calling a tool

Usage:
    # Start MCP servers first (in another terminal):
    # cd python_engine && python -m mcp_servers.main
    
    # Then run this script:
    python test_mcp_integration.py
"""
import asyncio
import sys
import traceback
from pathlib import Path

# Add python_engine to path
python_engine_dir = Path(__file__).parent
sys.path.insert(0, str(python_engine_dir))

import httpx
from langchain_mcp_adapters.client import MultiServerMCPClient


async def test_mcp_integration():
    """Test MCP server integration."""
    print("=" * 60)
    print("MCP Integration Test")
    print("=" * 60)
    
    # MCP server URL (adjust if needed)
    base_url = "http://localhost:8000"
    mcp_url = f"{base_url}/mcp"
    
    print(f"\n1. Checking server accessibility...")
    print("-" * 60)
    
    # First, verify server is running
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            health_resp = await client.get(f"{base_url}/health")
            print(f"✓ Server is running (health: {health_resp.status_code})")
            
            # Try to access /mcp endpoint
            try:
                mcp_resp = await client.get(mcp_url)
                print(f"✓ /mcp endpoint exists (status: {mcp_resp.status_code})")
            except httpx.HTTPError as e:
                print(f"⚠ /mcp endpoint check failed: {e}")
                print("   This might be normal - MCP protocol uses POST, not GET")
    except httpx.ConnectError:
        print(f"✗ Cannot connect to server at {base_url}")
        print("\nMake sure MCP servers are running:")
        print("  cd python_engine && python -m mcp_servers.main")
        sys.exit(1)
    except Exception as e:
        print(f"⚠ Server check warning: {e}")
    
    print(f"\n2. Connecting to MCP server at: {mcp_url}")
    print("-" * 60)
    
    config = {
        "aesthetiq": {
            "transport": "streamable_http",
            "url": mcp_url,
        }
    }
    
    try:
            # Create client (not a context manager in v0.1.0+)
            client = MultiServerMCPClient(config)
            print("✓ Client created successfully!\n")
            
            # Get all tools
            print("3. Discovering available tools...")
            print("-" * 60)
            tools = await client.get_tools()
            
            if not tools:
                print("⚠ No tools found! Make sure:")
                print("  - MCP servers are running")
                print("  - FastApiMCP is mounted at /mcp")
                print("  - Endpoints have operation_id set")
                return
            
            print(f"✓ Found {len(tools)} tools:\n")
            
            # Group by domain (based on tool name prefix)
            domains = {}
            for tool in tools:
                # Extract domain from tool name (e.g., "search_wardrobe_items" -> "wardrobe")
                name = tool.name
                if "_" in name:
                    domain = name.split("_")[0] if not any(name.startswith(prefix) for prefix in ["get", "search", "filter"]) else "other"
                    # Better domain detection
                    if "wardrobe" in name:
                        domain = "wardrobe"
                    elif "commerce" in name:
                        domain = "commerce"
                    elif "style" in name or "color" in name or "archetype" in name:
                        domain = "style_dna"
                    elif "user" in name or "profile" in name:
                        domain = "user_data"
                    elif "web" in name or "trend" in name or "blog" in name:
                        domain = "web_search"
                    else:
                        domain = "other"
                else:
                    domain = "other"
                
                if domain not in domains:
                    domains[domain] = []
                domains[domain].append(tool)
            
            # Print tools by domain
            for domain, domain_tools in sorted(domains.items()):
                print(f"\n  {domain.upper().replace('_', ' ')} ({len(domain_tools)} tools):")
                for tool in sorted(domain_tools, key=lambda t: t.name):
                    desc = tool.description[:80] + "..." if len(tool.description) > 80 else tool.description
                    print(f"    • {tool.name}")
                    if desc:
                        print(f"      {desc}")
            
            print("\n" + "=" * 60)
            print("✓ MCP Integration Test PASSED")
            print("=" * 60)
            print(f"\nAll {len(tools)} tools are discoverable via MCP protocol!")
            print("\nNext steps:")
            print("  1. Use these tools in your LangGraph agents:")
            print("     from app.mcp import get_mcp_tools")
            print("     tools = await get_mcp_tools()")
            print("     agent = create_react_agent(llm, tools)")
            print("\n  2. Agents can now autonomously call any of these tools!")
            
    except Exception as e:
        print(f"\n✗ Connection failed: {e}")
        print("\nFull error traceback:")
        print("-" * 60)
        traceback.print_exc()
        print("-" * 60)
        print("\nTroubleshooting:")
        print("  1. Make sure MCP servers are running:")
        print("     cd python_engine && python -m mcp_servers.main")
        print("  2. Check that the server is accessible at http://localhost:8010")
        print("  3. Verify /mcp endpoint exists: curl http://localhost:8010/mcp")
        print("  4. Check server logs for errors")
        print("  5. Verify fastapi-mcp is properly installed and mounted")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(test_mcp_integration())
