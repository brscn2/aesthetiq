# Multi-Agent Conversational System Architecture

## Overview

This document describes the new multi-agent conversational system that replaces the `clothing_recommender` service. The system uses **LangGraph** for orchestration with shared state management for inter-agent communication, **MCP (Model Context Protocol) servers** for tool calls, **input/output guardrails** for safety, and **Langfuse** for comprehensive LLM call tracing.

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

#### 2.2 Workflow Nodes

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
- `search_wardrobe_items(query: str, user_id: str, filters: Dict) -> List[Item]`
  - Semantic search in user's wardrobe
  - Uses embeddings + metadata filtering
  - Requires user_id for user-specific searches
- `get_wardrobe_item(item_id: str, user_id: str) -> Item`
  - Get specific item details
  - Requires user_id for authorization
- `filter_wardrobe_items(user_id: str, filters: Dict) -> List[Item]`
  - Filter by category, color, brand, etc.
  - Requires user_id for user-specific filtering

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
- `search_commerce_items(query: str, style_dna: StyleDNA, filters: Dict) -> List[Item]`
  - Semantic search in commerce embedding space
  - Filters by user's style DNA for relevance
  - Uses style DNA to rank results
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

### 5. LangGraph State Management (Agent Communication)

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

### 6. Session Management and Chat History

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

### 7. Input and Output Guardrails

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

### 8. Langfuse Tracing

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

### 9. Data Flow Examples

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

### 10. Streaming Architecture

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

### 11. Technology Stack

| Component | Technology |
|-----------|-----------|
| **Orchestration** | LangGraph |
| **LLM** | OpenAI GPT-4 / Anthropic Claude |
| **Agent Communication** | LangGraph State Management (shared state) |
| **Tool Protocol** | MCP (Model Context Protocol) |
| **Web Search** | Tavily API / Google Custom Search |
| **Database** | MongoDB (Wardrobe, Commerce, User Profiles) |
| **Embeddings** | CLIP (via Embedding Service) |
| **Streaming** | Server-Sent Events (SSE) |
| **Backend Integration** | HTTP POST to NestJS Chat API |
| **Tracing** | Langfuse |
| **Guardrails** | Custom input/output validation |

---

### 12. File Structure

```
python_engine/
├── conversational_agent/          # New service (replaces clothing_recommender)
│   ├── app/
│   │   ├── main.py                # FastAPI app
│   │   ├── agents/
│   │   │   ├── __init__.py
│   │   │   ├── conversation_agent.py
│   │   │   ├── clothing_recommender_agent.py   # Includes refinement filter parsing
│   │   │   └── clothing_analyzer_agent.py
│   │   ├── workflows/
│   │   │   ├── __init__.py
│   │   │   ├── main_workflow.py   # LangGraph workflow with clarification handling
│   │   │   ├── state.py           # ConversationState + helper functions
│   │   │   └── nodes/
│   │   │       ├── __init__.py
│   │   │       ├── intent_classifier.py
│   │   │       ├── query_analyzer.py
│   │   │       └── response_formatter.py
│   │   ├── guardrails/
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── input_guardrails.py
│   │   │   └── output_guardrails.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── llm_service.py
│   │   │   ├── tracing/
│   │   │   │   ├── __init__.py
│   │   │   │   └── langfuse_service.py
│   │   │   ├── session/
│   │   │   │   ├── __init__.py
│   │   │   │   └── session_service.py
│   │   │   └── backend_client.py  # HTTP client for backend chat API
│   │   ├── mcp/
│   │   │   ├── __init__.py
│   │   │   ├── client.py          # MCP client manager
│   │   │   └── tools.py           # MCP tool initialization
│   │   ├── api/
│   │   │   └── v1/
│   │   │       └── endpoints/
│   │   │           ├── chat.py    # Streaming endpoint
│   │   │           └── health.py  # Health check
│   │   └── core/
│   │       ├── config.py
│   │       └── logger.py
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── guardrails/
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

### 13. Implementation Phases

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
