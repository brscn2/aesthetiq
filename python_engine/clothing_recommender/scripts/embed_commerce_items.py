"""Script to embed commerce clothing items using HuggingFace OpenCLIP API.

This script:
1. Connects to MongoDB 
2. Fetches all commerce items (products for sale) without embeddings
3. Uses HuggingFace Inference API to generate embeddings
4. Stores embeddings back to MongoDB for semantic search

Usage:
    python scripts/embed_commerce_items.py
"""
import os
import asyncio
from typing import List, Dict, Any
import aiohttp
from pymongo import MongoClient
from dotenv import load_dotenv
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Configuration
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017/")
DB_NAME = os.getenv("MONGODB_DB_NAME", "aesthetiq")
COLLECTION_NAME = "wardrobeitems"
EMBEDDING_SERVICE_URL = os.getenv("EMBEDDING_SERVICE_URL", "http://localhost:8004")

# Batch configuration
BATCH_SIZE = 10  # Process 10 items at a time
EMBEDDING_FIELD = "embedding"


class CommerceItemEmbedder:
    """Handles embedding of commerce clothing items (products for sale)."""
    
    def __init__(self, service_url: str, text_weight: float = 0.15, image_weight: float = 0.85):
        self.service_url = service_url
        self.text_weight = text_weight
        self.image_weight = image_weight
        logger.info(f"Hybrid embedding: text_weight={text_weight}, image_weight={image_weight}")
    
    async def get_text_embedding(self, session: aiohttp.ClientSession, text: str) -> List[float]:
        """Get embedding for text using local embedding service."""
        try:
            async with session.post(
                f"{self.service_url}/embed/text",
                json={"text": text}
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    return result["embedding"]
                else:
                    error = await response.text()
                    logger.error(f"Embedding service error: {error}")
                    return None
        except Exception as e:
            logger.error(f"Error getting text embedding: {e}")
            return None
    
    async def get_image_embedding(self, session: aiohttp.ClientSession, image_url: str) -> List[float]:
        """Get embedding for image using local embedding service."""
        try:
            # Download image
            async with session.get(image_url) as img_response:
                if img_response.status != 200:
                    logger.error(f"Failed to download image: {image_url}")
                    return None
                
                image_data = await img_response.read()
            
            # Send to embedding service
            form = aiohttp.FormData()
            form.add_field('file', image_data, filename='image.jpg', content_type='image/jpeg')
            
            async with session.post(
                f"{self.service_url}/embed/image",
                data=form
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    return result["embedding"]
                else:
                    error = await response.text()
                    logger.error(f"Image embedding service error: {error}")
                    return None
        except Exception as e:
            logger.error(f"Error getting image embedding from {image_url}: {e}")
            return None
    
    def combine_embeddings(self, text_emb: List[float], image_emb: List[float]) -> List[float]:
        """Combine text and image embeddings with weighted average."""
        if not text_emb and not image_emb:
            return None
        if not text_emb:
            return image_emb
        if not image_emb:
            return text_emb
        
        # Weighted average
        combined = [
            self.text_weight * t + self.image_weight * i 
            for t, i in zip(text_emb, image_emb)
        ]
        return combined
    
    def create_item_description(self, item: Dict[str, Any]) -> str:
        """Create a text description from commerce item for embedding."""
        parts = []
        
        # Category
        if "category" in item:
            parts.append(item["category"].lower())
        
        # SubCategory
        if "subCategory" in item:
            parts.append(item["subCategory"])
        
        # Brand
        if "brand" in item:
            parts.append(f"by {item['brand']}")
        
        # Color (convert hex to color name approximation)
        if "colorHex" in item:
            # For now, just use the hex. You could add color name mapping
            parts.append(f"color {item['colorHex']}")
        
        # User notes/description (if available)
        if "notes" in item and item["notes"]:
            parts.append(item["notes"])
        
        # Additional tags
        if "tags" in item and item["tags"]:
            parts.extend(item["tags"])
        
        description = " ".join(parts)
        return description if description else "clothing item"
    
    async def embed_items(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Embed a batch of items using hybrid text + image embeddings."""
        async with aiohttp.ClientSession() as session:
            results = []
            
            for item in items:
                # Get text description
                description = self.create_item_description(item)
                image_url = item.get("imageUrl")
                
                logger.info(f"Embedding item {item['_id']}: {description}")
                
                # Get both embeddings
                text_emb_task = self.get_text_embedding(session, description)
                
                # Get image embedding if URL exists
                if image_url:
                    image_emb_task = self.get_image_embedding(session, image_url)
                    text_emb, image_emb = await asyncio.gather(text_emb_task, image_emb_task)
                else:
                    logger.warning(f"Item {item['_id']} has no imageUrl, using text-only embedding")
                    text_emb = await text_emb_task
                    image_emb = None
                
                # Combine embeddings
                combined_emb = self.combine_embeddings(text_emb, image_emb)
                
                if combined_emb:
                    item[EMBEDDING_FIELD] = combined_emb
                    results.append(item)
                    logger.info(f"✓ Item {item['_id']}: text={'✓' if text_emb else '✗'}, image={'✓' if image_emb else '✗'}")
                else:
                    logger.warning(f"✗ Failed to embed item {item['_id']}")
            
            return results


async def main():
    """Main function to embed all commerce clothing items."""
    logger.info("Starting commerce items embedding process...")
    
    # Check embedding service
    logger.info(f"Embedding service URL: {EMBEDDING_SERVICE_URL}")
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{EMBEDDING_SERVICE_URL}/health") as response:
                if response.status == 200:
                    health = await response.json()
                    logger.info(f"✅ Embedding service is healthy")
                    logger.info(f"   Device: {health.get('device')}")
                    logger.info(f"   CUDA: {health.get('cuda_available')}")
                else:
                    logger.error(f"❌ Embedding service not healthy")
                    return
    except Exception as e:
        logger.error(f"❌ Cannot connect to embedding service: {e}")
        logger.error(f"   Make sure service is running: docker-compose up embedding_service")
        return
    
    # Connect to MongoDB
    client = MongoClient(MONGODB_URL)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]
    
    logger.info(f"Connected to MongoDB: {MONGODB_URL}")
    logger.info(f"Database: {DB_NAME}, Collection: {COLLECTION_NAME}")
    
    # Count total items
    total_items = collection.count_documents({})
    logger.info(f"Total items in collection: {total_items}")
    
    # Find items without embeddings
    items_without_embeddings = list(collection.find({EMBEDDING_FIELD: {"$exists": False}}))
    logger.info(f"Items without embeddings: {len(items_without_embeddings)}")
    
    if not items_without_embeddings:
        logger.info("All items already have embeddings. Nothing to do.")
        return
    
    # Initialize embedder
    embedder = CommerceItemEmbedder(EMBEDDING_SERVICE_URL)
    
    # Process in batches
    total_batches = (len(items_without_embeddings) + BATCH_SIZE - 1) // BATCH_SIZE
    total_embedded = 0
    
    for batch_num in range(total_batches):
        start_idx = batch_num * BATCH_SIZE
        end_idx = min(start_idx + BATCH_SIZE, len(items_without_embeddings))
        batch = items_without_embeddings[start_idx:end_idx]
        
        logger.info(f"Processing batch {batch_num + 1}/{total_batches} ({len(batch)} items)")
        
        # Embed batch
        embedded_items = await embedder.embed_items(batch)
        
        # Update MongoDB
        for item in embedded_items:
            collection.update_one(
                {"_id": item["_id"]},
                {"$set": {EMBEDDING_FIELD: item[EMBEDDING_FIELD]}}
            )
            total_embedded += 1
        
        logger.info(f"Batch {batch_num + 1} completed. Total embedded: {total_embedded}")
        
        # Small delay to avoid rate limits
        await asyncio.sleep(1)
    
    logger.info(f"✅ Embedding complete! Total items embedded: {total_embedded}")
    
    # Close connection
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
