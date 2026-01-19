"""Unified MCP Servers FastAPI application.

Hosts 5 MCP tool domains:
- wardrobe
- commerce
- web_search
- user_data
- style_dna

Exposes MCP protocol endpoint at /mcp for langchain-mcp-adapters compatibility.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_mcp import FastApiMCP

from mcp_servers.core.config import get_settings
from mcp_servers.wardrobe_server.router import router as wardrobe_router
from mcp_servers.commerce_server.router import router as commerce_router
from mcp_servers.web_search_server.router import router as web_search_router
from mcp_servers.user_data_server.router import router as user_data_router
from mcp_servers.style_dna_server.router import router as style_dna_router


settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Unified MCP servers for Aesthetiq",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "healthy", "service": settings.APP_NAME, "version": settings.APP_VERSION}


app.include_router(wardrobe_router, prefix=f"{settings.API_PREFIX}/wardrobe", tags=["wardrobe"])
app.include_router(commerce_router, prefix=f"{settings.API_PREFIX}/commerce", tags=["commerce"])
app.include_router(web_search_router, prefix=f"{settings.API_PREFIX}/web-search", tags=["web-search"])
app.include_router(user_data_router, prefix=f"{settings.API_PREFIX}/user-data", tags=["user-data"])
app.include_router(style_dna_router, prefix=f"{settings.API_PREFIX}/style-dna", tags=["style-dna"])

# =============================================================================
# MCP Protocol Endpoint
# =============================================================================
# FastApiMCP exposes all FastAPI endpoints as MCP tools at /mcp
# This enables langchain-mcp-adapters to discover and call tools via MCP protocol
# Use mount_http() for streamable HTTP transport (required for langchain-mcp-adapters)
mcp = FastApiMCP(
    app,
    name="Aesthetiq MCP Server",
    description="MCP tools for fashion AI agents - includes wardrobe, commerce, style DNA, user data, and web search",
)
mcp.mount_http()  # Mounts streamable HTTP transport at /mcp (default path)


@app.get("/")
async def root():
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "mcp": "/mcp",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=settings.HOST, port=settings.PORT)

