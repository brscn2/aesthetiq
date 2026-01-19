## MCP Servers (Unified FastAPI Service)

This package hosts the 5 MCP tool domains used by agents:

- Wardrobe: `/mcp/wardrobe/...`
- Commerce: `/mcp/commerce/...`
- Web Search: `/mcp/web-search/...`
- User Data: `/mcp/user-data/...`
- Style DNA: `/mcp/style-dna/...`

### Run locally

From `python_engine/`:

```bash
python -m pip install -r mcp_servers/requirements.txt
python -m mcp_servers.main
```

Default port is `8010` (override with `PORT`).

### Test endpoints (manual)

- Wardrobe: `GET /mcp/wardrobe/test/search?query=jackets&user_id=xxx`
- Commerce: `GET /mcp/commerce/test/search?query=jackets&style_dna=warm_autumn`
- Web Search: `GET /mcp/web-search/test/search?query=jackets`
- User Data: `GET /mcp/user-data/test/profile?user_id=xxx`
- Style DNA: `GET /mcp/style-dna/test/style-dna?user_id=xxx`

### Notes

- Mongo integration requires `MONGODB_URI` in the environment.
- Web search requires `TAVILY_API_KEY` (tests mock this by default).

