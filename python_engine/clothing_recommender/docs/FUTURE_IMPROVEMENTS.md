# Future Improvements for Clothing Recommender

This document outlines potential enhancements for the clothing recommender agent.

---

## 1. Embedding Caching

**Problem:** Each search generates a new embedding, even for repeated queries.

**Solution:** Implement Redis caching for embeddings.

```python
# app/services/embedding_cache.py
import hashlib
import redis.asyncio as redis
import json

class EmbeddingCache:
    def __init__(self, redis_url: str, ttl: int = 3600):
        self.redis = redis.from_url(redis_url)
        self.ttl = ttl
    
    def _cache_key(self, text: str) -> str:
        return f"embed:{hashlib.sha256(text.encode()).hexdigest()[:16]}"
    
    async def get(self, text: str) -> list[float] | None:
        key = self._cache_key(text)
        data = await self.redis.get(key)
        return json.loads(data) if data else None
    
    async def set(self, text: str, embedding: list[float]):
        key = self._cache_key(text)
        await self.redis.setex(key, self.ttl, json.dumps(embedding))
```

**Integration:**
```python
# In embedding_client.py
async def embed_text(self, text: str) -> list[float]:
    # Check cache first
    cached = await self.cache.get(text)
    if cached:
        return cached
    
    # Generate and cache
    embedding = await self._call_embedding_service(text)
    await self.cache.set(text, embedding)
    return embedding
```

**Config:**
```env
REDIS_URL=redis://localhost:6379
EMBEDDING_CACHE_TTL=3600
```

---

## 2. Outfit Combinations

**Problem:** Currently returns individual items. Users often want complete outfits.

**Solution:** Add multi-item recommendation logic.

### Option A: Rule-Based Combinations
```python
# app/agents/recommender/nodes/outfit_builder.py

OUTFIT_RULES = {
    "casual": {
        "required": ["TOP", "BOTTOM"],
        "optional": ["SHOE", "ACCESSORY"],
    },
    "formal": {
        "required": ["TOP", "BOTTOM", "SHOE"],
        "optional": ["ACCESSORY"],
    },
}

async def build_outfit(
    items: list[WardrobeItem],
    occasion: str,
    user_profile: dict | None
) -> list[list[str]]:
    """
    Build outfit combinations from search results.
    
    Returns list of outfit combinations (each is a list of item IDs).
    """
    categorized = categorize_items(items)
    rules = OUTFIT_RULES.get(occasion, OUTFIT_RULES["casual"])
    
    outfits = []
    for top in categorized.get("TOP", [])[:3]:
        for bottom in categorized.get("BOTTOM", [])[:3]:
            outfit = [top["_id"], bottom["_id"]]
            
            # Add optional items
            if shoes := categorized.get("SHOE"):
                outfit.append(shoes[0]["_id"])
            
            outfits.append(outfit)
    
    return outfits[:5]  # Return top 5 combinations
```

### Option B: LLM-Based Styling
```python
# Use LLM to pick complementary items
async def llm_build_outfit(items: list, query: str, llm_service) -> list[str]:
    prompt = f"""
    User wants: {query}
    
    Available items:
    {format_items(items)}
    
    Select items that work well together as a complete outfit.
    Return JSON: {{"outfit_ids": ["id1", "id2", ...]}}
    """
    response = await llm_service.generate_response(prompt)
    return parse_outfit_ids(response)
```

---

## 3. Conversation Memory

**Problem:** Each request is stateless. Can't reference previous recommendations.

**Solution:** Add session-based memory.

### Schema
```python
# app/agents/recommender/memory.py
from typing import TypedDict
from datetime import datetime

class RecommendationMemory(TypedDict):
    session_id: str
    user_id: str
    history: list[dict]  # Previous queries and results
    created_at: datetime
    updated_at: datetime

# Example history entry
{
    "query": "blue shirt for party",
    "item_ids": ["id1", "id2", "id3"],
    "timestamp": "2026-01-10T12:00:00Z",
    "filters": {"category": "TOP"},
}
```

### Storage Options
1. **Redis** (fast, ephemeral): Good for short sessions
2. **MongoDB** (persistent): Good for long-term history
3. **In-memory** (simplest): Per-process, loses on restart

### Features Enabled
```python
# "Show me more like item #2"
async def find_similar(item_id: str, memory: RecommendationMemory):
    # Get previous recommendation
    prev_item = find_item_in_history(memory, item_id)
    if not prev_item:
        return "I don't have that item in our recent conversation."
    
    # Search for similar items
    embedding = await get_item_embedding(item_id)
    return await vector_search(embedding, exclude=[item_id])

# "Something different from last time"
async def exclude_previous(query: str, memory: RecommendationMemory):
    previous_ids = get_all_previous_ids(memory)
    results = await search(query)
    return [r for r in results if r["_id"] not in previous_ids]
```

---

## 4. Price/Availability Filters

**Problem:** Can't filter by price range or stock status.

**Solution:** Extend filter extraction and vector search.

### Document Schema Update
```json
{
  "_id": "...",
  "category": "TOP",
  "price": 49.99,
  "currency": "USD",
  "inStock": true,
  "stockCount": 15,
  "sizes": ["S", "M", "L"],
  "embedding": [...]
}
```

### MongoDB Index Update
```json
{
  "fields": [
    {"path": "embedding", "type": "vector", ...},
    {"path": "category", "type": "filter"},
    {"path": "price", "type": "filter"},
    {"path": "inStock", "type": "filter"}
  ]
}
```

### Query Analyzer Update
```python
# In query_analyzer prompt
{
    "filters": {
        "category": "TOP",
        "priceMin": 20,
        "priceMax": 100,
        "inStock": true
    },
    "semantic_query": "..."
}
```

### Vector Search Update
```python
# In wardrobe_repo.py
def _build_filter_clause(filters: ExtractedFilters) -> dict:
    clauses = []
    
    if filters.get("priceMin") or filters.get("priceMax"):
        price_clause = {"price": {}}
        if filters.get("priceMin"):
            price_clause["price"]["$gte"] = filters["priceMin"]
        if filters.get("priceMax"):
            price_clause["price"]["$lte"] = filters["priceMax"]
        clauses.append(price_clause)
    
    if filters.get("inStock") is not None:
        clauses.append({"inStock": {"$eq": filters["inStock"]}})
    
    # ... existing category filters
    return {"$and": clauses} if clauses else {}
```

---

## 5. Telemetry & Analytics

**Problem:** No visibility into search performance and user behavior.

**Solution:** Add structured logging and metrics.

### Metrics to Track
```python
# app/services/telemetry.py
from dataclasses import dataclass
from datetime import datetime

@dataclass
class SearchMetrics:
    session_id: str
    user_id: str
    query: str
    timestamp: datetime
    
    # Performance
    total_duration_ms: float
    embedding_duration_ms: float
    search_duration_ms: float
    verification_duration_ms: float
    
    # Quality
    iterations: int
    initial_results: int
    valid_results: int
    filters_used: dict
    profile_available: bool
    profile_used: bool
    
    # Outcome
    success: bool
    fallback: bool
    error: str | None
```

### Integration Points
```python
# In graph.py recommend()
metrics = SearchMetrics(
    session_id=session_id,
    user_id=user_id,
    query=user_query,
    timestamp=datetime.utcnow(),
)

start = time.perf_counter()
# ... run workflow
metrics.total_duration_ms = (time.perf_counter() - start) * 1000

await telemetry.record(metrics)
```

### Dashboard Queries
```python
# Most common retry triggers
db.metrics.aggregate([
    {"$match": {"iterations": {"$gt": 1}}},
    {"$group": {"_id": "$filters_used.category", "count": {"$sum": 1}}},
    {"$sort": {"count": -1}}
])

# Profile hit rate
db.metrics.aggregate([
    {"$group": {
        "_id": null,
        "total": {"$sum": 1},
        "with_profile": {"$sum": {"$cond": ["$profile_available", 1, 0]}},
        "profile_used": {"$sum": {"$cond": ["$profile_used", 1, 0]}}
    }}
])
```

---

## 6. Re-ranking with Cross-Encoder

**Problem:** Vector search returns semantically similar items, but relevance to specific query may vary.

**Solution:** Add cross-encoder re-ranking after initial retrieval.

### Two-Stage Pipeline
```
Query → Vector Search (fast, recall) → Top 50 items
                                           ↓
                              Cross-Encoder (slow, precision) → Top 10 items
```

### Implementation
```python
# app/services/reranker.py
from sentence_transformers import CrossEncoder

class Reranker:
    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        self.model = CrossEncoder(model_name)
    
    def rerank(
        self,
        query: str,
        items: list[dict],
        top_k: int = 10
    ) -> list[dict]:
        """Re-rank items by relevance to query."""
        # Create query-item pairs
        pairs = [
            (query, self._item_to_text(item))
            for item in items
        ]
        
        # Score pairs
        scores = self.model.predict(pairs)
        
        # Sort by score
        scored_items = list(zip(items, scores))
        scored_items.sort(key=lambda x: x[1], reverse=True)
        
        return [item for item, score in scored_items[:top_k]]
    
    def _item_to_text(self, item: dict) -> str:
        parts = []
        if cat := item.get("category"):
            parts.append(cat)
        if sub := item.get("subCategory"):
            parts.append(sub)
        if brand := item.get("brand"):
            parts.append(brand)
        if desc := item.get("description"):
            parts.append(desc)
        return " ".join(parts)
```

### Integration
```python
# In clothing_search_node
results = await wardrobe_repo.vector_search(...)

# Re-rank if we have enough results
if len(results) > 10:
    results = reranker.rerank(semantic_query, results, top_k=10)
```

**Trade-offs:**
- ✅ Better precision
- ❌ Slower (~100-200ms extra)
- ❌ Requires additional model

---

## Priority Recommendations

| Feature | Effort | Impact | Priority |
|---------|--------|--------|----------|
| Embedding Caching | Low | Medium | High |
| Telemetry | Medium | High | High |
| Conversation Memory | Medium | High | Medium |
| Price Filters | Low | Medium | Medium |
| Outfit Combinations | High | High | Medium |
| Re-ranking | Medium | Medium | Low |

Start with **Embedding Caching** and **Telemetry** for quick wins with good ROI.
