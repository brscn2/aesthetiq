#!/bin/bash
# Azure App Service startup script for Python FastAPI app
# Azure provides PORT environment variable
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
