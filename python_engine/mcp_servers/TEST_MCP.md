# Testing MCP Integration

This guide shows how to verify that MCP servers are properly integrated with `langchain-mcp-adapters`.

## Quick Test

### 1. Start MCP Servers

In one terminal:

```bash
cd python_engine
python -m mcp_servers.main
```

You should see:
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8010
```

### 2. Verify MCP Endpoint

In another terminal, check that `/mcp` endpoint exists:

```bash
curl http://localhost:8010/mcp
```

You should get a response (may be an error, but endpoint should exist).

### 3. Run Integration Test

```bash
cd python_engine
python test_mcp_integration.py
```

Expected output:
```
============================================================
MCP Integration Test
============================================================

1. Connecting to MCP server at: http://localhost:8010/mcp
------------------------------------------------------------
✓ Connected successfully!

2. Discovering available tools...
------------------------------------------------------------
✓ Found 14 tools:

  COMMERCE (3 tools):
    • filter_commerce_items
      Filter commerce items by category, brand, price range, etc.
    • get_commerce_item
      Get a single commerce item by ID.
    • search_commerce_items
      Search commerce items using semantic similarity + style DNA ranking.

  STYLE DNA (4 tools):
    • get_color_season
      Get color season, contrast level, and undertone from ColorAnalysis.
    • get_recommended_colors
      Get recommended colors based on color season + user's personalized palette.
    • get_style_archetype
      Get style archetype and sliders from StyleProfile.
    • get_style_dna
      Get complete style DNA (combines StyleProfile + ColorAnalysis).

  USER DATA (1 tools):
    • get_user_profile
      Get user profile by clerkId.

  WARDROBE (3 tools):
    • filter_wardrobe_items
      Filter wardrobe items by category, brand, colors, etc.
    • get_wardrobe_item
      Get a single wardrobe item by ID.
    • search_wardrobe_items
      Semantic search in user's wardrobe using CLIP embeddings.

  WEB SEARCH (3 tools):
    • search_blogs
      ...
    • search_trends
      ...
    • web_search
      ...

============================================================
✓ MCP Integration Test PASSED
============================================================
```

## Manual Testing with Python REPL

```python
import asyncio
from langchain_mcp_adapters.client import MultiServerMCPClient

async def test():
    config = {
        "aesthetiq": {
            "transport": "streamable_http",
            "url": "http://localhost:8010/mcp",
        }
    }
    
    async with MultiServerMCPClient(config) as client:
        tools = client.get_tools()
        print(f"Found {len(tools)} tools")
        for tool in tools:
            print(f"  - {tool.name}: {tool.description[:60]}...")

asyncio.run(test())
```

## Testing from Conversational Agent

The conversational agent should automatically discover tools on startup:

```python
# In conversational_agent
from app.mcp import get_mcp_tools

tools = await get_mcp_tools()
print(f"Loaded {len(tools)} MCP tools")
for tool in tools:
    print(f"  - {tool.name}")
```

## Troubleshooting

### No tools found

1. **Check FastApiMCP is mounted:**
   ```python
   # In mcp_servers/main.py
   mcp = FastApiMCP(app)
   mcp.mount()  # Must be called after all routers are added
   ```

2. **Verify operation_id is set:**
   ```python
   @router.post("/tools/search_wardrobe_items", operation_id="search_wardrobe_items")
   ```

3. **Check server logs** for errors during startup

### Connection refused

1. **Verify server is running:**
   ```bash
   curl http://localhost:8010/health
   ```

2. **Check port is correct** (default: 8010)

3. **Verify Docker network** if using containers:
   ```bash
   docker-compose ps
   ```

### Tools not showing up

1. **Ensure endpoints are POST** (FastApiMCP only exposes POST by default)

2. **Check OpenAPI schema:**
   ```bash
   curl http://localhost:8010/openapi.json | jq '.paths'
   ```

3. **Verify operation_id matches tool name** for clarity

## Next Steps

Once tools are discoverable:

1. **Use in LangGraph agents:**
   ```python
   from langgraph.prebuilt import create_react_agent
   from app.mcp import get_mcp_tools
   
   tools = await get_mcp_tools()
   agent = create_react_agent(llm, tools)
   ```

2. **Test agent tool calling:**
   ```python
   result = await agent.ainvoke({
       "messages": [HumanMessage(content="Find me a warm autumn jacket")]
   })
   ```

3. **Monitor tool usage** in Langfuse traces
