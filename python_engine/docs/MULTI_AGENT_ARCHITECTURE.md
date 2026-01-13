# Multi-Agent Conversational System Architecture

## Overview

This document describes the new multi-agent conversational system that replaces the `clothing_recommender` service. The system uses **LangGraph** for orchestration, **A2A (Agent-to-Agent) protocol** for inter-agent communication, and **MCP (Model Context Protocol) servers** for tool calls.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL LAYER                                     │
│                                                                               │
│  ┌──────────────┐                    ┌──────────────┐                      │
│  │   Frontend   │                    │   Backend     │                      │
│  │   (React)    │◄──────────────────►│  (NestJS)     │                      │
│  │              │   SSE Stream       │  Chat API     │                      │
│  └──────────────┘                    └──────┬───────┘                      │
│                                              │                               │
└──────────────────────────────────────────────┼───────────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GATEWAY LAYER (Port 8000)                          │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  FastAPI Gateway                                                    │   │
│  │  - Routes: /api/v1/agent/chat/stream                                │   │
│  │  - Authentication & Rate Limiting                                   │   │
│  │  - SSE Stream Proxy                                                 │   │
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
│  │  │                    Entry Node                                 │  │   │
│  │  │              (Intent Classifier)                               │  │   │
│  │  └──────────────┬───────────────────────────────┬───────────────┘  │   │
│  │                 │                               │                   │   │
│  │        ┌────────▼────────┐            ┌────────▼────────┐          │   │
│  │        │  General        │            │  Clothing       │          │   │
│  │        │  Conversation    │            │  Recommendation │          │   │
│  │        │  Agent           │            │  Workflow       │          │   │
│  │        └────────┬────────┘            └────────┬────────┘          │   │
│  │                 │                               │                   │   │
│  │                 └──────────────┬──────────────┘                   │   │
│  │                                │                                    │   │
│  │                        ┌───────▼────────┐                          │   │
│  │                        │  Response       │                          │   │
│  │                        │  Formatter     │                          │   │
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
                            │ A2A Protocol
                            │ (Agent-to-Agent Communication)
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

### 1. Gateway Layer

**Service:** FastAPI Gateway (Port 8000)

**Responsibilities:**
- Authentication (API keys, JWT validation)
- Rate limiting per user/IP
- Request routing to conversational agent service
- SSE stream proxying to backend
- CORS handling

**Endpoints:**
- `POST /api/v1/agent/chat/stream` - Streaming chat endpoint

---

### 2. Conversational Agent Service

**Service:** FastAPI Service (Port 8002)

**Core Technology:** LangGraph

#### 2.1 LangGraph Workflow Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    Workflow State                            │
│                                                              │
│  {                                                           │
│    "user_id": str,                                           │
│    "session_id": str,                                         │
│    "message": str,                                           │
│    "intent": "general" | "clothing",                         │
│    "conversation_history": List[Message],                   │
│    "user_profile": UserProfile,                              │
│    "style_dna": StyleDNA,                                    │
│    "retrieved_items": List[ClothingItem],                    │
│    "analysis_result": AnalysisResult,                        │
│    "final_response": str,                                    │
│    "metadata": Dict                                          │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

#### 2.2 Workflow Nodes

**Node 1: Intent Classifier**
- **Input:** User message
- **Output:** Intent classification (`general` or `clothing`)
- **Logic:** LLM-based classification
- **Next:** Routes to either General Conversation or Clothing Workflow

**Node 2: General Conversation Agent**
- **Purpose:** Handles fashion advice, trends, blogs, general questions
- **Tools Available:**
  - Web Search MCP Server (for latest trends, blogs)
  - Style DNA MCP Server (for personalized advice)
- **Output:** Natural language response
- **Streaming:** Token-by-token LLM streaming

**Node 3: Clothing Recommendation Workflow**
- **Sub-workflow with multiple agents:**
  1. **Query Analyzer** - Determines search scope (commerce, wardrobe, both)
  2. **Clothing Recommender Agent** - Retrieves items
  3. **Clothing Analyzer Agent** - Validates and refines results
  4. **Response Formatter** - Formats final response

**Node 4: Response Formatter**
- Formats final response for user
- Adds styling tips, explanations
- Streams response to backend

---

### 3. Agent Definitions

#### 3.1 Conversation Agent (General Fashion Chat)

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

#### 3.2 Clothing Recommender Agent

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

#### 3.3 Clothing Analyzer Agent

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

### 4. MCP Server Layer

**MCP (Model Context Protocol)** servers provide tools that agents can call. Each server exposes a set of tools via the MCP protocol.

#### 4.1 Wardrobe MCP Server

**Purpose:** Search user's virtual wardrobe

**Tools:**
- `search_wardrobe_items(query: str, filters: Dict) -> List[Item]`
  - Semantic search in user's wardrobe
  - Uses embeddings + metadata filtering
- `get_wardrobe_item(item_id: str) -> Item`
  - Get specific item details
- `filter_wardrobe_items(filters: Dict) -> List[Item]`
  - Filter by category, color, brand, etc.

**Data Source:** MongoDB Wardrobe Collection

**Metadata Used:**
- Category, subCategory
- Color (hex)
- Brand
- Size
- Season
- AI-generated style explanations
- User notes

---

#### 4.2 Commerce MCP Server

**Purpose:** Search commerce/retail clothing items

**Tools:**
- `search_commerce_items(query: str, user_style_dna: StyleDNA, filters: Dict) -> List[Item]`
  - Semantic search in commerce embedding space
  - Filters by user's style DNA for relevance
- `get_commerce_item(item_id: str) -> Item`
  - Get specific commerce item details
- `filter_commerce_items(filters: Dict) -> List[Item]`
  - Filter by category, price range, brand, etc.

**Data Source:** MongoDB Commerce Collection (with embeddings)

**Key Feature:** Uses user's style DNA to rank results by relevance

---

#### 4.3 Web Search MCP Server

**Purpose:** Search external sources for clothing items

**Tools:**
- `web_search(query: str, max_results: int = 5) -> List[SearchResult]`
  - Search web for clothing items (Tavily API or similar)
- `search_trends(topic: str) -> List[Trend]`
  - Search for fashion trends
- `search_blogs(query: str) -> List[BlogPost]`
  - Search fashion blogs/articles

**Use Cases:**
- Fallback when commerce/wardrobe don't have items
- Finding specific brands/products
- Latest fashion trends
- Expert blog articles

**External APIs:**
- Tavily Search API
- Google Custom Search (optional)
- Other web search providers

---

#### 4.4 User Data MCP Server

**Purpose:** Fetch user profile and preferences

**Tools:**
- `get_user_profile(user_id: str) -> UserProfile`
  - Get user's profile data
- `get_user_wardrobe(user_id: str) -> List[Item]`
  - Get all user's wardrobe items
- `get_user_preferences(user_id: str) -> Preferences`
  - Get user preferences (sizes, brands, etc.)

**Data Source:** MongoDB User Profiles Collection

---

#### 4.5 Style DNA MCP Server

**Purpose:** Get user's style DNA information

**Tools:**
- `get_style_dna(user_id: str) -> StyleDNA`
  - Get user's style DNA (color season, face shape, archetype)
- `get_color_season(user_id: str) -> ColorSeason`
  - Get user's color season analysis
- `get_style_archetype(user_id: str) -> Archetype`
  - Get user's style archetype
- `get_recommended_colors(user_id: str) -> List[Color]`
  - Get recommended colors based on style DNA

**Data Source:** MongoDB Style Profiles Collection

---

### 5. A2A Protocol (Agent-to-Agent Communication)

**Purpose:** Enable agents to communicate and coordinate

**Protocol Structure:**
```json
{
  "from_agent": "clothing_recommender",
  "to_agent": "clothing_analyzer",
  "message_type": "request_analysis",
  "payload": {
    "retrieved_items": [...],
    "user_query": "...",
    "style_dna": {...}
  },
  "session_id": "...",
  "timestamp": "..."
}
```

**Message Types:**
- `request_analysis` - Analyzer requests analysis of items
- `analysis_result` - Analyzer returns analysis result
- `refinement_request` - Analyzer requests refinement with notes
- `clarification_request` - Analyzer requests user clarification

**Implementation:**
- Agents communicate through shared state in LangGraph
- Messages passed via workflow state updates
- Async communication for parallel processing

---

### 6. Data Flow Examples

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

1. Clothing Recommender Agent:
   - Searches commerce → Returns 5 jackets
2. Clothing Analyzer Agent:
   - Analyzes: Jackets don't match user's style DNA well
   - Decision: REFINE
   - Notes: "Need jackets matching warm autumn palette, more formal"
3. Clothing Recommender Agent (retry):
   - Searches again with refinement notes
   - Returns 3 better jackets
4. Clothing Analyzer Agent:
   - Decision: APPROVE
5. Response Formatter → Streams results
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

---

### 7. Streaming Architecture

**Stream Format (SSE):**

```javascript
// Event types
{
  "type": "metadata",      // Session info, route decision
  "type": "status",        // Progress updates
  "type": "agent_start",  // Agent begins work
  "type": "tool_call",     // MCP tool being called
  "type": "chunk",         // LLM text chunk
  "type": "item",          // Clothing item found
  "type": "analysis",      // Analyzer decision
  "type": "done"           // Complete
}
```

**Stream Flow:**
```
Gateway → Conversational Agent Service → Backend Chat API → Frontend
         (SSE Stream)                    (SSE Stream)        (SSE Stream)
```

**Example Stream:**
```
data: {"type": "metadata", "session_id": "...", "intent": "clothing"}
data: {"type": "status", "content": "Analyzing your request..."}
data: {"type": "agent_start", "agent": "clothing_recommender"}
data: {"type": "tool_call", "tool": "commerce_search", "query": "jackets"}
data: {"type": "item", "item": {...}, "source": "commerce"}
data: {"type": "agent_start", "agent": "clothing_analyzer"}
data: {"type": "analysis", "decision": "approve", "items_count": 3}
data: {"type": "chunk", "content": "I found 3 jackets..."}
data: {"type": "done", "message": "Full response..."}
```

---

### 8. Technology Stack

| Component | Technology |
|-----------|-----------|
| **Orchestration** | LangGraph |
| **LLM** | OpenAI GPT-4 / Anthropic Claude |
| **Agent Communication** | A2A Protocol (custom) |
| **Tool Protocol** | MCP (Model Context Protocol) |
| **Web Search** | Tavily API / Google Custom Search |
| **Database** | MongoDB (Wardrobe, Commerce, User Profiles) |
| **Embeddings** | CLIP (via Embedding Service) |
| **Streaming** | Server-Sent Events (SSE) |
| **Backend Integration** | HTTP POST to NestJS Chat API |

---

### 9. File Structure

```
python_engine/
├── conversational_agent/          # New service (replaces clothing_recommender)
│   ├── app/
│   │   ├── main.py                # FastAPI app
│   │   ├── agents/
│   │   │   ├── conversation_agent.py
│   │   │   ├── clothing_recommender_agent.py
│   │   │   └── clothing_analyzer_agent.py
│   │   ├── workflows/
│   │   │   └── main_workflow.py   # LangGraph workflow
│   │   ├── a2a/
│   │   │   └── protocol.py        # A2A protocol implementation
│   │   ├── mcp/
│   │   │   └── client.py          # MCP client for tool calls
│   │   ├── api/
│   │   │   └── v1/
│   │   │       └── endpoints/
│   │   │           └── chat.py   # Streaming endpoint
│   │   └── services/
│   │       ├── llm_service.py
│   │       └── backend_client.py  # Streams to NestJS backend
│   └── requirements.txt
│
├── mcp_servers/                   # MCP server implementations
│   ├── wardrobe_server/
│   │   ├── server.py
│   │   └── tools.py
│   ├── commerce_server/
│   │   ├── server.py
│   │   └── tools.py
│   ├── web_search_server/
│   │   ├── server.py
│   │   └── tools.py
│   ├── user_data_server/
│   │   ├── server.py
│   │   └── tools.py
│   └── style_dna_server/
│       ├── server.py
│       └── tools.py
│
└── gateway/
    └── app/
        └── routes/
            └── agent.py            # Updated to route to new service
```

---

### 10. Implementation Phases

#### Phase 1: Core Infrastructure
- [ ] Set up LangGraph workflow structure
- [ ] Implement A2A protocol
- [ ] Create MCP client library
- [ ] Set up streaming to backend

#### Phase 2: MCP Servers
- [ ] Wardrobe MCP Server
- [ ] Commerce MCP Server
- [ ] Web Search MCP Server
- [ ] User Data MCP Server
- [ ] Style DNA MCP Server

#### Phase 3: Agents
- [ ] Conversation Agent (general chat)
- [ ] Clothing Recommender Agent
- [ ] Clothing Analyzer Agent

#### Phase 4: Integration
- [ ] Integrate with backend chat API
- [ ] End-to-end testing
- [ ] Performance optimization

---

## Key Design Decisions

1. **MCP Servers for Tool Calls**: Allows agents to use tools via standardized protocol, making tools reusable across different agents.

2. **A2A Protocol**: Enables agents to communicate and coordinate, allowing for complex multi-agent workflows.

3. **LangGraph Orchestration**: Provides state management, conditional routing, and streaming capabilities.

4. **Streaming to Backend**: Maintains separation of concerns - Python engine handles AI logic, backend handles persistence.

5. **Fallback to Web Search**: Ensures users can always find items, even if not in commerce/wardrobe databases.

6. **Refinement Loop**: Analyzer can request improvements, creating a feedback loop for better results.

---

## Security Considerations

- **Authentication**: Gateway validates all requests
- **Rate Limiting**: Per user/IP limits
- **Input Sanitization**: All user inputs sanitized before LLM/tool calls
- **Tool Call Validation**: MCP servers validate all tool call parameters
- **Error Handling**: Graceful degradation if MCP servers unavailable

---

## Performance Considerations

- **Caching**: Cache user profiles, style DNA, and frequent queries
- **Parallel Tool Calls**: Agents can call multiple MCP tools in parallel
- **Streaming**: Real-time response streaming for better UX
- **Connection Pooling**: Reuse connections to MongoDB and external APIs

---

## Future Enhancements

1. **Multi-modal Input**: Support image uploads for "find similar" queries
2. **Voice Interface**: Add voice input/output support
3. **Personalization**: Learn from user interactions to improve recommendations
4. **A/B Testing**: Test different agent strategies
5. **Analytics**: Track agent performance and user satisfaction
