# Aesthetiq Python Engine - Microservices Architecture

This document describes the microservices architecture for the Aesthetiq Python Engine, which splits the monolithic FastAPI application into three isolated services.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Services](#services)
   - [Gateway](#gateway-service)
  - [Face Analysis](#face-analysis-service)
   - [Clothing Recommender](#clothing-recommender-service)
4. [API Reference](#api-reference)
5. [Example Tests](#example-tests)
6. [Configuration](#configuration)
7. [Development](#development)

---

## Quick Start

### Prerequisites

- Docker Engine 20.10+
- Docker Compose v2 (plugin)
- `.env` file with required environment variables

### Running the Services

```bash
# Navigate to python_engine directory
cd python_engine

# Start all services
docker compose up --build

# Or run in detached mode
docker compose up --build -d

# Check service status
docker compose ps

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Verify Services Are Running

```bash
curl http://localhost:8000/health
```

Expected output:
```json
{
  "status": "healthy",
  "gateway": "healthy",
  "services": {
    "face_analysis": { "status": "healthy" },
    "clothing_recommender": { "status": "healthy" }
  }
}
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL CLIENTS                           │
│                     (Frontend, Mobile Apps, etc.)                   │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         GATEWAY (Port 8000)                         │
│                      Reverse Proxy & Router                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │  /health        │  │  /api/v1/ml/*   │  │  /api/v1/agent/*    │  │
│  │  Aggregated     │  │  → face_        │  │  → clothing_        │  │
│  │  health check   │  │    analysis     │  │    recommender      │  │
│  └─────────────────┘  └────────┬────────┘  └──────────┬──────────┘  │
└────────────────────────────────┼──────────────────────┼─────────────┘
                                 │                      │
              ┌──────────────────┘                      └──────────────┐
              ▼                                                        ▼
┌─────────────────────────────────┐      ┌─────────────────────────────────┐
│   FACE ANALYSIS (Port 8001)     │      │  CLOTHING RECOMMENDER (8002)    │
│        Internal Only            │      │        Internal Only            │
│  ┌───────────────────────────┐  │      │  ┌───────────────────────────┐  │
│  │  ML/Computer Vision       │  │      │  │  LLM/Agent Orchestration  │  │
│  │  • Face Analysis          │  │      │  │  • Intent Classification  │  │
│  │  • Color Season Detection │  │      │  │  • Clothing Recommendations│  │
│  │  • Face Shape Detection   │  │      │  │  • General Conversation   │  │
│  └───────────────────────────┘  │      │  │  • Streaming Responses    │  │
│                                 │      │  └───────────────────────────┘  │
│  Dependencies:                  │      │                                 │
│  • PyTorch, TorchVision         │      │  Dependencies:                  │
│  • Transformers, MediaPipe      │      │  • LangChain, LangGraph         │
│  • OpenCV, scikit-learn         │      │  • OpenAI, Langfuse             │
└─────────────────────────────────┘      └─────────────────────────────────┘
```

### Why Microservices?

| Benefit | Description |
|---------|-------------|
| **Dependency Isolation** | ML stack (PyTorch, MediaPipe) is separated from LLM stack (LangChain, LangGraph) to avoid conflicts |
| **Independent Scaling** | Scale ML service separately from LLM service based on load |
| **Fault Isolation** | A crash in one service doesn't affect others |
| **Faster Deployments** | Update one service without rebuilding others |

---

## Services

### Gateway Service

**Purpose**: Single entry point for all external requests. Routes traffic to appropriate internal services.

| Property | Value |
|----------|-------|
| Port | 8000 (external) |
| Container | `aesthetiq-gateway` |
| Directory | `gateway/` |

**Responsibilities**:
- Reverse proxy to internal services
- CORS handling
- Request timeout management
- SSE stream forwarding
- Aggregated health checks

**Route Mapping**:

| External Route | Internal Target |
|----------------|-----------------|
| `/health` | Aggregated from all services |
| `/api/v1/ml/*` | `face_analysis:8001/api/v1/ml/*` |
| `/api/v1/agent/*` | `clothing_recommender:8002/api/v1/agent/*` |

**Gateway Safety Defaults**:

- The gateway enforces a maximum request body size (default: 10 MiB) because it
  materializes request bodies before proxying. Configure via `MAX_REQUEST_BODY_BYTES`.

---

### Face Analysis Service

**Purpose**: Machine learning and computer vision for face/color analysis.

| Property | Value |
|----------|-------|
| Port | 8001 (internal only) |
| Container | `aesthetiq-face-analysis` |
| Directory | `face_analysis/` |

**Capabilities**:
- Face shape detection (Heart, Oval, Round, Square, Oblong)
- Color season analysis (12 seasons: Spring, Summer, Autumn, Winter variants)
- Image preprocessing with MediaPipe face mesh

**Key Dependencies**:
```
torch>=2.0.0
torchvision>=0.15.0
transformers>=4.30.0
mediapipe>=0.10.0
opencv-python-headless>=4.8.0
scikit-learn>=1.3.0
```

---

### Clothing Recommender Service

**Purpose**: LLM-powered conversational agent for fashion recommendations.

| Property | Value |
|----------|-------|
| Port | 8002 (internal only) |
| Container | `aesthetiq-clothing-recommender` |
| Directory | `clothing_recommender/` |

**Capabilities**:
- Intent classification (clothing vs general queries)
- Clothing recommendations with styling tips
- General fashion conversation
- SSE streaming responses

**LangGraph Workflow**:
```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
│   START     │────▶│  Classify   │────▶│  Route Decision     │
└─────────────┘     │   Intent    │     └──────────┬──────────┘
                    └─────────────┘                │
                                      ┌────────────┴────────────┐
                                      ▼                         ▼
                            ┌─────────────────┐      ┌─────────────────┐
                            │    clothing     │      │     general     │
                            │  ClothingExpert │      │  Conversation   │
                            └────────┬────────┘      └────────┬────────┘
                                     │                        │
                                     └────────────┬───────────┘
                                                  ▼
                                           ┌───────────┐
                                           │    END    │
                                           └───────────┘
```

**Key Dependencies**:
```
langchain>=0.1.0
langchain-openai>=0.0.5
langgraph>=0.0.20
langfuse>=2.0.0
openai>=1.0.0
```

---

## API Reference

### Health Check

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "healthy",
  "gateway": "healthy",
  "app_name": "Aesthetiq Python Engine",
  "version": "1.0.0",
  "services": {
    "face_analysis": {
      "status": "healthy",
      "data": {
        "status": "healthy",
        "timestamp": "2025-12-16T15:08:45.934351+00:00"
      }
    },
    "clothing_recommender": {
      "status": "healthy",
      "data": {
        "status": "healthy",
        "timestamp": "2025-12-16T15:08:45.953334+00:00"
      }
    }
  },
  "timestamp": "2025-12-16T15:08:45.955898+00:00"
}
```

---

### Face Analysis

**Endpoint**: `POST /api/v1/ml/analyze-face`

**Input**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Image file (JPEG, PNG) |

**Response**:
```json
{
  "face_shape": "Heart",
  "face_shape_score": 0.894,
  "palette": "Dark Winter",
  "palette_scores": {
    "BRIGHT SPRING": 0.0005,
    "BRIGHT WINTER": 0.001,
    "COOL SUMMER": 0.0001,
    "COOL WINTER": 0.007,
    "DARK AUTUMN": 0.478,
    "DARK WINTER": 0.500,
    "LIGHT SPRING": 0.00001,
    "LIGHT SUMMER": 0.00002,
    "MUTED AUTUMN": 0.010,
    "MUTED SUMMER": 0.0002,
    "WARM AUTUMN": 0.0015,
    "WARM SPRING": 0.0007
  },
  "features": [],
  "processing_time_ms": 839.21
}
```

| Field | Type | Description |
|-------|------|-------------|
| `face_shape` | string | Detected face shape (Heart, Oval, Round, Square, Oblong) |
| `face_shape_score` | float | Confidence score (0-1) |
| `palette` | string | Detected color season |
| `palette_scores` | object | Confidence scores for all 12 seasons |
| `processing_time_ms` | float | Processing time in milliseconds |

---

### Chat (Non-Streaming)

**Endpoint**: `POST /api/v1/agent/chat`

**Input**: `application/json`

```json
{
  "message": "Find me a jacket for a job interview",
  "user_id": "user-123",
  "session_id": "optional-session-id",
  "context": {}
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | User message |
| `user_id` | string | Yes | User identifier |
| `session_id` | string | No | Session ID (auto-generated if not provided) |
| `context` | object | No | Additional context (wardrobe, preferences) |

**Response (General Conversation)**:
```json
{
  "message": "Warm autumn skin tones look fabulous in rich, earthy colors...",
  "session_id": "16a959aa5e8f3fef",
  "metadata": {
    "timestamp": "2025-12-16T15:09:05.154247",
    "workflow_version": "1.0",
    "intent_classification": "general",
    "classification_confidence": "llm_based",
    "agent_used": "GeneralConversation"
  }
}
```

**Response (Clothing Recommendation)**:
```json
{
  "message": "Based on your style profile, here are my recommendations:\n\n1. **Silk Blouse** in Emerald Green...",
  "session_id": "9b753983bcb8714d",
  "metadata": {
    "timestamp": "2025-12-16T15:09:30.016624",
    "workflow_version": "1.0",
    "intent_classification": "clothing",
    "classification_confidence": "llm_based",
    "agent_used": "ClothingExpert"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `message` | string | Agent response |
| `session_id` | string | Session identifier |
| `metadata.intent_classification` | string | `"clothing"` or `"general"` |
| `metadata.agent_used` | string | `"ClothingExpert"` or `"GeneralConversation"` |

---

### Chat Stream (SSE)

**Endpoint**: `POST /api/v1/agent/chat/stream`

**Input**: Same as `/api/v1/agent/chat`

**Response**: `text/event-stream` (Server-Sent Events)

**Event Types**:

| Event Type | Description | Example |
|------------|-------------|---------|
| `metadata` | Session info, route decision | `{"type": "metadata", "session_id": "abc123", ...}` |
| `status` | Progress updates | `{"type": "status", "content": "Analyzing...", "node": "classify"}` |
| `chunk` | Text stream (general) | `{"type": "chunk", "content": "Hello", "node": "general"}` |
| `clothing_item` | Structured recommendations | `{"type": "clothing_item", "content": {...}, "node": "clothing"}` |
| `done` | Stream complete | `{"type": "done", "content": {"route": "general", "message": "..."}}` |

**Stream Flow (General)**:
```
data: {"type": "metadata", "session_id": "...", "user_id": "...", "timestamp": "..."}
data: {"type": "status", "content": "Analyzing your request...", "node": "classify"}
data: {"type": "metadata", "content": {"route": "general", "session_id": "..."}, "node": "classify"}
data: {"type": "status", "content": "Generating response...", "node": "general"}
data: {"type": "chunk", "content": "Hi", "node": "general"}
data: {"type": "chunk", "content": " there", "node": "general"}
data: {"type": "chunk", "content": "!", "node": "general"}
data: {"type": "metadata", "content": {"message_complete": true}, "node": "general"}
data: {"type": "done", "content": {"route": "general", "session_id": "...", "message": "Hi there!"}, "node": "end"}
```

**Stream Flow (Clothing)**:
```
data: {"type": "metadata", "session_id": "...", "user_id": "...", "timestamp": "..."}
data: {"type": "status", "content": "Analyzing your request...", "node": "classify"}
data: {"type": "metadata", "content": {"route": "clothing", "session_id": "..."}, "node": "classify"}
data: {"type": "status", "content": "Searching clothing database...", "node": "clothing"}
data: {"type": "status", "content": "Found 3 recommendations", "node": "clothing"}
data: {"type": "clothing_item", "content": {"recommendations": [...], "styling_tips": [...]}, "node": "clothing"}
data: {"type": "metadata", "content": {"message_complete": true}, "node": "clothing"}
data: {"type": "done", "content": {"route": "clothing", "session_id": "...", "message": "..."}, "node": "end"}
```

**Clothing Item Structure**:
```json
{
  "recommendations": [
    {
      "index": 1,
      "item": "Silk Blouse",
      "color": "Emerald Green",
      "style": "Professional, elegant",
      "reason": "Complements your color season and face shape",
      "price_range": "$80-150",
      "where_to_buy": ["Nordstrom", "Bloomingdale's"],
      "hex_color": "#50C878"
    }
  ],
  "styling_tips": [
    "Pair the emerald blouse with camel trousers for a striking contrast"
  ]
}
```

---

## Example Tests

### Health Check

```bash
curl http://localhost:8000/health
```

### Face Analysis

```bash
curl -X POST http://localhost:8000/api/v1/ml/analyze-face \
  -F "file=@your-photo.jpg"
```

### General Conversation

```bash
curl -X POST http://localhost:8000/api/v1/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What colors suit warm autumn skin tones?",
    "user_id": "user-123"
  }'
```

### Clothing Recommendation

```bash
curl -X POST http://localhost:8000/api/v1/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Find me a jacket for a job interview",
    "user_id": "user-123"
  }'
```

### Streaming Response

```bash
curl -N -X POST http://localhost:8000/api/v1/agent/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Suggest me shoes for work",
    "user_id": "user-123"
  }'
```

---

## Configuration

### Environment Variables

Create a `.env` file in the `python_engine/` directory:

```env
# Application
APP_NAME="Aesthetiq Python Engine"
APP_VERSION="1.0.0"
DEBUG=true
LOG_LEVEL=INFO

# LLM Configuration
OPENAI_API_KEY=sk-your-openai-api-key
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini

# Langfuse (Observability)
LANGFUSE_PUBLIC_KEY=pk-lf-your-public-key
LANGFUSE_SECRET_KEY=sk-lf-your-secret-key
LANGFUSE_HOST=https://cloud.langfuse.com

# ML Service
DEVICE=cpu
WEIGHTS_DIR=/app/weights

# Gateway (auto-configured in docker-compose)
FACE_ANALYSIS_URL=http://face_analysis:8001
CLOTHING_RECOMMENDER_URL=http://clothing_recommender:8002

# Gateway timeouts (optional; defaults are lenient)
ML_SERVICE_TIMEOUT=300.0
LLM_SERVICE_TIMEOUT=600.0
```

### Docker Compose Configuration

The `docker-compose.yml` configures:

| Service | Port | Exposed | Memory Limit |
|---------|------|---------|--------------|
| gateway | 8000 | Yes (external) | - |
| face_analysis | 8001 | No (internal) | 4GB |
| clothing_recommender | 8002 | No (internal) | 2GB |

**Volume Mounts**:
- `./weights:/app/weights:ro` - Model weights (face_analysis)
- `./uploads:/app/uploads:rw` - Image uploads (face_analysis)

---

## Development

### Directory Structure

```
python_engine/
├── docker-compose.yml          # Service orchestration
├── .env                        # Environment variables
├── .env.example                # Environment template
│
├── gateway/                    # Gateway service
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── proxy.py
│       └── routes/
│           ├── health.py
│           ├── ml.py
│           └── agent.py
│
├── face_analysis/             # ML/CV service
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── models/
│   │   ├── resnet.py
│   │   └── bisenet.py
│   ├── weights/
│   └── app/
│       ├── main.py
│       ├── core/
│       ├── api/v1/endpoints/
│       ├── services/
│       ├── schemas/
│       └── utils/
│
└── clothing_recommender/       # LLM/Agent service
    ├── Dockerfile
    ├── requirements.txt
    └── app/
        ├── main.py
        ├── core/
        ├── api/v1/endpoints/
        ├── agents/
        ├── services/llm/
        ├── prompts/templates/
        ├── schemas/
        └── utils/
```

### Building Individual Services

```bash
# Rebuild only face_analysis
docker compose build face_analysis
docker compose up face_analysis

# Rebuild only clothing_recommender
docker compose build clothing_recommender
docker compose up clothing_recommender
```

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f face_analysis
docker compose logs -f clothing_recommender
docker compose logs -f gateway
```

### Running Without Docker (Development)

```bash
# Terminal 1: Face Analysis
cd face_analysis
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2: Clothing Recommender
cd clothing_recommender
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload

# Terminal 3: Gateway (update .env with localhost URLs)
cd gateway
pip install -r requirements.txt
FACE_ANALYSIS_URL=http://localhost:8001 \
CLOTHING_RECOMMENDER_URL=http://localhost:8002 \
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `Connection refused` | Ensure all services are running: `docker compose ps` |
| `Service unhealthy` | Check logs: `docker compose logs <service>` |
| `Out of memory` | Increase Docker memory limits or reduce batch sizes |
| `CUDA not available` | Set `DEVICE=cpu` in `.env` |
| `sklearn import error` | Ensure `scikit-learn` is in requirements.txt |

### Health Check Failed

```bash
# Check individual service health
curl http://localhost:8000/api/v1/ml/health     # Face Analysis
curl http://localhost:8000/api/v1/agent/health  # Clothing Recommender
```

### Rebuilding After Changes

```bash
docker compose down
docker compose build --no-cache
docker compose up
```

---