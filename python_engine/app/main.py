import uvicorn
import sys
import os

# Add the parent directory (python_engine) to sys.path so we can import 'core' and 'app'
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from app.service import FaceAnalysisService
import shutil
import tempfile

app = FastAPI()

# Initialize Service (Loads models once on startup)
# Ensure paths are relative to where this script is run
try:
    # Update paths to point to the correct locations from the root or relative to the script
    # Assuming running from repo root: backend/src/analysis/python_engine/weights/...
    base_path = "."
    analyzer = FaceAnalysisService(
        segmentation_weights=f"{base_path}/weights/resnet18.pt",
        model_path=f"{base_path}/weights/season_resnet18.pth",
        device="cuda" # Will fallback to CPU if needed
    )
except Exception as e:
    print(f"Failed to load models: {e}")
    # We don't exit, but endpoints might fail
    analyzer = None

@app.get("/health")
def health_check():
    if analyzer:
        return {"status": "ready"}
    return {"status": "loading_failed"}

@app.post("/analyze")
async def analyze_face(file: UploadFile = File(...)):
    if not analyzer:
        raise HTTPException(status_code=500, detail="Model not initialized")
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        # Run analysis
        result = analyzer.process_image(tmp_path)
        
        # Cleanup
        os.remove(tmp_path)
        
        if "error" in result:
             raise HTTPException(status_code=400, detail=result["error"])
             
        return JSONResponse(content=result)
        
    except Exception as e:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Azure App Service provides PORT environment variable
    # Default to 8000 for local development
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)