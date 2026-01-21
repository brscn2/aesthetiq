# Conversational Agent Setup Guide

This guide covers the setup and configuration of the AesthetIQ Conversational Agent.

## Prerequisites

- Python 3.11+
- Docker and Docker Compose
- OpenAI API key
- MongoDB instance (for MCP servers)

## Environment Variables

Create a `.env` file in `python_engine/` with the following variables:

### Required Variables

```bash
# =============================================================================
# OpenAI Configuration (Required)
# =============================================================================
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4o
OPENAI_TEMPERATURE=0.7

# =============================================================================
# MongoDB (Required for MCP Servers)
# =============================================================================
MONGODB_URI=mongodb://localhost:27017/aesthetiq
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/aesthetiq

# =============================================================================
# MCP Servers Configuration
# =============================================================================
# URL of the unified MCP servers service
MCP_SERVERS_URL=http://mcp_servers:8010
# For local development without Docker:
# MCP_SERVERS_URL=http://localhost:8010

# Retry configuration
MCP_RETRY_ATTEMPTS=3
MCP_RETRY_DELAY=1.0
MCP_TIMEOUT=30.0

# =============================================================================
# Backend Integration (NestJS)
# =============================================================================
# For Docker:
BACKEND_URL=http://host.docker.internal:3001
# For local development:
# BACKEND_URL=http://localhost:3001

BACKEND_TIMEOUT=30.0
```

### Optional Variables

```bash
# =============================================================================
# Langfuse Tracing (Optional but Recommended)
# =============================================================================
LANGFUSE_ENABLED=true
LANGFUSE_PUBLIC_KEY=pk-your-langfuse-public-key
LANGFUSE_SECRET_KEY=sk-your-langfuse-secret-key
LANGFUSE_HOST=https://cloud.langfuse.com

# =============================================================================
# Tavily Web Search (Optional - for web search fallback)
# =============================================================================
TAVILY_API_KEY=tvly-your-tavily-api-key

# =============================================================================
# Guardrails Configuration
# =============================================================================
GUARDRAIL_PROVIDERS=guardrails-ai
GUARDRAIL_MAX_INPUT_LENGTH=10000
GUARDRAIL_MAX_OUTPUT_LENGTH=50000
GUARDRAILS_AI_THRESHOLD=0.5

# =============================================================================
# Workflow Configuration
# =============================================================================
MAX_REFINEMENT_ITERATIONS=3
MAX_CONVERSATION_HISTORY=10

# =============================================================================
# Application Settings
# =============================================================================
DEBUG=false
LOG_LEVEL=INFO
LOG_FORMAT=console
HOST=0.0.0.0
PORT=8002

# =============================================================================
# CORS Configuration
# =============================================================================
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

## Frontend Environment Variables

Add to your frontend's `.env.local`:

```bash
# =============================================================================
# API URLs
# =============================================================================
# NestJS Backend (all requests including agent go through here)
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

**Note:** The frontend now goes through the NestJS backend for agent requests.
This provides unified authentication, logging, and a single API entry point.

## Running with Docker Compose

1. **Start all services:**

```bash
cd python_engine
docker-compose up -d
```

This starts:
- Gateway (port 8000)
- Conversational Agent (internal port 8002)
- MCP Servers (internal port 8010)
- Embedding Service (port 8004)
- Face Analysis (internal port 8001)

2. **Check service health:**

```bash
curl http://localhost:8000/health
```

3. **View logs:**

```bash
docker-compose logs -f clothing_recommender
```

## Running Locally (Development)

1. **Start MCP Servers first:**

```bash
cd python_engine/mcp_servers
pip install -r requirements.txt
uvicorn main:app --port 8010
```

2. **Start the Conversational Agent:**

```bash
cd python_engine/conversational_agent
pip install -r requirements.txt
uvicorn app.main:app --port 8002 --reload
```

3. **Start the Gateway:**

```bash
cd python_engine/gateway
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload
```

## API Endpoints

### Health Check
```
GET /api/v1/health
```

### Non-Streaming Chat
```
POST /api/v1/agent/chat
Content-Type: application/json

{
  "user_id": "user_123",
  "session_id": "optional_session_id",
  "message": "I need a jacket for a job interview"
}
```

### Streaming Chat (SSE)
```
POST /api/v1/agent/chat/stream
Content-Type: application/json
Accept: text/event-stream

{
  "user_id": "user_123",
  "session_id": "optional_session_id",
  "message": "I need a jacket for a job interview"
}
```

### Stream Event Types

| Event Type | Description |
|------------|-------------|
| `metadata` | Session info (session_id, user_id, trace_id) |
| `status` | Human-readable status message |
| `node_start` | Workflow node started |
| `node_end` | Workflow node completed |
| `intent` | Intent classification result |
| `filters` | Extracted search filters |
| `items_found` | Number of items found |
| `analysis` | Analyzer decision |
| `tool_call` | MCP tool being called |
| `chunk` | Response text chunk |
| `done` | Final complete response |
| `error` | Error occurred |

## Troubleshooting

### MCP Connection Failed

If you see "MCP client connection failed", check:
1. MCP servers are running at the configured URL
2. The URL is accessible from the conversational agent container
3. MongoDB is running and accessible

### No Items Found

If the agent returns no items:
1. Verify MongoDB has wardrobe/commerce data
2. Check MCP server logs for errors
3. Verify embedding service is running

### Streaming Not Working

If SSE streaming fails:
1. Ensure the client accepts `text/event-stream`
2. Check for proxy buffering (add `X-Accel-Buffering: no` header)
3. Verify the gateway passes through streaming correctly

## Backend Environment Variables (NestJS)

Add to your backend's `.env`:

```bash
# =============================================================================
# Python Gateway URL (for agent proxy)
# =============================================================================
PYTHON_GATEWAY_URL=http://localhost:8000

# Timeout for agent requests (milliseconds)
AGENT_TIMEOUT=120000
```

## Architecture Overview

```
Frontend (Next.js)
    │
    │ NEXT_PUBLIC_API_URL (port 3001)
    ▼
NestJS Backend (port 3001)
    │
    │ /api/agent/* - Proxies to Python Gateway
    │ - Handles Clerk authentication
    │ - Injects user_id from auth token
    │ - Logs requests/responses
    ▼
Python Gateway (port 8000)
    │
    │ /api/v1/agent/* - Routes to Conversational Agent
    ▼
Conversational Agent (port 8002)
    │
    ├── LangGraph Workflow
    │   ├── Input Guardrails
    │   ├── Intent Classifier
    │   ├── Query Analyzer
    │   ├── Conversation Agent (general intent)
    │   ├── Clothing Recommender (clothing intent)
    │   ├── Clothing Analyzer
    │   ├── Output Guardrails
    │   └── Response Formatter
    │
    └── MCP Tools via MCP_SERVERS_URL
        ▼
MCP Servers (port 8010)
    ├── Wardrobe Server
    ├── Commerce Server
    ├── Style DNA Server
    ├── User Data Server
    └── Web Search Server
            │
            ▼
        MongoDB + External APIs (Tavily)
```

## Why Route Through Backend?

1. **Single Entry Point**: Frontend only needs one API URL
2. **Unified Authentication**: Clerk JWT validation happens in one place (NestJS)
3. **User ID Injection**: Backend injects authenticated user_id into agent requests
4. **Consistent Logging**: All requests logged through NestJS audit system
5. **CORS Simplicity**: Only backend handles frontend CORS
6. **Rate Limiting**: Can be applied at backend level
