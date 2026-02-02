# Virtual Try-On Service - Current Status

## ✅ Service Status: RUNNING

The virtual try-on service is **UP and HEALTHY** but **NOT ACCESSIBLE** from the backend due to missing gateway routing.

### Docker Services Status

```
✅ aesthetiq-try-on          HEALTHY (Up 6 minutes)    Port: 8005 (internal)
✅ aesthetiq-gateway          HEALTHY (Up 4 hours)      Port: 8000 (external)
✅ aesthetiq-conversational   HEALTHY (Up 4 hours)      Port: 8002 (internal)
✅ aesthetiq-face-analysis    HEALTHY (Up 4 hours)      Port: 8001 (internal)
✅ aesthetiq-embedding        HEALTHY (Up 4 hours)      Port: 8004 (external)
✅ aesthetiq-mcp-servers      HEALTHY (Up 4 hours)      Port: 8010 (internal)
```

### Service Logs

The try-on service started successfully:
- ✅ OpenAI Service initialized
- ✅ Model: gpt-image-1
- ✅ Port: 8005
- ✅ Temp directory created: /tmp/try_on_images
- ✅ Health checks passing

## ❌ Current Issue: Missing Gateway Route

### Problem

The backend is configured to call:
```
PYTHON_ENGINE_URL=http://localhost:8000
```

And makes requests to:
```
POST http://localhost:8000/api/v1/try-on/generate
```

However, the **gateway does NOT have a route** for `/api/v1/try-on/*` requests.

### Gateway Routes (Current)

The gateway only routes these paths:
- `/api/v1/ml/*` → face_analysis service (port 8001)
- `/api/v1/agent/*` → conversational_agent service (port 8002)
- `/api/v1/embeddings/*` → embedding_service service (port 8004)

**Missing:** `/api/v1/try-on/*` → try_on_service (port 8005)

## 🔧 Solution Options

### Option 1: Add Gateway Route (Recommended)

Add a new route file to the gateway to proxy try-on requests:

**File:** `python_engine/gateway/app/routes/try_on.py`

```python
"""Try-On service routes."""
from fastapi import APIRouter, Request
from app.proxy import proxy
from app.config import get_settings

settings = get_settings()
router = APIRouter()

@router.api_route(
    "/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    include_in_schema=False
)
async def proxy_try_on(request: Request, path: str):
    """Proxy all requests to try-on service."""
    target_url = f"{settings.TRY_ON_SERVICE_URL}/{path}"
    return await proxy.proxy_request(request, target_url)
```

Then update `python_engine/gateway/app/main.py`:
```python
from app.routes import health, ml, agent, embeddings, try_on

# Add this line:
app.include_router(try_on.router, prefix=f"{settings.API_V1_PREFIX}/try-on", tags=["try-on"])
```

And update `python_engine/gateway/app/config.py`:
```python
TRY_ON_SERVICE_URL: str = "http://try_on_service:8005/api/v1/try-on"
```

### Option 2: Direct Connection (Quick Fix)

Update backend to connect directly to the try-on service:

**File:** `backend/.env`
```env
# Change from:
PYTHON_ENGINE_URL=http://localhost:8000

# To:
PYTHON_ENGINE_URL=http://localhost:8000
TRY_ON_SERVICE_URL=http://localhost:8005
```

**File:** `backend/src/try-on/try-on.service.ts`
```typescript
constructor(private readonly httpService: HttpService) {
  // Use dedicated try-on service URL if available
  this.pythonEngineUrl =
    process.env.TRY_ON_SERVICE_URL || 
    process.env.PYTHON_ENGINE_URL || 
    'http://localhost:8000';
  this.logger.log(`Try-On Service URL: ${this.pythonEngineUrl}`);
}
```

## 🧪 How to Test (After Fix)

### 1. Verify Services Running

```bash
cd python_engine
docker compose ps
```

All services should show "healthy" status.

### 2. Test Try-On Service Directly

```bash
# Health check
curl http://localhost:8005/health

# Should return:
# {"status":"healthy","service":"Aesthetiq Virtual Try-On","version":"1.0.0"}
```

### 3. Upload Try-On Photo

1. Navigate to: `http://localhost:3000/settings`
2. Click "Virtual Try-On" in left navigation
3. Upload a full-body photo (JPG, PNG, or WebP, max 10MB)
4. Verify photo appears in preview

### 4. Generate Try-On Image

1. Navigate to: `http://localhost:3000/find-your-style`
2. Select 1-3 clothing items by clicking on them
3. Click "Generate Try-On" button (sparkles icon)
4. Wait 10-30 seconds for generation
5. View result in modal
6. Download if desired

### 5. Check Logs

```bash
# Backend logs
cd backend
npm run start:dev

# Python try-on service logs
cd python_engine
docker compose logs -f try_on_service

# Gateway logs (if using Option 1)
docker compose logs -f gateway
```

## 📋 Testing Checklist

- [ ] All Docker services are healthy
- [ ] Gateway route added (Option 1) OR backend env updated (Option 2)
- [ ] Backend restarted after env change
- [ ] Gateway restarted after route change (if Option 1)
- [ ] Health check returns 200: `curl http://localhost:8005/health`
- [ ] Photo upload works in Settings page
- [ ] Photo preview displays correctly
- [ ] Try-on generation button appears on Find Your Style page
- [ ] Try-on generation completes successfully
- [ ] Generated image displays in modal
- [ ] Download button works

## 🔍 Troubleshooting

### Service Not Responding

```bash
# Check if service is running
docker compose ps try_on_service

# View logs
docker compose logs try_on_service

# Restart service
docker compose restart try_on_service
```

### OpenAI API Errors

```bash
# Check if API key is set
docker compose exec try_on_service env | grep OPENAI_API_KEY

# Should show: OPENAI_API_KEY=sk-...
```

If missing, add to `python_engine/.env`:
```env
OPENAI_API_KEY=your_key_here
```

Then restart:
```bash
docker compose restart try_on_service
```

### Connection Refused

If backend shows "ECONNREFUSED":
- Verify gateway route exists (Option 1)
- OR verify backend uses correct URL (Option 2)
- Check Docker network: `docker network inspect aesthetiq-network`

### Timeout Errors

If generation times out:
- Check OpenAI API status
- Increase timeout in `backend/src/try-on/try-on.service.ts` (currently 60s)
- Check image sizes (large images take longer)

## 📝 Next Steps

1. **Choose and implement** one of the solution options above
2. **Restart** affected services
3. **Test** the complete flow
4. **Monitor** logs during testing
5. **Document** any additional issues found

## 🎯 Expected Results

After implementing the fix:
- Backend successfully connects to try-on service
- Photo uploads save to user profile
- Try-on generation completes in 10-30 seconds
- Generated images display correctly
- No connection or timeout errors

## 📚 Related Files

- Testing Guide: `VIRTUAL_TRY_ON_TESTING.md`
- Backend Service: `backend/src/try-on/try-on.service.ts`
- Python Endpoint: `python_engine/try_on_service/app/api/v1/endpoints/try_on.py`
- OpenAI Service: `python_engine/try_on_service/app/services/openai_service.py`
- Docker Compose: `python_engine/docker-compose.yml`
- Gateway Main: `python_engine/gateway/app/main.py`
