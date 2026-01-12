# Clothing Recommender Agent Architecture

## Overview

The Clothing Recommender is a LangGraph-based agent that searches for clothing items based on user queries. It uses semantic search with MongoDB Atlas Vector Search and includes an intelligent verification loop to ensure high-quality results.

### Integration Points

The recommender can be accessed in two ways:

1. **Via Conversational Agent** (Primary): When the intent classifier in `LangGraphService` detects a "clothing" intent, it automatically routes to the recommender pipeline. The response includes `clothing_data` with `item_ids`.

2. **Direct API** (Alternative): `POST /api/v1/recommend` for direct access without intent classification.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              User Request                                   │
│  POST /api/v1/recommend                                                     │
│  {"message": "party outfit", "user_id": "user_xxx", "session_id": "..."}   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                          SSE: {"stage": "analyzing"}
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         QUERY ANALYZER NODE                                 │
│  ─────────────────────────────────────────────────────────────────────────  │
│  LLM extracts:                                                              │
│    • filters: {category: "TOP", subCategory: null, brand: null}             │
│    • semantic_query: "elegant party outfit, festive evening wear"           │
│    • needs_profile: true (user said "for me" or query is vague)             │
│                                                                             │
│  On retry (iteration > 0):                                                  │
│    • Input includes: refinement_suggestions from verifier                   │
│    • Adjusts filters (broaden/narrow) and semantic_query                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
          (if needs_profile)                        │
                    ▼                               │
┌──────────────────────────────┐                    │
│   TOOL 1: FETCH PROFILE      │                    │
│  (Optional)                  │                    │
│  ──────────────────────────  │                    │
│  MongoDB: styleprofiles      │                    │
│  Query: {userId: "user_xxx"} │                    │
│                              │                    │
│  Returns:                    │                    │
│  • archetype: "Minimalist"   │                    │
│  • sliders: {formal, color}  │                    │
│  • favoriteBrands: [...]     │                    │
│  • sizes: {top, bottom, shoe}│                    │
└──────────────────────────────┘                    │
                    │                               │
                    └───────────────┬───────────────┘
                                    │
                          SSE: {"stage": "searching", "iteration": 1}
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TOOL 2: CLOTHING SEARCH (Required)                       │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Step 1: Generate embedding                                                 │
│    POST http://embedding_service:8004/embed/text                            │
│    {"text": "elegant party outfit, festive evening wear"}                   │
│    → 512-dim vector                                                         │
│                                                                             │
│  Step 2: MongoDB Atlas Vector Search                                        │
│    db.wardrobe.aggregate([                                                  │
│      {$vectorSearch: {                                                      │
│        index: "vector",                                                     │
│        path: "embedding",                                                   │
│        queryVector: [...],                                                  │
│        numCandidates: 100,                                                  │
│        limit: SEARCH_LIMIT (20),                                            │
│        filter: {category: "TOP"}  // Pre-filter if extracted                │
│      }},                                                                    │
│      {$project: {embedding: 0}}   // Exclude large field                    │
│    ])                                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                          SSE: {"stage": "verifying", "found": 20}
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VERIFIER NODE                                       │
│  ─────────────────────────────────────────────────────────────────────────  │
│  LLM analyzes each result against:                                          │
│    • Original user query                                                    │
│    • User profile (if fetched)                                              │
│                                                                             │
│  Output:                                                                    │
│    • valid_item_ids: ["id1", "id2", "id3", ...]                             │
│    • is_sufficient: len(valid_ids) >= MIN_RESULTS (3)                       │
│    • refinement_suggestions: (if not sufficient)                            │
│      "The results were too formal. Try searching for 'casual party          │
│       outfits with bold colors'. Consider removing category filter."        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
        is_sufficient OR                  NOT sufficient AND
        iteration >= MAX_ITERATIONS       iteration < MAX_ITERATIONS
                    │                               │
                    │                     SSE: {"stage": "refining"}
                    │                               │
                    │                               ▼
                    │                     ┌─────────────────────┐
                    │                     │ Loop back to        │
                    │                     │ QUERY ANALYZER      │
                    │                     │ with suggestions    │
                    │                     └─────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RESPONSE NODE                                       │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Success:                                                                   │
│    SSE event: result                                                        │
│    {"item_ids": ["6938855c...", "6938855d...", ...]}                        │
│                                                                             │
│  Fallback (no results after 3 tries):                                       │
│    SSE event: result                                                        │
│    {"item_ids": [], "fallback": true,                                       │
│     "message": "No matching items found. Try a different search."}          │
│                                                                             │
│  SSE event: done                                                            │
│  {"success": true, "iterations": 2, "total_items": 5}                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Models

### User Style Profile (styleprofiles collection)

```json
{
  "_id": "ObjectId",
  "userId": "user_36On4ZlnKfasGRPkKfsqX7W8FDm",
  "archetype": "Minimalist",
  "sliders": {
    "formal": 74,
    "colorful": 66
  },
  "inspirationImageUrls": [],
  "negativeConstraints": [],
  "sizes": {
    "top": "L",
    "bottom": "42",
    "shoe": "40"
  },
  "favoriteBrands": ["Zara", "Nike", "COS"],
  "createdAt": "2025-12-04T22:59:33.083Z",
  "updatedAt": "2025-12-15T23:46:12.846Z"
}
```

### Wardrobe Item (wardrobe collection)

```json
{
  "_id": "ObjectId",
  "userId": "user_35zJbQtZCIj4IB0XSMs2vNh4lwR",
  "imageUrl": "https://...",
  "processedImageUrl": "https://...",
  "category": "TOP | BOTTOM | SHOE | ACCESSORY",
  "subCategory": "Jeans | T-Shirt | Sneakers | ...",
  "brand": "Zara",
  "colorHex": "#494947",
  "isFavorite": false,
  "embedding": [/* 512 floats */],
  "createdAt": "2025-12-09T20:23:56.599Z",
  "updatedAt": "2025-12-09T20:23:56.599Z"
}
```

## Category System

| Category   | SubCategories                                                    |
|------------|------------------------------------------------------------------|
| TOP        | T-Shirt, Shirt, Blouse, Sweater, Hoodie, Jacket, Coat, Blazer    |
| BOTTOM     | Jeans, Trousers, Shorts, Skirt, Dress, Leggings, Sweatpants      |
| SHOE       | Sneakers, Boots, Sandals, Heels, Flats, Loafers                  |
| ACCESSORY  | Hat, Bag, Belt, Jewelry, Scarf, Sunglasses, Watch                |

## Configuration

Environment variables and defaults (see `config.py`):

```python
# Recommender Settings
RECOMMENDER_SEARCH_LIMIT = 20          # Items per search
RECOMMENDER_MIN_RESULTS = 3            # Minimum valid results
RECOMMENDER_MAX_ITERATIONS = 3         # Max search attempts

# MongoDB Collections
MONGODB_WARDROBE_COLLECTION = "wardrobe"
MONGODB_STYLE_PROFILES_COLLECTION = "styleprofiles"

# Vector Search
MONGODB_VECTOR_INDEX_NAME = "vector"
MONGODB_EMBEDDING_FIELD = "embedding"
EMBEDDING_DIMENSION = 512

# Embedding Service
EMBEDDING_SERVICE_URL = "http://embedding_service:8004"
```

## LangGraph State

```python
class RecommenderState(TypedDict):
    # Input
    user_id: str
    user_query: str
    session_id: str
    
    # Query Analysis
    filters: dict                    # {category?, subCategory?, brand?}
    semantic_query: str              # Text for embedding
    needs_profile: bool
    
    # Profile (optional)
    user_profile: Optional[dict]
    
    # Search
    search_results: list[dict]       # Raw MongoDB results
    
    # Verification
    valid_item_ids: list[str]
    is_sufficient: bool
    refinement_suggestions: Optional[str]
    
    # Loop Control
    iteration: int                   # 0, 1, 2
    
    # Streaming
    current_stage: str
    
    # Error handling
    error: Optional[str]
```

## SSE Event Types

The streaming endpoint emits Server-Sent Events with these types:

| Event Type | Description | Example Data |
|------------|-------------|--------------|
| `stage` | Progress updates | `{"stage": "searching", "iteration": 1}` |
| `result` | Final item IDs | `{"item_ids": ["id1", "id2"]}` |
| `done` | Stream complete | `{"success": true, "iterations": 2}` |
| `error` | Error occurred | `{"error": "Search failed"}` |

### Event Flow Example

```
event: stage
data: {"stage": "analyzing", "iteration": 1}

event: stage
data: {"stage": "fetching_profile"}

event: stage
data: {"stage": "searching", "iteration": 1}

event: stage
data: {"stage": "verifying", "iteration": 1, "candidates": 20}

event: stage
data: {"stage": "refining", "iteration": 2}

event: stage
data: {"stage": "searching", "iteration": 2}

event: stage
data: {"stage": "verifying", "iteration": 2, "candidates": 18}

event: result
data: {"item_ids": ["6938855c485e1f7c84ad1145", "..."]}

event: done
data: {"success": true, "iterations": 2, "total_items": 5}
```

## File Structure

```
clothing_recommender/app/
├── agents/
│   └── recommender/
│       ├── __init__.py
│       ├── graph.py              # LangGraph workflow
│       ├── state.py              # RecommenderState
│       └── nodes/
│           ├── __init__.py
│           ├── query_analyzer.py
│           ├── profile_fetcher.py
│           ├── clothing_search.py
│           ├── verifier.py
│           └── response.py
├── services/
│   ├── embedding_client.py       # HTTP client for embedding_service
│   └── mongodb/
│       ├── __init__.py
│       ├── wardrobe_repo.py
│       └── profile_repo.py
├── core/
│   └── config.py                 # + RecommenderSettings
└── prompts/templates/
    ├── recommender_query_analyzer.txt
    └── recommender_verifier.txt
```

## API Endpoints

### POST /api/v1/recommend

Non-streaming endpoint for clothing recommendations.

**Request:**
```json
{
  "message": "Find me party clothes",
  "user_id": "user_xxx",
  "session_id": "optional-session-id"
}
```

**Response:**
```json
{
  "item_ids": ["id1", "id2", "id3"],
  "session_id": "session_xxx",
  "iterations": 1,
  "metadata": {}
}
```

### POST /api/v1/recommend/stream

Streaming endpoint with SSE progress updates.

**Request:** Same as above

**Response:** Server-Sent Events stream

## Dependencies

- **LangGraph**: Workflow orchestration
- **LangChain**: LLM interactions
- **Motor**: Async MongoDB driver
- **httpx**: Async HTTP client for embedding service
- **Langfuse**: Observability (optional)

## Error Handling

1. **Embedding Service Unavailable**: Return error, suggest retry
2. **MongoDB Connection Failed**: Return error with details
3. **No Results After Max Iterations**: Return fallback response
4. **LLM Error**: Graceful degradation with simple keyword search

## Future Enhancements

- [ ] Cache user profiles with TTL
- [ ] Cache embeddings for common queries
- [ ] Add outfit compatibility scoring
- [ ] Support multi-item outfit recommendations
- [ ] Add price range filtering
- [ ] Support for seasonal recommendations
