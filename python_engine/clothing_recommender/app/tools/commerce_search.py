"""Commerce Clothing Search Tool for LangChain agents.

This tool allows agents to search through available clothing products (commerce items)
using semantic similarity. It uses local embedding service (CLIP) and MongoDB search.
"""
from typing import Optional, Dict, Any, List
from langchain.tools import BaseTool
from pydantic import BaseModel, Field
import aiohttp
import os
from pymongo import MongoClient

from app.core.logger import get_logger
from app.core.config import get_settings

logger = get_logger(__name__)
settings = get_settings()


class CommerceSearchInput(BaseModel):
    """Input schema for commerce clothing search tool."""
    query: str = Field(
        description="Natural language description of clothing item to search for. "
        "Examples: 'yellow jacket', 'blue jeans', 'red summer dress', 'casual sneakers'"
    )
    category: Optional[str] = Field(
        default=None,
        description="Optional category filter: TOP, BOTTOM, SHOE, ACCESSORY, OUTERWEAR, DRESS"
    )
    limit: int = Field(
        default=5,
        description="Maximum number of results to return (default: 5)"
    )


class CommerceClothingSearchTool(BaseTool):
    """
    Tool for semantic search in available clothing products (e-commerce items).
    
    Uses multimodal embeddings (CLIP) to find clothing items based on natural language queries.
    Agents can use this to help users discover products they might want to buy.
    """
    
    name: str = "commerce_clothing_search"
    description: str = """
    Search through available clothing products for purchase using natural language.
    Use this when the user asks about:
    - Finding specific clothing items to buy ("where can I find a yellow jacket?")
    - Shopping recommendations ("what jeans should I buy?")
    - Looking for items with specific characteristics ("casual summer tops for sale")
    - Product discovery ("show me red dresses")
    
    Input should be a natural language description of what to search for.
    Returns a list of matching products with details like category, brand, color, and image URLs.
    """
    args_schema: type[BaseModel] = CommerceSearchInput
    
    # Tool configuration
    # Use service name in Docker, localhost for local development
    embedding_service_url: str = Field(default_factory=lambda: os.getenv("EMBEDDING_SERVICE_URL", "http://embedding_service:8004"))
    mongodb_url: str = Field(default_factory=lambda: settings.MONGODB_URL or "mongodb://localhost:27017/")
    db_name: str = Field(default_factory=lambda: settings.MONGODB_DB_NAME or "test")
    collection_name: str = "wardrobeitems"
    vector_index_name: str = "vector"  # MongoDB Atlas vector search index name
    use_vector_search: bool = Field(default_factory=lambda: os.getenv("USE_VECTOR_SEARCH", "false").lower() == "true")
    
    def __init__(self, **data):
        super().__init__(**data)
        logger.info(f"Commerce search tool initialized with embedding service: {self.embedding_service_url}")
        if self.use_vector_search:
            logger.info("MongoDB Atlas Vector Search ENABLED - using $vectorSearch aggregation")
        else:
            logger.info("MongoDB Atlas Vector Search DISABLED - using client-side cosine similarity")
    
    async def _get_query_embedding(self, query: str) -> Optional[List[float]]:
        """Get embedding for search query using local embedding service."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.embedding_service_url}/embed/text",
                    json={"text": query}
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return result["embedding"]
                    else:
                        error = await response.text()
                        logger.error(f"Embedding service error: {error}")
                        return None
        except Exception as e:
            logger.error(f"Error getting query embedding: {e}")
            return None
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        import math
        
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = math.sqrt(sum(a * a for a in vec1))
        magnitude2 = math.sqrt(sum(b * b for b in vec2))
        
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
        
        return dot_product / (magnitude1 * magnitude2)
    
    async def _vector_search(
        self,
        collection,
        query_embedding: List[float],
        category: Optional[str],
        limit: int
    ) -> List[tuple]:
        """Use MongoDB Atlas Vector Search (requires Atlas cluster and search index)."""
        pipeline = [
            {
                "$vectorSearch": {
                    "index": self.vector_index_name,
                    "path": "embedding",
                    "queryVector": query_embedding,
                    "numCandidates": limit * 10,  # Search more candidates for better results
                    "limit": limit
                }
            },
            {
                "$project": {
                    "category": 1,
                    "subCategory": 1,
                    "brand": 1,
                    "colorHex": 1,
                    "imageUrl": 1,
                    "score": {"$meta": "vectorSearchScore"}
                }
            }
        ]
        
        # Add category filter if specified
        if category:
            pipeline.insert(1, {"$match": {"category": category.upper()}})
        
        try:
            results = list(collection.aggregate(pipeline))
            # Convert to (score, item) tuples
            return [(item.pop("score", 0.0), item) for item in results]
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            logger.warning("Falling back to client-side search")
            return await self._client_side_search(collection, query_embedding, category, limit)
    
    async def _client_side_search(
        self,
        collection,
        query_embedding: List[float],
        category: Optional[str],
        limit: int
    ) -> List[tuple]:
        """Client-side cosine similarity search (slower, works with local MongoDB)."""
        # Build filter
        filter_query = {"embedding": {"$exists": True}}
        if category:
            filter_query["category"] = category.upper()
        
        # Fetch items
        items = list(collection.find(filter_query))
        
        if not items:
            return []
        
        # Calculate similarities
        scored_items = []
        for item in items:
            similarity = self._cosine_similarity(query_embedding, item["embedding"])
            scored_items.append((similarity, item))
        
        # Sort and return top results
        scored_items.sort(key=lambda x: x[0], reverse=True)
        return scored_items[:limit]
    
    async def _arun(
        self,
        query: str,
        category: Optional[str] = None,
        limit: int = 5
    ) -> str:
        """Async implementation - execute the commerce clothing search."""
        logger.info(f"Commerce clothing search query: '{query}', category: {category}, limit: {limit}")
        
        # 1. Get query embedding
        query_embedding = await self._get_query_embedding(query)
        if not query_embedding:
            return f"Error: Failed to generate embedding for query '{query}'. Is embedding service running?"
        
        # 2. Connect to MongoDB
        try:
            client = MongoClient(self.mongodb_url)
            db = client[self.db_name]
            collection = db[self.collection_name]
            
            # 3. Use Vector Search or Client-side similarity
            if self.use_vector_search:
                # MongoDB Atlas Vector Search (FAST - recommended for production)
                top_items = await self._vector_search(
                    collection, 
                    query_embedding, 
                    category, 
                    limit
                )
            else:
                # Client-side cosine similarity (SLOW - for local development)
                top_items = await self._client_side_search(
                    collection,
                    query_embedding,
                    category,
                    limit
                )
            
            if not top_items:
                client.close()
                category_msg = f" in category {category}" if category else ""
                return f"No products found{category_msg}. The database might be empty or items haven't been embedded yet."
            
            # 7. Format results
            if not top_items or top_items[0][0] < 0.1:  # Very low similarity threshold
                client.close()
                return f"No relevant items found for '{query}'. Try a different search term."
            
            results = []
            for score, item in top_items:
                result = {
                    "category": item.get("category", "Unknown"),
                    "subCategory": item.get("subCategory"),
                    "brand": item.get("brand"),
                    "color": item.get("colorHex"),
                    "imageUrl": item.get("imageUrl"),
                    "similarity": f"{score:.2f}"
                }
                # Filter out None values
                result = {k: v for k, v in result.items() if v is not None}
                results.append(result)
            
            client.close()
            
            # Format as readable text for the agent
            response = f"Found {len(results)} item(s) matching '{query}':\n\n"
            for i, item in enumerate(results, 1):
                response += f"{i}. {item.get('category', 'Item')}"
                if item.get('subCategory'):
                    response += f" - {item['subCategory']}"
                if item.get('brand'):
                    response += f" by {item['brand']}"
                if item.get('color'):
                    response += f" (color: {item['color']})"
                response += f" [similarity: {item['similarity']}]\n"
                if item.get('imageUrl'):
                    response += f"   Image: {item['imageUrl']}\n"
            
            return response
            
        except Exception as e:
            logger.error(f"Error during commerce search: {e}")
            return f"Error searching commerce items: {str(e)}"
    
    def _run(self, *args, **kwargs):
        """Synchronous version - not implemented for async tool."""
        raise NotImplementedError("Use async version (_arun) instead")


# Convenience function to create the tool
def create_commerce_search_tool() -> CommerceClothingSearchTool:
    """Create and return a commerce clothing search tool instance."""
    return CommerceClothingSearchTool()
