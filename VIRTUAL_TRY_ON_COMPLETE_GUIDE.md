# Virtual Try-On Feature - Complete Testing Guide

## ✅ Status: FULLY OPERATIONAL

All components are implemented and working:

- ✅ Frontend UI (photo upload, item selection, try-on generation)
- ✅ Backend API (NestJS endpoints)
- ✅ Python Try-On Service (OpenAI integration)
- ✅ Gateway routing (proxy to try-on service)
- ✅ Docker services (all healthy)

## Architecture Overview

```
User Browser (localhost:3000)
    ↓
Next.js Frontend
    ↓ Upload Photo
NestJS Backend (localhost:3001)
    ↓ Store in Azure + MongoDB
Azure Blob Storage + MongoDB

---

User selects items + clicks "Generate Try-On"
    ↓
Next.js Frontend
    ↓ POST /try-on/generate
NestJS Backend (localhost:3001)
    ↓ Forward request
Python Gateway (localhost:8000)
    ↓ Route to /api/v1/try-on/*
Python Try-On Service (internal:8005)
    ↓ Download images + call OpenAI
OpenAI Image Edit API
    ↓ Return base64 image
Frontend displays result
```

## Prerequisites

### 1. Services Running

```bash
# Check all services are healthy
cd python_engine
docker compose ps

# Should show:
# ✅ aesthetiq-gateway          HEALTHY
# ✅ aesthetiq-try-on           HEALTHY
# ✅ aesthetiq-conversational   HEALTHY
# ✅ aesthetiq-face-analysis    HEALTHY
# ✅ aesthetiq-embedding        HEALTHY
# ✅ aesthetiq-mcp-servers      HEALTHY
```

### 2. OpenAI API Key

Verify your OpenAI API key is set:

```bash
cd python_engine
grep OPENAI_API_KEY .env

# Should show: OPENAI_API_KEY=sk-...
```

If missing, add it:

```bash
echo "OPENAI_API_KEY=your_key_here" >> .env
docker compose restart try_on_service
```

### 3. Backend Running

```bash
cd backend
npm run start:dev

# Should show: Nest application successfully started
```

### 4. Frontend Running

```bash
cd frontend
npm run dev

# Should show: Ready on http://localhost:3000
```

## Step-by-Step Testing Guide

### Step 1: Upload Your Photo

1. **Navigate to Settings**
   - Open browser: `http://localhost:3000/settings`
   - Click "Virtual Try-On" in left sidebar

2. **Upload a Full-Body Photo**
   - Click "Upload Photo" button
   - Select a photo that shows:
     - ✅ Full body (head to feet)
     - ✅ Clear view of torso and legs
     - ✅ Good lighting
     - ✅ Standing pose (front-facing works best)
   - Supported formats: JPG, PNG, WebP
   - Max size: 10MB

3. **Verify Upload**
   - Photo should appear in preview
   - Toast notification: "Photo uploaded successfully"
   - Photo is saved to your user profile

**Example Photo Requirements:**

```
Good Photos:
- Full-body portrait
- Clear background
- Person facing camera
- Arms at sides or slightly away from body
- Good lighting (not too dark/bright)

Avoid:
- Cropped photos (only upper body)
- Sitting or lying down
- Very busy backgrounds
- Extreme angles
- Poor lighting
```

### Step 2: Browse Clothing Items

1. **Navigate to Find Your Style**
   - Go to: `http://localhost:3000/find-your-style`
   - You'll see a grid of clothing items

2. **Understand Item Categories**
   - **TOP**: Shirts, blouses, sweaters, jackets
   - **BOTTOM**: Pants, skirts, shorts
   - **SHOE**: Shoes, boots, sneakers
   - **ACCESSORY**: Bags, jewelry, hats

### Step 3: Select Items for Try-On

1. **Click on Items to Select**
   - Click any item card to select it
   - Selected items show a blue border and checkmark
   - Click again to deselect

2. **Selection Rules**
   - You can select **1 item per category**
   - Selecting a new item in the same category replaces the previous one
   - You can select items from multiple categories

3. **Example Combinations**
   - **Minimal**: 1 top
   - **Simple**: 1 top + 1 bottom
   - **Complete**: 1 top + 1 bottom + 1 shoe
   - **Full outfit**: 1 top + 1 bottom + 1 shoe + 1 accessory

### Step 4: Generate Try-On Image

1. **Click "Generate Try-On" Button**
   - Located in top-right corner
   - Shows sparkles icon ✨
   - Displays count of selected items
   - Button is disabled if no items selected

2. **Wait for Generation**
   - Loading indicator appears
   - Generation takes **10-30 seconds**
   - Progress message: "Generating your try-on image..."

3. **View Result**
   - Modal opens with generated image
   - Shows your photo with selected clothing items
   - Displays thumbnails of selected items below

4. **Download or Close**
   - Click "Download" to save image
   - Click "Close" or X to return to selection
   - Your selection is preserved

### Step 5: Try Different Combinations

1. **Modify Selection**
   - Close the result modal
   - Change selected items
   - Click "Generate Try-On" again

2. **Compare Results**
   - Try different color combinations
   - Mix formal and casual items
   - Experiment with accessories

## Testing Scenarios

### Scenario 1: Single Item Try-On

**Goal**: Test with just one clothing item

1. Upload your photo (if not already done)
2. Navigate to Find Your Style
3. Select **only 1 top** (e.g., a blue shirt)
4. Click "Generate Try-On"
5. Wait for result

**Expected**: Image shows you wearing the selected top, everything else unchanged

### Scenario 2: Complete Outfit

**Goal**: Test with multiple items

1. Select 1 top (e.g., white blouse)
2. Select 1 bottom (e.g., black trousers)
3. Select 1 shoe (e.g., leather boots)
4. Click "Generate Try-On"

**Expected**: Image shows you wearing all three items as a coordinated outfit

### Scenario 3: Color Coordination

**Goal**: Test color matching

1. Select items with complementary colors:
   - Navy blue top
   - Beige trousers
   - Brown shoes
2. Generate try-on

**Expected**: Items should look naturally coordinated

### Scenario 4: Style Mixing

**Goal**: Test different style combinations

1. **Formal Look**:
   - Blazer (top)
   - Dress pants (bottom)
   - Dress shoes

2. **Casual Look**:
   - T-shirt (top)
   - Jeans (bottom)
   - Sneakers (shoe)

3. **Mixed Style**:
   - Formal blazer (top)
   - Casual jeans (bottom)
   - Sneakers (shoe)

## Troubleshooting

### Issue: "Please upload a photo first"

**Cause**: No photo uploaded to your profile

**Solution**:

1. Go to Settings → Virtual Try-On
2. Upload a full-body photo
3. Wait for upload confirmation
4. Return to Find Your Style

### Issue: Generate button is disabled

**Cause**: No items selected

**Solution**:

1. Click on at least one clothing item
2. Verify item has blue border (selected)
3. Button should become enabled

### Issue: Generation takes too long (>60 seconds)

**Cause**: OpenAI API slow or timeout

**Solution**:

1. Check your internet connection
2. Check OpenAI API status: https://status.openai.com
3. Try again with fewer items
4. Check backend logs: `cd backend && npm run start:dev`

### Issue: "Service unavailable" error

**Cause**: Try-on service not running

**Solution**:

```bash
cd python_engine
docker compose ps try_on_service

# If not running:
docker compose up -d try_on_service

# Check logs:
docker compose logs try_on_service
```

### Issue: "Invalid API key" error

**Cause**: OpenAI API key missing or invalid

**Solution**:

```bash
cd python_engine

# Check if key exists:
grep OPENAI_API_KEY .env

# If missing or wrong, update:
nano .env  # or your preferred editor
# Add: OPENAI_API_KEY=sk-your-actual-key

# Restart service:
docker compose restart try_on_service
```

### Issue: Generated image looks unrealistic

**Possible Causes**:

1. **Poor quality input photo**: Use a clearer, well-lit photo
2. **Complex background**: Try a photo with simpler background
3. **Unusual pose**: Use a standard standing pose
4. **Item images unclear**: Some clothing items may have low-quality images

**Solutions**:

1. Upload a better quality photo
2. Try different clothing items
3. Use items with clear, high-resolution images

### Issue: Upload fails

**Cause**: File too large or wrong format

**Solution**:

1. Check file size (must be < 10MB)
2. Check format (JPG, PNG, or WebP only)
3. Compress image if needed
4. Try a different photo

## API Testing (Advanced)

### Test Gateway Route

```bash
# Test health endpoint
curl http://localhost:8000/health

# Test try-on endpoint (should return validation error)
curl -X POST http://localhost:8000/api/v1/try-on/generate \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: {"detail":[{"type":"missing","loc":["body","userPhotoUrl"]...
```

### Test Try-On Service Directly

```bash
# From inside Docker network
docker compose exec gateway curl http://try_on_service:8005/health

# Expected: {"status":"healthy","service":"Aesthetiq Virtual Try-On"...
```

### Test Backend Endpoint

```bash
# Get auth token from browser (DevTools → Application → Cookies → __session)
TOKEN="your_clerk_token_here"

curl -X POST http://localhost:3001/try-on/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "items": {
      "TOP": {
        "id": "item_id",
        "name": "Blue Shirt",
        "imageUrl": "https://example.com/shirt.jpg",
        "category": "TOP"
      }
    }
  }'
```

## Monitoring and Logs

### View Try-On Service Logs

```bash
cd python_engine
docker compose logs -f try_on_service

# Look for:
# - "Downloading user photo from: ..."
# - "Downloading clothing image..."
# - "Calling OpenAI images.edit API..."
# - "Virtual try-on image generated successfully"
```

### View Backend Logs

```bash
cd backend
npm run start:dev

# Look for:
# - "Generating try-on for user photo: ..."
# - "Try-on generation successful"
```

### View Gateway Logs

```bash
cd python_engine
docker compose logs -f gateway

# Look for:
# - "POST /api/v1/try-on/generate HTTP/1.1" 200
```

## Performance Expectations

- **Photo Upload**: 1-3 seconds (depends on file size)
- **Item Selection**: Instant
- **Try-On Generation**: 10-30 seconds
  - Single item: ~10-15 seconds
  - Multiple items: ~20-30 seconds
  - Depends on OpenAI API response time

## Example Test Data

### Good Test Photos

If you don't have a suitable photo, you can use these types:

1. **Professional portrait** (full body, business attire)
2. **Casual photo** (standing, simple background)
3. **Fashion photo** (model-style pose, clear lighting)

### Recommended Item Combinations

**Business Professional**:

- Navy blazer (TOP)
- Gray dress pants (BOTTOM)
- Black leather shoes (SHOE)

**Smart Casual**:

- White button-down shirt (TOP)
- Dark jeans (BOTTOM)
- Brown loafers (SHOE)

**Casual Weekend**:

- Graphic t-shirt (TOP)
- Khaki shorts (BOTTOM)
- White sneakers (SHOE)

**Evening Outfit**:

- Black silk blouse (TOP)
- Leather skirt (BOTTOM)
- Heeled boots (SHOE)

## Success Criteria

✅ **Feature is working correctly if**:

1. Photo uploads successfully to Settings
2. Photo appears in preview
3. Items can be selected/deselected
4. Generate button enables when items selected
5. Generation completes in <60 seconds
6. Result modal shows generated image
7. Image looks realistic and natural
8. Selected items are visible on your body
9. Download button works
10. Can generate multiple times with different selections

## Next Steps After Testing

Once you've verified the feature works:

1. **Gather Feedback**
   - Test with different body types
   - Test with various clothing styles
   - Note any quality issues

2. **Optimize**
   - Adjust prompt for better results
   - Fine-tune image quality settings
   - Add more clothing items to database

3. **Enhance**
   - Add photo cropping tool
   - Add multiple photo support
   - Add outfit saving feature
   - Add social sharing

4. **Monitor**
   - Track OpenAI API usage
   - Monitor generation success rate
   - Collect user feedback

## Support

If you encounter issues not covered here:

1. Check all services are running: `docker compose ps`
2. Check logs for errors
3. Verify OpenAI API key is valid
4. Ensure photo meets requirements
5. Try with different items

## Summary

The Virtual Try-On feature is **fully implemented and operational**. You can now:

- Upload your photo in Settings
- Select clothing items from Find Your Style
- Generate AI-powered try-on images
- Download and share results

The feature uses OpenAI's latest Image Edit API to create photorealistic visualizations of you wearing selected clothing items.

**Enjoy trying on different outfits! 👔👗👟**
