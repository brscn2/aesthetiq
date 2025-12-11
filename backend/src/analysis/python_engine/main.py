import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from face_analysis_service import FaceAnalysisService
import shutil
import os
import tempfile

app = FastAPI()

# Initialize Service (Loads models once on startup)
# Ensure paths are relative to where this script is run
try:
    analyzer = FaceAnalysisService(
        segmentation_weights="backend/src/analysis/python_engine/weights/resnet18.pt",
        model_path="backend/src/analysis/python_engine/weights/season_resnet18.pth",
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
    # Run on localhost:8000
    uvicorn.run(app, host="127.0.0.1", port=8000)