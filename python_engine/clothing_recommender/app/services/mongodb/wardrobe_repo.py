"""Wardrobe repository for clothing item queries.

This repository handles all wardrobe collection operations including
vector search for semantic clothing recommendations.
"""
from typing import Optional
from bson import ObjectId

from app.core.config import get_settings
from app.core.logger import get_logger
from app.services.mongodb.connection import get_collection
from app.agents.recommender.state import WardrobeItem, ExtractedFilters

logger = get_logger(__name__)
settings = get_settings()


class WardrobeRepository:
    """Repository for wardrobe collection operations."""
    
    def __init__(self):
        """Initialize wardrobe repository."""
        self.collection_name = settings.MONGODB_WARDROBE_COLLECTION
        self.vector_index = settings.MONGODB_VECTOR_INDEX_NAME
        self.embedding_field = settings.MONGODB_EMBEDDING_FIELD
    
    @property
    def collection(self):
        """Get wardrobe collection (lazy loading)."""
        return get_collection(self.collection_name)
    
    async def vector_search(
        self,
        query_embedding: list[float],
        filters: Optional[ExtractedFilters] = None,
        limit: Optional[int] = None,
        num_candidates: Optional[int] = None,
    ) -> list[WardrobeItem]:
        """
        Perform vector similarity search on wardrobe items.
        
        Uses MongoDB Atlas Vector Search with optional pre-filtering.
        
        Args:
            query_embedding: 512-dimensional embedding vector
            filters: Optional filters (category, subCategory, brand)
            limit: Max results to return (default: RECOMMENDER_SEARCH_LIMIT)
            num_candidates: Vector search candidates (default: RECOMMENDER_NUM_CANDIDATES)
            
        Returns:
            List of WardrobeItem dicts with similarity scores
        """
        limit = limit or settings.RECOMMENDER_SEARCH_LIMIT
        num_candidates = num_candidates or settings.RECOMMENDER_NUM_CANDIDATES
        
        # Build filter clause for vector search
        filter_clause = self._build_filter_clause(filters)
        
        # Build aggregation pipeline
        pipeline = [
            {
                "$vectorSearch": {
                    "index": self.vector_index,
                    "path": self.embedding_field,
                    "queryVector": query_embedding,
                    "numCandidates": num_candidates,
                    "limit": limit,
                }
            },
            # Add similarity score
            {
                "$addFields": {
                    "score": {"$meta": "vectorSearchScore"}
                }
            },
            # Exclude embedding field (large, not needed in results)
            {
                "$project": {
                    self.embedding_field: 0
                }
            }
        ]
        
        # Add filter to vector search if filters provided
        if filter_clause:
            pipeline[0]["$vectorSearch"]["filter"] = filter_clause
            logger.info(f"Vector search with filter: {filter_clause}")
        
        logger.info(f"Executing vector search with limit={limit}, candidates={num_candidates}")
        
        try:
            cursor = self.collection.aggregate(pipeline)
            results = await cursor.to_list(length=limit)
            
            # Convert ObjectId to string
            items = []
            for doc in results:
                doc["_id"] = str(doc["_id"])
                items.append(doc)
            
            logger.info(f"Vector search returned {len(items)} items")
            return items
            
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            raise
    
    def _build_filter_clause(self, filters: Optional[ExtractedFilters]) -> Optional[dict]:
        """
        Build MongoDB filter clause from extracted filters.
        
        Args:
            filters: Extracted filters dict
            
        Returns:
            MongoDB filter dict or None if no filters
        """
        if not filters:
            return None
        
        clauses = []
        
        if filters.get("category"):
            clauses.append({"category": filters["category"]})
        
        if filters.get("subCategory"):
            clauses.append({"subCategory": filters["subCategory"]})
        
        if filters.get("brand"):
            # Case-insensitive brand match
            clauses.append({"brand": {"$regex": f"^{filters['brand']}$", "$options": "i"}})
        
        if not clauses:
            return None
        
        if len(clauses) == 1:
            return clauses[0]
        
        return {"$and": clauses}
    
    async def get_by_ids(self, item_ids: list[str]) -> list[WardrobeItem]:
        """
        Get wardrobe items by their IDs.
        
        Args:
            item_ids: List of item ID strings
            
        Returns:
            List of WardrobeItem dicts
        """
        if not item_ids:
            return []
        
        try:
            object_ids = [ObjectId(id_str) for id_str in item_ids]
        except Exception as e:
            logger.error(f"Invalid ObjectId in item_ids: {e}")
            return []
        
        cursor = self.collection.find(
            {"_id": {"$in": object_ids}},
            {self.embedding_field: 0}  # Exclude embedding
        )
        
        results = await cursor.to_list(length=len(item_ids))
        
        # Convert ObjectId to string
        items = []
        for doc in results:
            doc["_id"] = str(doc["_id"])
            items.append(doc)
        
        return items
    
    async def count_items(self, filters: Optional[ExtractedFilters] = None) -> int:
        """
        Count wardrobe items matching filters.
        
        Args:
            filters: Optional filters
            
        Returns:
            Count of matching items
        """
        filter_clause = self._build_filter_clause(filters) or {}
        return await self.collection.count_documents(filter_clause)
