"""Embedding Service - FastAPI application for CLIP-based embeddings.

This service provides multimodal embeddings using sentence-transformers CLIP.
Supports both text and image inputs, outputting 512-dimensional vectors.
"""
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import torch
from sentence_transformers import SentenceTransformer
from PIL import Image
import io
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Embedding Service",
    description="Multimodal CLIP embeddings for text and images",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model instance (loaded on startup)
model: SentenceTransformer = None
device: str = None


class TextEmbedRequest(BaseModel):
    """Request model for text embedding."""
    text: str
    
class TextEmbedResponse(BaseModel):
    """Response model for text embedding."""
    embedding: List[float]
    dimension: int
    model: str

class ImageEmbedResponse(BaseModel):
    """Response model for image embedding."""
    embedding: List[float]
    dimension: int
    model: str


@app.on_event("startup")
async def startup_event():
    """Load model on startup."""
    global model, device
    
    logger.info("Loading CLIP model...")
    
    # Check CUDA availability
    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Using device: {device}")
    
    if device == "cuda":
        logger.info(f"CUDA version: {torch.version.cuda}")
        logger.info(f"GPU: {torch.cuda.get_device_name(0)}")
    
    # Load model
    model = SentenceTransformer('sentence-transformers/clip-ViT-B-32')
    model = model.to(device)
    
    logger.info("✅ CLIP model loaded successfully")
    logger.info(f"Model dimension: {model.get_sentence_embedding_dimension()}")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "device": device,
        "cuda_available": torch.cuda.is_available()
    }


@app.post("/embed/text", response_model=TextEmbedResponse)
async def embed_text(request: TextEmbedRequest):
    """
    Generate embedding for text input.
    
    Args:
        text: Input text string
        
    Returns:
        512-dimensional embedding vector
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        logger.info(f"Embedding text: {request.text[:50]}...")
        
        # Generate embedding
        embedding = model.encode(request.text, convert_to_tensor=True)
        embedding = embedding.cpu().tolist()
        
        return TextEmbedResponse(
            embedding=embedding,
            dimension=len(embedding),
            model="sentence-transformers/clip-ViT-B-32"
        )
    
    except Exception as e:
        logger.error(f"Error embedding text: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/embed/image", response_model=ImageEmbedResponse)
async def embed_image(file: UploadFile = File(...)):
    """
    Generate embedding for image input.
    
    Args:
        file: Image file (JPEG, PNG, etc.)
        
    Returns:
        512-dimensional embedding vector
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        logger.info(f"Embedding image: {file.filename}")
        
        # Read and process image
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Generate embedding
        embedding = model.encode(image, convert_to_tensor=True)
        embedding = embedding.cpu().tolist()
        
        return ImageEmbedResponse(
            embedding=embedding,
            dimension=len(embedding),
            model="sentence-transformers/clip-ViT-B-32"
        )
    
    except Exception as e:
        logger.error(f"Error embedding image: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    """Root endpoint with service info."""
    return {
        "service": "Embedding Service",
        "version": "1.0.0",
        "model": "sentence-transformers/clip-ViT-B-32",
        "endpoints": {
            "text": "/embed/text",
            "image": "/embed/image",
            "health": "/health",
            "docs": "/docs"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
