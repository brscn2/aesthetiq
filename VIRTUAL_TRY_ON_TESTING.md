# Virtual Try-On Feature - Testing Guide

## Overview

The Virtual Try-On feature is now fully implemented with a complete photo upload UI in the Settings page.

## What Was Implemented

### 1. Frontend API Client (`frontend/lib/api.ts`)

- Added `updateTryOnPhoto()` method to user API
- Allows updating the user's try-on photo URL

### 2. Virtual Try-On Settings Panel (`frontend/components/settings/virtual-try-on-panel.tsx`)

- New dedicated settings panel for managing try-on photos
- Features:
  - Photo upload with drag-and-drop support
  - Photo preview (full-body portrait orientation)
  - Remove photo functionality
  - Photo guidelines and best practices
  - "How It Works" section explaining the feature
  - File validation (JPG, PNG, WebP, max 10MB)
  - Loading states and error handling

### 3. Settings Navigation (`frontend/components/settings/settings-nav.tsx`)

- Added "Virtual Try-On" section with Camera icon
- Positioned between "Account" and "Biometric Privacy"

### 4. Settings Page (`frontend/app/settings/page.tsx`)

- Integrated VirtualTryOnPanel component
- Routed to "Virtual Try-On" section

## How to Test

### Step 1: Start the Python Try-On Service

```bash
# Navigate to python_engine directory
cd python_engine

# Start the try-on service with docker compose
docker compose up --build try_on_service
```

The service will be available at `http://localhost:8005` (internal only, accessed via backend).

### Step 2: Verify Backend is Running

Make sure your NestJS backend is running:

```bash
cd backend
npm run start:dev
```

Backend should be at `http://localhost:3001`

### Step 3: Verify Frontend is Running

Make sure your Next.js frontend is running:

```bash
cd frontend
npm run dev
```

Frontend should be at `http://localhost:3000`

### Step 4: Upload Try-On Photo

1. Navigate to Settings page: `http://localhost:3000/settings`
2. Click on "Virtual Try-On" in the left navigation
3. Click "Upload Photo" button
4. Select a full-body photo (JPG, PNG, or WebP)
5. Wait for upload to complete
6. Verify photo appears in the preview

### Step 5: Test Virtual Try-On

1. Navigate to "Find Your Style" page: `http://localhost:3000/find-your-style`
2. Select one or more clothing items by clicking on them
3. Click the "Generate Try-On" button (with sparkles icon)
4. Wait for the AI to generate the image (may take 10-30 seconds)
5. View the result in the modal
6. Download the generated image if desired

## Expected Behavior

### Photo Upload

- ✅ Photo uploads to Azure Blob Storage
- ✅ URL is saved to user's `tryOnPhotoUrl` field in MongoDB
- ✅ Photo preview updates immediately
- ✅ Toast notification confirms success

### Virtual Try-On Generation

- ✅ If no photo exists, shows error: "Please upload a photo of yourself first..."
- ✅ If photo exists, generates try-on image using OpenAI
- ✅ Shows loading state during generation
- ✅ Displays result in modal with selected items
- ✅ Allows downloading the generated image

## Troubleshooting

### Docker Compose Not Found

If you get "docker-compose not found", use `docker compose` (without hyphen) instead:

```bash
docker compose up --build try_on_service
```

### No Configuration File Error

Make sure you're running the command from the `python_engine/` directory:

```bash
cd python_engine
docker compose up --build try_on_service
```

### OpenAI API Key Missing

Ensure your `.env` file in `python_engine/` has:

```
OPENAI_API_KEY=your_key_here
```

### Upload Fails

- Check file size (must be < 10MB)
- Check file format (JPG, PNG, WebP only)
- Verify Azure Blob Storage credentials in backend `.env`

### Try-On Generation Fails

- Verify Python service is running: `docker compose ps`
- Check Python service logs: `docker compose logs try_on_service`
- Verify backend can reach Python service at `http://try_on_service:8005`
- Check OpenAI API key is valid and has credits

## Architecture

```
User Browser
    ↓
Next.js Frontend (localhost:3000)
    ↓ (uploads photo)
NestJS Backend (localhost:3001)
    ↓ (stores in Azure + MongoDB)
Azure Blob Storage
    ↓ (photo URL)
MongoDB (tryOnPhotoUrl field)

---

User selects items + clicks Generate
    ↓
Next.js Frontend
    ↓ (POST /try-on/generate)
NestJS Backend
    ↓ (forwards to Python service)
Python Try-On Service (localhost:8005)
    ↓ (downloads images)
OpenAI Image Edit API
    ↓ (returns base64 image)
Python Service
    ↓ (returns to backend)
NestJS Backend
    ↓ (returns to frontend)
Next.js Frontend (displays in modal)
```

## Files Modified/Created

### Created

- `frontend/components/settings/virtual-try-on-panel.tsx` - New settings panel
- `VIRTUAL_TRY_ON_TESTING.md` - This file

### Modified

- `frontend/lib/api.ts` - Added `updateTryOnPhoto()` method
- `frontend/components/settings/settings-nav.tsx` - Added Virtual Try-On nav item
- `frontend/app/settings/page.tsx` - Integrated VirtualTryOnPanel

## Next Steps

After testing, you can:

1. Customize the photo guidelines based on actual results
2. Add image cropping/editing before upload
3. Add multiple photo support (different poses)
4. Add photo quality validation (resolution, lighting, etc.)
5. Add example photos to guide users

## Notes

- The `__init__.py` files in Python are required for Python to recognize directories as packages
- They allow imports like `from app.core.config import get_settings`
- Without them, Python would not be able to import modules from those directories
- This is standard Python package structure, not specific to this project
