# Issue 2: MCP Servers Implementation and Test Endpoints

## Overview
Implement all 5 MCP servers that provide tools for the agents. Each server should be independently testable and expose test endpoints to verify functionality.

## Context
MCP (Model Context Protocol) servers provide standardized tools that agents can call. We need 5 servers: Wardrobe, Commerce, Web Search, User Data, and Style DNA. Each server should be implemented, tested, and verified before moving to the next.

## Tasks

### 1. Wardrobe MCP Server
- Create `mcp_servers/wardrobe_server/`
- Implement tools:
  - `search_wardrobe_items(query, user_id, filters)` - Semantic search in user's wardrobe
  - `get_wardrobe_item(item_id, user_id)` - Get specific item
  - `filter_wardrobe_items(user_id, filters)` - Filter items by criteria
- Connect to MongoDB Wardrobe collection
- Use embedding service for semantic search
- Add test endpoint: `GET /test/search?query=jackets&user_id=xxx`

### 2. Commerce MCP Server
- Create `mcp_servers/commerce_server/`
- Implement tools:
  - `search_commerce_items(query, style_dna, filters)` - Search with style DNA ranking
  - `get_commerce_item(item_id)` - Get specific item
  - `filter_commerce_items(filters)` - Filter items
- Connect to MongoDB Commerce collection
- Implement style DNA ranking logic (color season matching)
- Add test endpoint: `GET /test/search?query=jackets&style_dna=warm_autumn`

### 3. Web Search MCP Server
- Create `mcp_servers/web_search_server/`
- Implement tools:
  - `web_search(query, max_results)` - Search web for clothing items
  - `search_trends(topic)` - Search fashion trends
  - `search_blogs(query)` - Search fashion blogs
- Integrate with Tavily API (or similar)
- Add test endpoint: `GET /test/search?query=jackets`

### 4. User Data MCP Server
- Create `mcp_servers/user_data_server/`
- Implement tools:
  - `get_user_profile(user_id)` - Get user profile
  - `get_user_wardrobe(user_id)` - Get all user's wardrobe items
  - `get_user_preferences(user_id)` - Get user preferences
- Connect to MongoDB User Profiles collection
- Add test endpoint: `GET /test/profile?user_id=xxx`

### 5. Style DNA MCP Server
- Create `mcp_servers/style_dna_server/`
- Implement tools:
  - `get_style_dna(user_id)` - Get complete style DNA
  - `get_color_season(user_id)` - Get color season
  - `get_style_archetype(user_id)` - Get style archetype
  - `get_recommended_colors(user_id)` - Get recommended colors
- Connect to MongoDB Style Profiles collection
- Add test endpoint: `GET /test/style-dna?user_id=xxx`

## Testing Requirements
For each MCP server:
- Unit tests (mock dependencies)
- Integration tests (real MongoDB/APIs)
- Test endpoint verification (manual testing via HTTP)
- All tests must pass

## Files to Create
For each server (5 total):
- `mcp_servers/{server_name}/server.py`
- `mcp_servers/{server_name}/tools.py`
- `mcp_servers/{server_name}/__init__.py`
- `mcp_servers/{server_name}/requirements.txt`
- `mcp_servers/{server_name}/tests/test_tools.py`
- `mcp_servers/{server_name}/tests/test_integration.py`

## How to Create PR
1. Create feature branch: `git checkout -b feature/mcp-servers`
2. Implement all 5 MCP servers
3. Write tests for each server
4. Run tests: `pytest mcp_servers/ -v`
5. Test each server's test endpoint manually
6. Commit: `git commit -m "feat: implement all MCP servers"`
7. Push: `git push origin feature/mcp-servers`
8. Create PR with:
   - Description of all 5 servers
   - Test results for each server
   - Screenshots of test endpoint responses
   - Checklist of completed servers

## PR Title
`[Phase 2] MCP Servers Implementation`

## Dependencies
- Issue 1 (Core Infrastructure - MCP Client)

## Blocks
- Issue 3 (Agents - need MCP servers to call)

## Estimated Time
5-7 days
