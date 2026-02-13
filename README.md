# Aesthetiq

Aesthetiq is an agentic fashion platform that combines a personalized style profile, a virtual wardrobe, retailer search, and a multi-agent conversational system. The product includes a web app, a NestJS backend, a Python microservices engine, and a Chrome extension for quick wardrobe capture.

## Key features

- Personalized style and user profile (style DNA, color season, preferences)
- Agentic chat with wardrobe-aware recommendations
- Outfit creation and attachment to chat
- Retailer search with wishlisting
- Image upload and vision analysis
- Chrome extension to save items from any website

## Demo-first quickstart (full stack)

### Prerequisites

- Node.js 20+
- npm 10+
- Docker Engine 20.10+ with Docker Compose v2
- OpenAI API key (for AI features)

### 1) Environment files

Copy the example files and fill in real values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
cp python_engine/.env.example python_engine/.env
```

### 2) Start Python microservices (gateway + agents + ML)

```bash
cd python_engine
docker compose up --build
```

Health check:

```bash
curl http://localhost:8000/health
```

### 3) Start backend API (NestJS)

```bash
cd backend
npm install
npm run start:dev
```

By default the backend runs on port 3001 (set in `backend/.env`).

### 4) Start frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on port 3000.

### 5) Load the Chrome extension (optional)

Follow the instructions in `chrome-extension/README.md` to load the unpacked extension.

## Architecture at a glance

- **Frontend**: Next.js App Router dashboard for chat, wardrobe, outfits, and admin
- **Backend**: NestJS API for user data, wardrobe, outfits, uploads, and AI orchestration
- **Python engine**: FastAPI microservices for agent workflows, ML analysis, embeddings, and MCP tools
- **Chrome extension**: Web capture and upload into wardrobe

### Services and ports (local dev)

| Service | Port | Notes |
| --- | --- | --- |
| Frontend (Next.js) | 3000 | Web UI |
| Backend (NestJS) | 3001 | REST API at `/api` |
| Python gateway | 8000 | Public entry for Python engine |
| Face analysis | 8001 | Internal-only in Docker |
| Conversational agent | 8002 | Internal-only in Docker |
| Embedding service | 8004 | Exposed for local scripts |
| Try-on service | 8005 | Internal-only in Docker |
| MCP servers | 8010 | Internal-only in Docker |

## Subprojects

### Frontend (Next.js)

Location: `frontend/`

Common commands:

```bash
npm run dev
npm run build
npm run start
npm run test
```

### Backend (NestJS)

Location: `backend/`

Common commands:

```bash
npm run start:dev
npm run build
npm run test
npm run test:e2e
```

### Python engine (FastAPI microservices)

Location: `python_engine/`

Run the full stack via Docker Compose:

```bash
docker compose up --build
```

MCP servers can also run standalone:

```bash
python -m pip install -r mcp_servers/requirements.txt
python -m mcp_servers.main
```

### Chrome extension

Location: `chrome-extension/`

Load it as an unpacked extension in Chrome. See `chrome-extension/README.md` for details.

## Environment variables

> These are the minimums for local demo use. See `python_engine/.env.example` for the full list.

### Backend (`backend/.env`)

- `PORT` (default 3001)
- `FRONTEND_URL` (optional, used for CORS)
- `MONGODB_URI` or `MONGO_URI`
- `OPENAI_API_KEY` (AI features)
- `PYTHON_ENGINE_URL` (default http://localhost:8000)
- `CLERK_SECRET_KEY` (auth)
- `APP_VERSION`, `NODE_ENV` (optional)

### Frontend (`frontend/.env.local`)

- `NEXT_PUBLIC_API_URL` (default http://localhost:3001/api)
- `NEXT_PUBLIC_CLERK_JWT_TEMPLATE`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

### Python engine (`python_engine/.env`)

See `python_engine/.env.example` (OpenAI/Azure keys, Mongo, Langfuse, storage, and service config).

## Testing

- Frontend: `npm run test` in `frontend/`
- Backend: `npm run test` or `npm run test:e2e` in `backend/`
- Python engine: service-specific tests under `python_engine/*/tests/`

## Deployment overview (high level)

- **Frontend**: Vercel (see `frontend/README.md` for v0/Vercel sync details)
- **Backend**: Hosted separately (prod compose references a Render URL; update as needed)
- **Python engine**: Containerized images deployed via Azure Container Registry (see `python_engine/docker-compose.prod.yml`)
- **Chrome extension**: Load unpacked for dev; Web Store publishing planned

## Troubleshooting

- **Port conflicts**: Ensure backend uses 3001 and frontend uses 3000 to avoid clashes.
- **CORS errors**: Set `FRONTEND_URL` in backend `.env` to match the frontend origin.
- **Gateway health**: If `http://localhost:8000/health` fails, check Docker logs for service startup.
- **Missing AI output**: Verify `OPENAI_API_KEY` in both backend and python_engine.

## License

MIT (unless otherwise specified per subproject)
