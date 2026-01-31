# Multi-Agent Conversational System Architecture

## Overview

This document describes the new multi-agent conversational system that replaces the `clothing_recommender` service. The system uses **LangGraph** for orchestration with shared state management for inter-agent communication, **MCP (Model Context Protocol) servers** for tool calls, **input/output guardrails** for safety, and **Langfuse** for comprehensive LLM call tracing.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL LAYER                                     │
│                                                                               │
│  ┌──────────────┐                                                          │
│  │   Frontend   │                                                          │
│  │   (Next.js)  │                                                          │
│  │              │                                                          │
│  └──────┬───────┘                                                          │
│         │ NEXT_PUBLIC_API_URL                                               │
│         ▼                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │   NestJS Backend (Port 3001)                                         │  │
│  │   - /api/agent/chat, /api/agent/chat/stream                          │  │
│  │   - Clerk Authentication (JWT validation)                            │  │
│  │   - Injects user_id from auth token                                  │  │
│  │   - SSE Stream Proxy to Python Gateway                               │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                              │                               │
└──────────────────────────────────────────────┼───────────────────────────────┘
                                                │ PYTHON_GATEWAY_URL
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GATEWAY LAYER (Port 8000)                          │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  FastAPI Gateway                                                    │   │
│  │  - Routes: /api/v1/agent/chat, /api/v1/agent/chat/stream            │   │
│  │  - Proxies to Conversational Agent (clothing_recommender:8002)       │   │
│  │  - SSE Stream Proxy with configurable timeout (600s)                │   │
│  └───────────────────────┬─────────────────────────────────────────────┘   │
└──────────────────────────┼──────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONVERSATIONAL AGENT SERVICE (Port 8002)                   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    LangGraph Workflow Engine                         │   │
│  │                                                                      │   │
│  │  ┌──────────────────────────────────────────────────────────────┐  │   │
│  │  │                    Input Guardrails                          │  │   │
│  │  │              (Content Moderation, PII Detection)              │  │   │
│  │  └───────────────────────────┬──────────────────────────────────┘  │   │
│  │                              │                                      │   │
│  │  ┌───────────────────────────▼──────────────────────────────────┐  │   │
│  │  │                    Intent Classifier Node                   │  │   │
│  │  └──────────────┬───────────────────────────────┬───────────────┘  │   │
│  │                 │                               │                   │   │
│  │        ┌────────▼────────┐            ┌────────▼────────┐          │   │
│  │        │  General        │            │  Clothing       │          │   │
│  │        │  Conversation    │            │  Recommendation │          │   │
│  │        │  Agent           │            │  Workflow       │          │   │
│  │        └────────┬────────┘            └────────┬────────┘          │   │
│  │                 │                               │                   │   │
│  │        ┌────────▼────────┐            ┌────────▼────────┐          │   │
│  │        │  Output         │            │  Output         │          │   │
│  │        │  Guardrails     │            │  Guardrails     │          │   │
│  │        └────────┬────────┘            └────────┬────────┘          │   │
│  │                 │                               │                   │   │
│  │                 └──────────────┬──────────────┘                   │   │
│  │                                │                                    │   │
│  │                        ┌───────▼────────┐                          │   │
│  │                        │  Response       │                          │   │
│  │                        │  Formatter     │                          │   │
│  │                        │  Node          │                          │   │
│  │                        └────────────────┘                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Agent Definitions                                 │   │
│  │                                                                      │   │
│  │  1. Conversation Agent (General Fashion Chat)                       │   │
│  │  2. Clothing Recommender Agent                                      │   │
│  │  3. Clothing Analyzer Agent                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────────────────┘
                            │
                            │ LangGraph State Management
                            │ (Shared State for Agent Communication)
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MCP SERVER LAYER                                     │
│                                                                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐        │
│  │  Wardrobe        │  │  Commerce        │  │  Web Search       │        │
│  │  MCP Server      │  │  MCP Server      │  │  MCP Server       │        │
│  │                  │  │                  │  │  (Tavily/Other)   │        │
│  │  Tools:          │  │  Tools:          │  │  Tools:           │        │
│  │  - search_items  │  │  - search_items  │  │  - web_search     │        │
│  │  - get_item      │  │  - get_item      │  │  - search_trends  │        │
│  │  - filter_items  │  │  - filter_items  │  │  - search_blogs    │        │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘        │
│                                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                                │
│  │  User Data       │  │  Style DNA       │                                │
│  │  MCP Server      │  │  MCP Server      │                                │
│  │                  │  │                  │                                │
│  │  Tools:          │  │  Tools:           │                                │
│  │  - get_profile   │  │  - get_style_dna │                                │
│  │  - get_wardrobe  │  │  - get_season     │                                │
│  │  - get_prefs     │  │  - get_colors     │                                │
│  └──────────────────┘  └──────────────────┘                                │
└─────────────────────────────────────────────────────────────────────────────┘
                            │
                            │ MCP Protocol
                            │ (Tool Calls)
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                           │
│                                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │  MongoDB     │  │  MongoDB     │  │  External    │                      │
│  │  Wardrobe    │  │  Commerce     │  │  APIs        │                      │
│  │  Collection  │  │  Collection   │  │  (Tavily)    │                      │
│  └──────────────┘  └──────────────┘  └──────────────┘                      │
│                                                                               │
│  ┌──────────────┐  ┌──────────────┐                                        │
│  │  MongoDB     │  │  Embedding   │                                        │
│  │  User        │  │  Service     │                                        │
│  │  Profiles    │  │  (CLIP)      │                                        │
│  └──────────────┘  └──────────────┘                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Component Breakdown

### 1. NestJS Backend Agent Module (Port 3001)

**Service:** NestJS Backend - Agent Module

**Responsibilities:**
- Clerk JWT authentication (validates Bearer token)
- Extracts user_id from authenticated token
- Proxies requests to Python Gateway
- SSE stream proxy with proper headers
- CORS handling for frontend

**Endpoints:**
- `POST /api/agent/chat` - Non-streaming chat endpoint
- `POST /api/agent/chat/stream` - Streaming chat endpoint (SSE)
- `GET /api/agent/health` - Health check

**Implementation Files:**
- `backend/src/agent/agent.module.ts` - Module definition
- `backend/src/agent/agent.service.ts` - SSE proxy logic
- `backend/src/agent/agent.controller.ts` - REST endpoints
- `backend/src/agent/dto/chat-request.dto.ts` - Request validation

**Environment Variables:**
- `PYTHON_GATEWAY_URL` - URL of Python Gateway (default: http://localhost:8000)
- `AGENT_TIMEOUT` - Request timeout in ms (default: 120000)

---

### 2. Python Gateway Layer (Port 8000)

**Service:** FastAPI Gateway

**Responsibilities:**
- Request routing to conversational agent service
- SSE stream proxying
- Timeout handling (configurable up to 600s for agentic workflows)

**Endpoints:**
- `POST /api/v1/agent/chat` - Proxied to conversational agent
- `POST /api/v1/agent/chat/stream` - Streaming endpoint proxy

---

### 3. Conversational Agent Service

**Service:** FastAPI Service (Port 8002)

**Core Technology:** LangGraph

#### 3.1 LangGraph Workflow Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    Workflow State                            │
│                                                              │
│  {                                                           │
│    // Input Fields                                           │
│    "user_id": str,                                           │
│    "session_id": str,                                         │
│    "message": str,                                           │
│    "conversation_history": List[Dict[str, str]],           │
│                                                              │
│    // Workflow Control (Multi-Turn Support)                 │
│    "workflow_status": "active" | "awaiting_clarification"   │
│                       | "completed",                         │
│    "is_clarification_response": bool,                       │
│    "pending_clarification_context": Optional[Dict],         │
│                                                              │
│    // Intent and Query Analysis                              │
│    "intent": "general" | "clothing",                         │
│    "search_scope": "commerce" | "wardrobe" | "both",        │
│    "extracted_filters": Optional[Dict[str, Any]],           │
│                                                              │
│    // User Context                                           │
│    "user_profile": Optional[UserProfile],                    │
│    "style_dna": Optional[StyleDNA],                          │
│                                                              │
│    // Clothing Workflow                                      │
│    "retrieved_items": List[ClothingItem],                    │
│    "search_sources_used": List[str],                        │
│    "fallback_used": bool,                                    │
│                                                              │
│    // Analysis Result                                        │
│    "analysis_result": Optional[AnalysisResult],              │
│    "refinement_notes": Optional[List[str]],                  │
│    "needs_clarification": bool,                              │
│    "clarification_question": Optional[str],                 │
│                                                              │
│    // Output                                                 │
│    "final_response": str,                                    │
│    "streaming_events": List[StreamEvent],                   │
│    "metadata": Dict[str, Any],                               │
│    "langfuse_trace_id": Optional[str],                       │
│    "iteration": int  // Track refinement iterations (max 3) │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

**New Multi-Turn Fields:**
- `workflow_status`: Tracks if workflow is active, waiting for clarification, or completed
- `is_clarification_response`: True when user is responding to a clarification question
- `pending_clarification_context`: Saves workflow state when clarification is needed, enabling seamless resumption

#### 3.2 Workflow Nodes

**Entry Node: Check Clarification**
- **Purpose:** Determine if this is a fresh request or a response to clarification
- **Logic:** Checks `is_clarification_response` and `pending_clarification_context`
- **Routes:**
  - If clarification response → Merge Clarification Context
  - If fresh request → Input Guardrails

**Node 1: Input Guardrails**
- **Purpose:** Validate and sanitize user input
- **Checks:** Content moderation, PII detection, input length, prompt injection patterns
- **Output:** Sanitized input or error response
- **Next:** Routes to Intent Classifier if safe

**Node 2: Intent Classifier**
- **Input:** Sanitized user message
- **Output:** Intent classification (`general` or `clothing`)
- **Logic:** LLM-based classification
- **Next:** Routes to either General Conversation or Clothing Workflow

**Node 3: General Conversation Agent**
- **Purpose:** Handles fashion advice, trends, blogs, general questions
- **Tools Available:**
  - Web Search MCP Server (for latest trends, blogs)
  - Style DNA MCP Server (for personalized advice)
- **Output:** Natural language response
- **Streaming:** Token-by-token LLM streaming

**Node 4: Query Analyzer Node**
- **Purpose:** Analyze user query and determine search scope
- **Input:** User message, conversation history
- **Output:** Search scope (commerce/wardrobe/both), extracted filters
- **Logic:** LLM-based query analysis
- **Next:** Routes to Clothing Recommender Agent

**Node 5: Merge Clarification Context**
- **Purpose:** Merge user's clarification response into existing workflow context
- **Input:** User's clarification, pending context from previous turn
- **Logic:** Parses clarification to extract filters (occasion, budget, color, etc.)
- **Output:** Updated filters merged with previous context
- **Next:** Routes directly to Clothing Recommender (skips intent/query analysis)

**Node 6: Clothing Recommendation Workflow**
- **Sub-workflow with multiple agents:**
  1. **Clothing Recommender Agent** - Fetches context and retrieves items
  2. **Clothing Analyzer Agent** - Validates and refines results
  3. **Response Formatter** - Formats final response
- **Refinement Loop:** Analyzer can request refinement (max 3 iterations)
- **Clarification Flow:** Saves context and sends question to user

**Node 7: Save Clarification Context**
- **Purpose:** Save workflow state before asking user for clarification
- **Saves:** Original message, extracted filters, search scope, retrieved items, iteration count
- **Sets:** `workflow_status = "awaiting_clarification"`
- **Next:** Routes to Output Guardrails to send the clarification question

**Node 8: Output Guardrails**
- **Purpose:** Validate LLM responses before sending to user
- **Checks:** Content moderation, on-topic validation, format validation
- **Applied:** After Conversation Agent and after Analyzer Agent
- **Output:** Filtered response or error response

**Node 9: Response Formatter**
- Formats final response for user
- Adds styling tips, explanations
- Sets `workflow_status = "completed"` or `"awaiting_clarification"`
- Streams response to backend

---

### 4. Agent Definitions

#### 4.1 Conversation Agent (General Fashion Chat)

**Purpose:** Handles general fashion conversations

**Capabilities:**
- Fashion advice and tips
- Latest trends discussion
- Fashion expert blogs/articles
- Color theory explanations
- Style guidance

**Tools:**
- `web_search` (MCP) - Search for latest trends, blogs
- `get_style_dna` (MCP) - Get user's style DNA for personalized advice

**Example Interactions:**
- "What are the latest fashion trends?"
- "Tell me about minimalist style"
- "What colors suit warm autumn skin tones?"

---

#### 4.2 Clothing Recommender Agent

**Purpose:** Intelligently retrieves clothing items based on user query

**Workflow:**
```
1. Analyze User Query
   ├─ Extract clothing types (pants, shirts, jackets, etc.)
   ├─ Determine search scope (commerce, wardrobe, both)
   └─ Identify style requirements

2. Fetch User Context
   ├─ Get user profile (MCP: User Data Server)
   ├─ Get style DNA (MCP: Style DNA Server)
   └─ Get wardrobe items if needed (MCP: Wardrobe Server)

3. Search for Items
   ├─ Commerce Search (MCP: Commerce Server)
   │   └─ Uses embedding space + user style DNA
   ├─ Wardrobe Search (MCP: Wardrobe Server)
   │   └─ Searches user's virtual wardrobe
   └─ Web Search (MCP: Web Search Server) [Fallback]
       └─ If items not found in commerce/wardrobe

4. Return Retrieved Items
   └─ With metadata (season, color, size, brand, AI explanations)
```

**Key Features:**
- Understands complex queries ("jackets that go with my style")
- Handles multiple item types in one query
- Uses metadata and AI-generated explanations from DB
- Falls back to web search if needed
- Considers user's style DNA for relevance

**Example Queries:**
- "I need pants for a wedding"
- "Find me jackets that match my style"
- "Show me casual summer tops"
- "I want to combine my blue shirt with something new"

---

#### 4.3 Clothing Analyzer Agent

**Purpose:** Validates and refines retrieved clothing items

**Decision Logic:**
```
Analyze: Retrieved Items + User Query + Style DNA
         │
         ├─ Are items relevant? ──► YES ──► Return items
         │
         ├─ Are items missing? ──► YES ──► Request refinement
         │                              │
         │                              └─ Add specific notes:
         │                                 - "Need more formal options"
         │                                 - "Require warmer colors"
         │                                 - "Missing size L options"
         │
         └─ Is query unclear? ──► YES ──► Ask user for clarification
                                        │
                                        └─ "What occasion is this for?"
                                           "What style are you looking for?"
```

**Output Options:**
1. **Approve** - Items are good, proceed to response
2. **Refine** - Add notes for recommender to search again
3. **Clarify** - Ask user for more information

**Refinement Notes Format:**
```json
{
  "action": "refine",
  "notes": [
    "Need more formal options",
    "Require colors matching warm autumn palette",
    "Missing size L in jackets"
  ],
  "priority": "high"
}
```

---

### 5. MCP Server Layer

**MCP (Model Context Protocol)** servers provide tools that agents can call. The implementation uses:

- **`fastapi-mcp`** - Exposes FastAPI endpoints as MCP tools
- **`langchain-mcp-adapters`** - Enables LangChain agents to call MCP tools

**MCP Server Architecture:**
```python
# mcp_servers/main.py
from fastapi_mcp import FastApiMCP

mcp = FastApiMCP(app, name="Aesthetiq MCP Server", ...)
mcp.mount_http()  # Mounts streamable HTTP transport at /mcp
```

**Agent Connection:**
```python
# conversational_agent/app/mcp/tools.py
from langchain_mcp_adapters.client import MultiServerMCPClient

config = {
    "aesthetiq": {
        "transport": "streamable_http",
        "url": f"{MCP_SERVERS_URL}/mcp",
    }
}
client = MultiServerMCPClient(config)
tools = await client.get_tools()  # Returns LangChain BaseTool objects
```

#### 5.1 Wardrobe MCP Server

**Purpose:** Search user's virtual wardrobe

**Endpoint Prefix:** `/api/v1/wardrobe`

**Tools (exposed via FastAPI routes at `/tools/*`):**

- `search_wardrobe_items` - Semantic search using CLIP embeddings
  ```python
  POST /tools/search_wardrobe_items
  {
      "query": str,           # Search query
      "user_id": str,         # User's clerkId
      "filters": {            # Optional WardrobeFilters
          "category": "TOP" | "BOTTOM" | "SHOE" | "ACCESSORY",
          "subCategory": str,
          "brand": str,
          "colors": List[str],
          "isFavorite": bool
      },
      "limit": int = 20
  }
  # Returns: List[{item: WardrobeItem, score: float}]
  ```

- `get_wardrobe_item` - Get single item by ID
  ```python
  POST /tools/get_wardrobe_item
  {"item_id": str, "user_id": str}
  ```

- `filter_wardrobe_items` - Filter by metadata
  ```python
  POST /tools/filter_wardrobe_items
  {"user_id": str, "filters": WardrobeFilters, "limit": int}
  ```

**Data Source:** MongoDB `wardrobeitems` collection

**Item Fields:**
- `_id`, `userId`, `imageUrl`, `processedImageUrl`
- `category` (TOP, BOTTOM, SHOE, ACCESSORY)
- `subCategory`, `brand`, `colors[]`, `notes`
- `isFavorite`, `lastWorn`, `seasonalPaletteScores`
- `embedding` (CLIP vector for semantic search)

---

#### 5.2 Commerce MCP Server

**Purpose:** Search commerce/retail clothing items

**Endpoint Prefix:** `/api/v1/commerce`

**Tools:**

- `search_commerce_items` - Semantic search with style DNA ranking
  ```python
  POST /tools/search_commerce_items
  {
      "query": str,
      "style_dna": str | None,  # User's color season (e.g., "WARM_AUTUMN")
      "filters": {              # Optional CommerceFilters
          "category": "TOP" | "BOTTOM" | "SHOE" | "ACCESSORY",
          "subCategory": str,
          "brand": str,
          "brandId": str,
          "retailerId": str,
          "minPrice": float,
          "maxPrice": float,
          "inStock": bool
      },
      "limit": int = 20,
      "candidate_pool": int = 200
  }
  # Returns: List[{item: CommerceItem, score: float, breakdown: dict}]
  ```

- `get_commerce_item` - Get single item
  ```python
  POST /tools/get_commerce_item
  {"item_id": str}
  ```

- `filter_commerce_items` - Filter by metadata
  ```python
  POST /tools/filter_commerce_items
  {"filters": CommerceFilters, "limit": int}
  ```

**Data Source:** MongoDB `commerceitems` collection

**Ranking Algorithm:**
- Semantic similarity (CLIP embedding cosine similarity)
- Style DNA matching (uses `seasonalPaletteScores` for color season matching)
- Combined score: `combine_scores(semantic_score, season_score)`

---

#### 5.3 Web Search MCP Server

**Purpose:** Search external sources for fashion information

**Endpoint Prefix:** `/api/v1/web-search`

**Tools:**

- `web_search` - General web search via Tavily API
  ```python
  POST /tools/web_search
  {"query": str, "max_results": int = 5}
  # Returns: List[WebSearchResult{title, url, content, score}]
  ```

- `search_trends` - Fashion trends search
  ```python
  POST /tools/search_trends
  {"topic": str, "max_results": int = 5}
  # Searches: "fashion trends {topic} 2026"
  ```

- `search_blogs` - Fashion blog search
  ```python
  POST /tools/search_blogs
  {"query": str, "max_results": int = 5}
  # Searches: "{query} site:fashion blog OR site:blog"
  ```

**External API:** Tavily Search API (configured via `TAVILY_API_KEY`)

**Use Cases:**
- Fallback when commerce/wardrobe don't have items
- Latest fashion trends research
- Fashion blog articles and expert advice
- Finding specific brands/products

---

#### 5.4 User Data MCP Server

**Purpose:** Fetch user profile and preferences

**Endpoint Prefix:** `/api/v1/user-data`

**Tools:**

- `get_user_profile` - Get user profile by clerkId
  ```python
  POST /tools/get_user_profile
  {"user_id": str}  # clerkId from Clerk auth
  # Returns: UserProfile{
  #   user_id, email, name, avatar_url,
  #   subscription_status (FREE, PREMIUM, ENTERPRISE),
  #   role (USER, ADMIN, SUPER_ADMIN),
  #   settings: UserSettings{units, currency, shoppingRegion, theme, ...}
  # }
  ```

**Data Source:** MongoDB `users` collection

**Note:** User preferences for sizes, brands, and budget are stored in StyleProfile (see Style DNA Server)

---

#### 5.5 Style DNA MCP Server

**Purpose:** Get user's style DNA from StyleProfile and ColorAnalysis collections

**Endpoint Prefix:** `/api/v1/style-dna`

**Tools:**

- `get_style_dna` - Complete style DNA (combined from both collections)
  ```python
  POST /tools/get_style_dna
  {"user_id": str}
  # Returns: StyleDNA{
  #   // From ColorAnalysis
  #   color_season, contrast_level, undertone, palette[], face_shape,
  #   // From StyleProfile
  #   archetype, sliders{}, inspiration_image_urls[],
  #   negative_constraints[], favorite_brands[],
  #   sizes{top, bottom, shoe}, fit_preferences{},
  #   budget_range, max_price_per_item
  # }
  ```

- `get_color_season` - Just the color season
  ```python
  POST /tools/get_color_season
  {"user_id": str}
  # Returns: str | None (e.g., "WARM_AUTUMN")
  ```

- `get_style_archetype` - Style archetype from profile
  ```python
  POST /tools/get_style_archetype
  {"user_id": str}
  ```

- `get_recommended_colors` - Palette based on color season
  ```python
  POST /tools/get_recommended_colors
  {"user_id": str}
  # Returns: List[str] (hex color codes)
  ```

- Additional tools: `get_contrast_level`, `get_undertone`, `get_style_sliders`, `get_user_palette`

**Data Sources:**
- MongoDB `styleprofiles` collection
- MongoDB `coloranalyses` collection

---

### 6. LangGraph State Management (Agent Communication)

**Purpose:** Enable agents to communicate and coordinate through shared state

**State-Based Communication:**
- All agents read from and write to shared `ConversationState`
- No explicit message passing needed - state transitions handle communication
- State updates trigger workflow transitions automatically

**State Fields for Agent Communication:**
- `retrieved_items` - Recommender Agent writes, Analyzer Agent reads
- `analysis_result` - Analyzer Agent writes, workflow routes based on decision
- `refinement_notes` - Analyzer Agent writes, Recommender Agent reads (for retry)
- `needs_clarification` - Analyzer Agent writes, workflow routes to save context
- `iteration` - Tracks refinement loop iterations (max 3 to prevent infinite loops)

**Multi-Turn State Fields:**
- `workflow_status` - Tracks workflow state: "active", "awaiting_clarification", "completed"
- `is_clarification_response` - Set to true when user responds to a clarification
- `pending_clarification_context` - Saves context needed to resume workflow

**Workflow Transitions:**
- Entry → Check Clarification: First node determines if resuming or starting fresh
- Check Clarification → Merge Context (resume): When `is_clarification_response == True`
- Check Clarification → Input Guardrails (fresh): When starting a new conversation
- Merge Context → Recommender: Skips intent/query analysis when resuming
- Recommender → Analyzer: Automatic via state update
- Analyzer → Recommender (refine): Conditional routing based on `analysis_result.decision == "refine"`
- Analyzer → Save Clarification → Response (clarify): Saves context, sends question to user
- Analyzer → Response Formatter (approve): Conditional routing based on `analysis_result.decision == "approve"`

**Clarification Flow (Multi-Turn):**
```
Turn 1: User asks vague question
  → Analyzer decides: CLARIFY
  → Save Clarification Context (saves filters, items, iteration)
  → Response Formatter (sends clarification question)
  → workflow_status = "awaiting_clarification"
  → END (workflow pauses)

Turn 2: User provides clarification
  → Check Clarification (detects pending context)
  → Merge Clarification Context (updates filters with new info)
  → Clothing Recommender (searches with updated filters)
  → Analyzer → Approve → Response
  → workflow_status = "completed"
```

**Benefits:**
- Simpler than explicit message passing
- State is always available for debugging
- LangGraph handles state persistence and transitions
- Easy to add new agents without protocol changes
- Multi-turn conversations preserve context seamlessly

---

### 7. Session Management and Chat History

**Purpose:** Manage conversation sessions and maintain chat history for context-aware responses

**Session Service:**
- **File:** `conversational_agent/app/services/session/session_service.py`
- **Responsibilities:**
  - Load or create sessions from backend
  - Load conversation history for context
  - Format history for LLM context (limits to last 10 messages)
  - Persist messages to backend after workflow completion

**Backend Client:**
- **File:** `conversational_agent/app/services/backend_client.py`
- **Methods:**
  - `create_session(user_id, title)` - Create new chat session
  - `get_session(session_id)` - Get session with history
  - `add_message(session_id, role, content, metadata)` - Persist message

**Workflow Integration:**
1. **Before Workflow:** Load session and history from backend
2. **During Workflow:** Use `conversation_history` in state for LLM context
3. **After Workflow:** Save user message and assistant response to backend

**History Formatting:**
- Limits to last 10 messages to avoid token limits
- Formats as LLM messages: `[SystemMessage, ...history, HumanMessage(current)]`
- Maintains conversation context across multiple turns

---

### 8. Input and Output Guardrails

**Purpose:** Ensure user safety, content moderation, and prevent inappropriate content

**Input Guardrails:**
- **File:** `conversational_agent/app/guardrails/input_guardrails.py`
- **Checks:**
  - Content moderation (inappropriate content detection)
  - PII detection and redaction
  - Input length validation (max 10,000 characters)
  - Special character sanitization
  - Prompt injection pattern detection
- **Integration:** Applied at workflow entry (before Intent Classifier)

**Output Guardrails:**
- **File:** `conversational_agent/app/guardrails/output_guardrails.py`
- **Checks:**
  - Content moderation of LLM responses
  - On-topic validation (ensure fashion-related)
  - Inappropriate content filtering
  - Response format validation
- **Integration:** Applied after Conversation Agent and after Analyzer Agent (before Response Formatter)

**Guardrail Result:**
```python
class GuardrailResult:
    is_safe: bool
    sanitized_input: str  # or filtered_response
    warnings: List[str]
```

---

### 9. Langfuse Tracing

**Purpose:** Comprehensive tracing of all LLM calls, tool calls, and agent transitions

**Tracing Service:**
- **File:** `conversational_agent/app/services/tracing/langfuse_service.py`
- **Capabilities:**
  - Start parent trace at workflow entry
  - Log LLM calls as spans (with input/output)
  - Log MCP tool calls as spans (with parameters/results)
  - Log agent transitions (state snapshots)
  - Track performance metrics

**Integration Points:**
- Workflow entry: Start trace
- Each agent: Log LLM calls
- Each MCP call: Log tool calls
- State transitions: Log agent transitions
- Workflow completion: End trace

**Benefits:**
- Debugging: See complete execution flow
- Performance: Identify bottlenecks
- Monitoring: Track LLM usage and costs
- Quality: Review agent decisions

---

### 10. Data Flow Examples

#### Example 1: General Fashion Question

```
User: "What are the latest fashion trends?"

1. Gateway → Conversational Agent Service
2. Intent Classifier → "general"
3. General Conversation Agent:
   - Calls Web Search MCP: search_trends("fashion trends 2024")
   - Gets Style DNA MCP: get_style_dna(user_id)
   - Generates response with LLM
4. Response Formatter → Streams to Backend → Frontend
```

#### Example 2: Clothing Recommendation (Commerce)

```
User: "I need a jacket for a job interview"

1. Gateway → Conversational Agent Service
2. Intent Classifier → "clothing"
3. Query Analyzer:
   - Determines: commerce search needed
   - Extracts: category=TOP, subCategory=Jacket, occasion=formal
4. Clothing Recommender Agent:
   - Gets user profile (User Data MCP)
   - Gets style DNA (Style DNA MCP)
   - Searches commerce (Commerce MCP) with style DNA filter
   - Returns: List of jackets
5. Clothing Analyzer Agent:
   - Analyzes: Are jackets formal enough? Match style DNA?
   - Decision: APPROVE
6. Response Formatter → Streams results to Backend
```

#### Example 3: Clothing Recommendation (Wardrobe + Commerce)

```
User: "I want to combine my blue shirt with something new"

1. Gateway → Conversational Agent Service
2. Intent Classifier → "clothing"
3. Query Analyzer:
   - Determines: both wardrobe and commerce needed
   - User has: blue shirt (wardrobe)
   - Needs: matching items (commerce)
4. Clothing Recommender Agent:
   - Gets blue shirt from wardrobe (Wardrobe MCP)
   - Gets style DNA (Style DNA MCP)
   - Searches commerce for matching items (Commerce MCP)
   - Returns: Blue shirt + matching pants/shoes
5. Clothing Analyzer Agent:
   - Analyzes: Do items complement each other?
   - Decision: APPROVE
6. Response Formatter → Streams outfit combination
```

#### Example 4: Refinement Loop

```
User: "Find me jackets"

1. Input Guardrails → Validates input (safe)
2. Intent Classifier → "clothing"
3. Query Analyzer → Determines: commerce search
4. Clothing Recommender Agent:
   - Fetches user profile and style DNA
   - Searches commerce → Returns 5 jackets
   - State: retrieved_items = [5 jackets], iteration = 0
5. Clothing Analyzer Agent:
   - Analyzes: Jackets don't match user's style DNA well
   - Decision: REFINE
   - State: refinement_notes = ["Need jackets matching warm autumn palette", "More formal options"], iteration = 1
6. Clothing Recommender Agent (retry):
   - Reads refinement_notes from state
   - Searches again with refinement notes
   - Returns 3 better jackets
   - State: retrieved_items = [3 jackets], iteration = 1
7. Clothing Analyzer Agent:
   - Decision: APPROVE
   - State: analysis_result.decision = "approve", iteration = 1
8. Output Guardrails → Validates response (safe)
9. Response Formatter → Streams results
10. Session Service → Saves messages to backend
```

#### Example 5: Web Search Fallback

```
User: "Find me a specific brand jacket"

1. Clothing Recommender Agent:
   - Searches commerce → No results
   - Searches wardrobe → No results
2. Fallback: Web Search MCP
   - Searches web for brand jacket
   - Returns: External product links
3. Clothing Analyzer Agent:
   - Decision: APPROVE (with note about external source)
4. Response Formatter → Streams web search results
```

#### Example 6: Multi-Turn Clarification Flow

```
Turn 1: User: "I need something nice to wear"

1. Check Clarification Node:
   - is_clarification_response = False
   - Routes to Input Guardrails (fresh request)
2. Intent Classifier → "clothing"
3. Query Analyzer:
   - Determines: commerce search (vague query)
   - Extracts: {} (no specific filters)
4. Clothing Recommender Agent:
   - Searches commerce with no specific filters
   - Returns: Generic items
5. Clothing Analyzer Agent:
   - Analyzes: Query too vague, items don't match specific need
   - Decision: CLARIFY
   - Question: "What occasion is this for?"
   - State: needs_clarification = True
6. Save Clarification Context:
   - Saves: original_message, extracted_filters, search_scope, iteration
   - Sets: workflow_status = "awaiting_clarification"
7. Response Formatter:
   - Formats clarification question
   - Returns: "I'd love to help! What occasion is this for?"
   - Sets: workflow_status = "awaiting_clarification"
8. END (workflow pauses, waiting for user)

Turn 2: User: "A formal dinner party"

1. run_workflow called with pending_context from Turn 1
2. Check Clarification Node:
   - is_clarification_response = True (pending_context provided)
   - Routes to Merge Clarification Context
3. Merge Clarification Context:
   - Reads: "A formal dinner party"
   - Extracts: occasion = "party", style = "formal"
   - Merges with previous filters: {occasion: "party"}
   - Restores: previous iteration count, search_scope
4. Clothing Recommender Agent (skipped intent/query analysis):
   - Has updated filters: {occasion: "party"}
   - Searches commerce with refined criteria
   - Returns: Formal party attire
5. Clothing Analyzer Agent:
   - Decision: APPROVE
6. Response Formatter:
   - Formats items with styling tips
   - Sets: workflow_status = "completed"
```

---

### 11. Streaming Architecture

**Stream Format (SSE):**

```javascript
// Event types (from state.py StreamEvent class)
{
  "type": "metadata",      // Session info: session_id, user_id, trace_id
  "type": "status",        // Human-readable progress: {message: "..."}
  "type": "node_start",    // Workflow node started: {node, display_name}
  "type": "node_end",      // Workflow node finished: {node}
  "type": "intent",        // Intent classification: {intent: "general"|"clothing"}
  "type": "filters",       // Query analysis: {filters, scope}
  "type": "items_found",   // Items retrieved: {count, sources[]}
  "type": "analysis",      // Analyzer decision: {decision, confidence}
  "type": "tool_call",     // MCP tool invocation: {tool, input}
  "type": "chunk",         // Response text streaming: {content}
  "type": "done",          // Final response with all data
  "type": "error"          // Error occurred: {message}
}
```

**Stream Flow:**
```
Frontend → NestJS Backend → Python Gateway → Conversational Agent
             (SSE Proxy)      (SSE Proxy)      (LangGraph astream_events)
```

**Example Stream:**
```
data: {"type": "metadata", "session_id": "sess_123", "user_id": "user_abc", "trace_id": "trace_xyz"}
data: {"type": "status", "message": "Understanding your request..."}
data: {"type": "node_start", "node": "intent_classifier", "display_name": "Understanding your request"}
data: {"type": "node_end", "node": "intent_classifier"}
data: {"type": "intent", "intent": "clothing"}
data: {"type": "node_start", "node": "query_analyzer", "display_name": "Analyzing what you're looking for"}
data: {"type": "filters", "filters": {"category": "TOP", "occasion": "formal"}, "scope": "commerce"}
data: {"type": "node_end", "node": "query_analyzer"}
data: {"type": "node_start", "node": "clothing_recommender", "display_name": "Searching for items"}
data: {"type": "tool_call", "tool": "search_commerce_items", "input": "formal jacket..."}
data: {"type": "items_found", "count": 5, "sources": ["commerce"]}
data: {"type": "node_end", "node": "clothing_recommender"}
data: {"type": "node_start", "node": "clothing_analyzer", "display_name": "Evaluating recommendations"}
data: {"type": "analysis", "decision": "approve", "confidence": 0.85}
data: {"type": "node_end", "node": "clothing_analyzer"}
data: {"type": "chunk", "content": "I found 5 great jackets..."}
data: {"type": "done", "response": "Full response...", "intent": "clothing", "items": [...], "workflow_status": "completed", "needs_clarification": false, "session_id": "sess_123"}
```

---

### 12. Technology Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | Next.js with React, TypeScript |
| **Backend API** | NestJS (TypeScript) with Clerk auth |
| **Python Gateway** | FastAPI |
| **Orchestration** | LangGraph |
| **LLM** | OpenAI GPT-4o (via `langchain-openai`) |
| **Agent Communication** | LangGraph State Management (shared state) |
| **MCP Server** | `fastapi-mcp` |
| **MCP Client** | `langchain-mcp-adapters` (MultiServerMCPClient) |
| **MCP Transport** | Streamable HTTP (`/mcp` endpoint) |
| **Web Search** | Tavily API |
| **Database** | MongoDB (wardrobeitems, commerceitems, users, styleprofiles, coloranalyses) |
| **Embeddings** | CLIP (via Embedding Service port 8004) |
| **Streaming** | Server-Sent Events (SSE) via LangGraph `astream_events` |
| **Tracing** | Langfuse |
| **Guardrails** | `guardrails-ai` (GuardrailsAIProvider for prompt injection + toxic content)

---

### 13. File Structure

```
aesthetiq/
├── backend/                        # NestJS Backend
│   └── src/
│       └── agent/                  # Agent proxy module (NEW)
│           ├── agent.module.ts
│           ├── agent.controller.ts  # /api/agent/chat, /chat/stream
│           ├── agent.service.ts     # SSE proxy to Python Gateway
│           └── dto/
│               └── chat-request.dto.ts
│
├── frontend/                       # Next.js Frontend
│   ├── lib/
│   │   └── chat-api.ts            # SSE client + useChatApi hook
│   └── types/
│       └── chat.ts                # Stream event TypeScript interfaces
│
└── python_engine/
    ├── conversational_agent/       # Conversational Agent Service (Port 8002)
    │   ├── app/
    │   │   ├── main.py             # FastAPI app with lifespan (MCP init)
    │   │   ├── agents/
    │   │   │   ├── conversation_agent.py      # General fashion chat
    │   │   │   ├── clothing_recommender_agent.py  # Item retrieval
    │   │   │   └── clothing_analyzer_agent.py     # Result evaluation
    │   │   ├── workflows/
    │   │   │   ├── main_workflow.py   # LangGraph workflow + streaming
    │   │   │   ├── state.py           # ConversationState TypedDict
    │   │   │   └── nodes/
    │   │   │       ├── intent_classifier.py
    │   │   │       ├── query_analyzer.py
    │   │   │       └── response_formatter.py
    │   │   ├── guardrails/
    │   │   │   ├── base.py            # GuardrailProvider interface
    │   │   │   ├── safety_guardrails.py  # Main orchestrator
    │   │   │   └── providers/
    │   │   │       ├── base_provider.py
    │   │   │       └── guardrails_ai_provider.py
    │   │   ├── services/
    │   │   │   ├── llm_service.py     # OpenAI wrapper
    │   │   │   ├── backend_client.py  # NestJS chat API client
    │   │   │   ├── session/
    │   │   │   │   └── session_service.py
    │   │   │   └── tracing/
    │   │   │       └── langfuse_service.py
    │   │   ├── mcp/
    │   │   │   └── tools.py           # langchain-mcp-adapters integration
    │   │   └── api/v1/endpoints/
    │   │       └── chat.py            # /chat and /chat/stream
    │   ├── tests/
    │   └── requirements.txt
    │
    ├── mcp_servers/                # Unified MCP Server (Port 8010)
    │   ├── main.py                 # FastAPI + fastapi-mcp mounting
    │   ├── core/
    │   │   └── config.py
    │   ├── shared/
    │   │   ├── mongo.py            # MongoDB connection
    │   │   └── embeddings_client.py  # CLIP embedding client
    │   ├── wardrobe_server/
    │   │   ├── router.py           # /api/v1/wardrobe/tools/*
    │   │   ├── tools.py
    │   │   ├── schemas.py
    │   │   └── db.py
    │   ├── commerce_server/
    │   │   ├── router.py
    │   │   ├── tools.py
    │   │   ├── schemas.py
    │   │   ├── db.py
    │   │   └── style_ranking.py    # Season-based ranking
    │   ├── web_search_server/
    │   │   ├── router.py
    │   │   ├── tools.py
    │   │   ├── schemas.py
    │   │   └── tavily_client.py
    │   ├── user_data_server/
    │   │   ├── router.py
    │   │   ├── tools.py
    │   │   ├── schemas.py
    │   │   └── db.py
    │   └── style_dna_server/
    │       ├── router.py
    │       ├── tools.py
    │       ├── schemas.py
    │       ├── db.py
    │       └── color_mappings.py
    │
    └── gateway/                    # Python Gateway (Port 8000)
        └── app/
            ├── config.py
            ├── proxy.py
            └── routes/
                └── agent.py        # Proxy to conversational_agent
```

---

### 14. Implementation Phases

See `python_engine/docs/issues/` for detailed implementation issues:

1. **Issue 1: Core Infrastructure** - LangGraph state, MCP client, Langfuse, session management
2. **Issue 2: MCP Servers** - All 5 MCP servers with test endpoints
3. **Issue 3: Agents and Workflow** - All agents and complete workflow with Langfuse
4. **Issue 4: Safety Guardrails** - Input/output guardrails
5. **Issue 5: Integration and E2E** - Backend integration and end-to-end testing
6. **Issue 6: Performance Optimization** - Performance optimization and bug fixes

---

## Key Design Decisions

1. **MCP Servers for Tool Calls**: Allows agents to use tools via standardized protocol, making tools reusable across different agents.

2. **LangGraph State Management**: Agents communicate through shared state, eliminating need for explicit message passing. State transitions handle agent coordination automatically.

3. **LangGraph Orchestration**: Provides state management, conditional routing, and streaming capabilities.

4. **Streaming to Backend**: Maintains separation of concerns - Python engine handles AI logic, backend handles persistence.

5. **Fallback to Web Search**: Ensures users can always find items, even if not in commerce/wardrobe databases.

6. **Refinement Loop**: Analyzer can request improvements, creating a feedback loop for better results.

7. **Multi-Turn Clarification with Checkpointing**: When clarification is needed, workflow state is saved (`pending_clarification_context`) and workflow ends with `workflow_status = "awaiting_clarification"`. On the next turn, the workflow detects the pending context and resumes from where it left off, skipping intent classification and query analysis. This prevents the infinite loop problem and preserves context across turns.

8. **Structured Filter Extraction from Refinement Notes**: The `parse_refinement_notes_to_filters()` function extracts structured filter updates from natural language refinement notes (e.g., "Need more formal options" → `{occasion: "formal"}`), making refinement more effective.

---

## Security Considerations

- **Authentication**: Gateway validates all requests
- **Rate Limiting**: Per user/IP limits
- **Input Guardrails**: All user inputs validated and sanitized before processing
- **Output Guardrails**: All LLM responses validated before sending to users
- **Tool Call Validation**: MCP servers validate all tool call parameters
- **Error Handling**: Graceful degradation if MCP servers unavailable
- **Session Management**: Secure session handling and message persistence

---

## Performance Considerations

- **Caching**: Cache user profiles, style DNA, and frequent queries
- **Parallel Tool Calls**: Agents can call multiple MCP tools in parallel
- **Streaming**: Real-time response streaming for better UX
- **Connection Pooling**: Reuse connections to MongoDB and external APIs
- **Refinement Loop Limit**: Maximum 3 iterations to prevent infinite loops
- **History Limiting**: Limit conversation history to last 10 messages to manage token usage

---

## Future Enhancements

1. **Multi-modal Input**: Support image uploads for "find similar" queries
2. **Voice Interface**: Add voice input/output support
3. **Personalization**: Learn from user interactions to improve recommendations
4. **A/B Testing**: Test different agent strategies
5. **Analytics**: Track agent performance and user satisfaction
