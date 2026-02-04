# Architecture Decision: Looping Strategy & Interrupt Implementation

## Executive Summary

**Recommendation**: Keep the current **HTTP-layer orchestration** with a **linear LangGraph**. This approach is better suited for your conversational fashion assistant use case.

---

## Table of Contents

1. [Current Architecture Analysis](#current-architecture-analysis)
2. [Concern 1: Looping Strategy](#concern-1-looping-strategy)
3. [Concern 2: Interrupt Implementation](#concern-2-interrupt-implementation)
4. [Recommendation Summary](#recommendation-summary)
5. [Action Items](#action-items)

---

## Current Architecture Analysis

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ chat-stylist.tsx                                                    │   │
│  │ - Manages local messages state                                      │   │
│  │ - Currently uses setTimeout (mock) - no real API integration yet    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (NestJS - Port 3001)                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ChatService (MongoDB)                                               │   │
│  │ - Persists ChatSession with messages array                          │   │
│  │ - No connection to Python engine yet                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      PYTHON ENGINE (Gateway - Port 8000)                    │
│  ┌───────────────┐    ┌────────────────────────────────────────────────┐   │
│  │    Gateway    │───▶│  Clothing Recommender (Port 8002)              │   │
│  │               │    │  ┌──────────────────────────────────────────┐  │   │
│  │               │    │  │ LangGraphService                         │  │   │
│  │               │    │  │ ┌────────┐   ┌──────────┐   ┌─────┐     │  │   │
│  │               │    │  │ │classify│──▶│clothing/ │──▶│ END │     │  │   │
│  │               │    │  │ │        │   │general   │   │     │     │  │   │
│  │               │    │  │ └────────┘   └──────────┘   └─────┘     │  │   │
│  │               │    │  │                                          │  │   │
│  │               │    │  │ NO CHECKPOINTER - Stateless per request  │  │   │
│  │               │    │  └──────────────────────────────────────────┘  │   │
│  └───────────────┘    └────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Current LangGraph Workflow

From `langgraph_service.py`:

```python
def create_conversation_workflow(self) -> StateGraph:
    workflow = StateGraph(ConversationState)
    
    workflow.add_node("classify", self._classify_intent)
    workflow.add_node("clothing", self._handle_clothing_query)
    workflow.add_node("general", self._handle_general_conversation)
    
    workflow.set_entry_point("classify")
    
    workflow.add_conditional_edges(
        "classify",
        self._route_decision,
        {"clothing": "clothing", "general": "general"}
    )
    
    workflow.add_edge("clothing", END)
    workflow.add_edge("general", END)
    
    return workflow.compile()
```

**Key observations:**
- Linear graph with single pass (classify → handle → END)
- No checkpointer configured (stateless)
- No internal loops for multi-agent handoffs

---

## Concern 1: Looping Strategy

### The Question

> Should we implement an internal loop within the LangGraph (cyclic graph) to handle multi-agent handoffs, or is it more efficient to keep the graph linear and rely on the external HTTP layer to re-invoke the system for each step?

### Option A: HTTP-Layer Orchestration (Current Approach)

Each user message is an independent HTTP request. Conversation context is passed via the `context` field.

```python
# Each request is independent
POST /api/v1/agent/chat
{
    "message": "Semi-formal",
    "user_id": "user_123",
    "session_id": "sess_abc",
    "context": {
        "history": [
            {"role": "user", "content": "What should I wear for a wedding?"},
            {"role": "assistant", "content": "What's the dress code?"}
        ],
        "collected_info": {
            "occasion": "wedding",
            "awaiting": "dress_code"
        }
    }
}
```

#### Pros

| Advantage | Description |
|-----------|-------------|
| **Statelessness** | Python service is stateless, easy to scale horizontally |
| **Natural pause points** | User can take 5 minutes to respond, no timeout issues |
| **Easy recovery** | If service restarts, no in-memory state is lost |
| **Frontend control** | User can cancel by simply not responding |
| **Observability** | Every HTTP request is logged, traced, debuggable |
| **Simpler infrastructure** | No Redis/PostgreSQL checkpointing needed in Python |

#### Cons

| Disadvantage | Description |
|--------------|-------------|
| **Context size grows** | Full history passed each time (already happening) |
| **Client complexity** | Frontend must manage conversation state |
| **Network overhead** | More HTTP round-trips |

### Option B: Internal Loop (LangGraph Cyclic Graph)

Single request, agent loops internally until complete or needs human input.

```python
# Would require checkpointing
from langgraph.checkpoint.postgres import PostgresSaver

checkpointer = PostgresSaver.from_conn_string("postgresql://...")
workflow = create_workflow().compile(checkpointer=checkpointer)

# First invocation - pauses at human input node
config = {"configurable": {"thread_id": session_id}}
result = await workflow.ainvoke(initial_state, config)
# Returns: {"status": "waiting_for_human", "question": "What's the dress code?"}

# Second invocation - resume with human response  
result = await workflow.ainvoke({"human_response": "Semi-formal"}, config)
```

#### Pros

| Advantage | Description |
|-----------|-------------|
| **Single session abstraction** | All state managed by LangGraph |
| **Cleaner agent logic** | Agent doesn't need to parse history |
| **Atomic multi-step operations** | Good for autonomous agents |

#### Cons

| Disadvantage | Description |
|--------------|-------------|
| **Requires persistent checkpointing** | Need PostgresSaver or similar |
| **Timeout complexity** | HTTP request can't wait indefinitely for human |
| **Still need multiple HTTP calls** | One per human response |
| **More complex debugging** | State is inside LangGraph, harder to inspect |
| **Infrastructure overhead** | Need to maintain checkpointer database |

### The Fundamental Problem with Internal Loops

LangGraph loops are designed for **agent-internal iteration** (e.g., calling tools repeatedly), NOT for **human-in-the-loop** multi-turn conversations.

For human interaction with internal loops, you need:
1. A checkpointer (PostgresSaver, SqliteSaver, or RedisSaver)
2. Human input nodes that pause execution
3. Resume logic to continue from checkpointed state

This adds significant complexity for minimal benefit in a conversational UI.

### Recommendation for Looping Strategy

**Keep HTTP-layer orchestration** because:

1. **User pace**: Fashion decisions aren't urgent - users browse, think, respond minutes later
2. **No autonomous loops needed**: You're not booking flights or executing trades
3. **Frontend already handles state**: React `useState` manages messages, backend persists to MongoDB
4. **Backend owns persistence**: `ChatSession.messages[]` in MongoDB already tracks history
5. **Simpler debugging**: Each request is independent and traceable

---

## Concern 2: Interrupt Implementation

### The Question

> If we choose to use an internal loop within the graph, how can we implement an 'interrupt' mechanism to handle long-running processes?

### Case 1: Short-lived Operations (< 30 seconds)

Your current `/chat` endpoint calls LLM and returns response.

**If user cancels:**
- Browser aborts HTTP request
- Server may or may not notice (depends on when check happens)
- LLM call completes anyway (you pay for tokens), response is discarded

**No special handling needed** - this is acceptable behavior.

### Case 2: Streaming Responses (Current `/chat/stream`)

Your SSE implementation already supports natural cancellation:

**Frontend implementation (to be added):**
```typescript
const eventSource = new EventSource('/api/v1/agent/chat/stream');
eventSource.onmessage = (e) => { 
    const event = JSON.parse(e.data);
    // Handle chunks, status updates, etc.
};

// Cancel button handler
cancelButton.onclick = () => {
    eventSource.close();  // Closes SSE connection
};
```

**Server side (already works):**
```python
async def event_generator():
    try:
        async for event in agent.stream_message(...):
            yield f"data: {json.dumps(event.to_dict())}\n\n"
    except asyncio.CancelledError:
        logger.info("Client disconnected, stopping stream")
        raise
```

FastAPI automatically handles client disconnect - **no special interrupt mechanism needed**.

### Case 3: Long-Running Internal Loop (Hypothetical Future)

If you add features requiring 2+ minute processing (e.g., searching multiple stores, generating multiple outfits):

#### Option A: Redis-based Cancellation (Recommended if needed)

```python
import redis.asyncio as redis

redis_client = redis.from_url("redis://localhost:6379")

async def check_cancellation(session_id: str) -> bool:
    return await redis_client.get(f"cancel:{session_id}") == b"1"

async def _research_outfit(state):
    for step in range(10):
        # Check for cancellation at each step
        if await check_cancellation(state["session_id"]):
            state["cancelled"] = True
            state["response"] = "Operation cancelled by user."
            return state
        await do_expensive_operation(step)
    return state

# Cancel endpoint
@router.post("/chat/{session_id}/cancel")
async def cancel_chat(session_id: str):
    await redis_client.set(f"cancel:{session_id}", "1", ex=60)
    return {"status": "cancellation_requested"}
```

#### Option B: In-memory Cancellation (Single Instance Only)

```python
from typing import Dict
import asyncio

# Store in app.state during lifespan
cancel_events: Dict[str, asyncio.Event] = {}

async def _research_outfit(state, cancel_event: asyncio.Event):
    for step in range(10):
        if cancel_event.is_set():
            state["cancelled"] = True
            return state
        await do_expensive_operation(step)
    return state

@router.post("/chat/{session_id}/cancel")
async def cancel_chat(request: Request, session_id: str):
    cancel_events = request.app.state.cancel_events
    if session_id in cancel_events:
        cancel_events[session_id].set()
    return {"status": "cancellation_requested"}
```

#### Option C: LangGraph Interrupt (If Using Checkpointer)

```python
from langgraph.graph import interrupt

async def _research_outfit(state):
    for step in range(10):
        result = await do_expensive_operation(step)
        # Checkpoint after each step - can resume from here
        if needs_user_confirmation(result):
            interrupt("Pausing for user confirmation")
    return state
```

### Recommendation for Interrupt Implementation

| Scenario | Solution | Implementation Needed |
|----------|----------|----------------------|
| Short LLM calls (<30s) | Let complete or abort HTTP | None (current works) |
| Streaming responses | Close SSE connection | Frontend `eventSource.close()` |
| Long-running loops | Redis-based cancellation | Add if feature needed |

**For your current use case**: No special interrupt mechanism is needed. SSE connection close handles streaming cancellation.

---

## Recommendation Summary

| Aspect | Current State | Recommendation |
|--------|---------------|----------------|
| **Loop location** | Linear graph, HTTP orchestration | ✅ **Keep it** - fits conversational UI |
| **State persistence** | MongoDB (backend), none (Python) | ✅ **Good** - let backend own state |
| **Streaming cancellation** | SSE connection close | ✅ **Already works** |
| **Long-running interrupt** | Not implemented | ⏸️ Add Redis-based if needed later |
| **Multi-agent handoff** | Single router → agent | ✅ **Sufficient** for fashion domain |
| **Checkpointer** | None | ⏸️ Not needed for current use case |

---

## Action Items

### Immediate (Required)

1. **Connect frontend to real chat endpoint**
   - Replace `setTimeout` mock in `chat-stylist.tsx` with actual API calls
   - Use `/api/v1/agent/chat` or `/api/v1/agent/chat/stream`

2. **Pass conversation history to Python engine**
   - Add `context.history` to requests
   - Backend should fetch from MongoDB and include in request

3. **Add SSE support to frontend**
   - Use `EventSource` for streaming responses
   - Implement "Stop generating" button with `eventSource.close()`

### Future (If Features Require)

4. **Add Redis for cancellation** (if you add long-running operations)
   - Add Redis to `docker-compose.yml`
   - Implement cancellation endpoint and cooperative checking

5. **Consider checkpointing** (if you add autonomous multi-step agents)
   - Add PostgresSaver to LangGraph
   - Implement human-in-the-loop nodes

---

## When to Reconsider This Decision

Switch to internal loops + checkpointing IF you add:

- ❌ Autonomous features (e.g., "Search 10 stores and find best price")
- ❌ Tool-use loops (e.g., RAG with iterative refinement)  
- ❌ Guaranteed exactly-once execution of multi-step transactions
- ❌ Complex multi-agent workflows that must complete atomically

For a **conversational fashion assistant** that recommends outfits based on user input, the **HTTP-layer approach** with frontend state management is:

- ✅ Simpler to implement
- ✅ Easier to debug
- ✅ More user-friendly (natural conversation pace)
- ✅ More scalable (stateless services)

---

## References

- [LangGraph Persistence Documentation](https://langchain-ai.github.io/langgraph/concepts/persistence/)
- [LangGraph Human-in-the-Loop](https://langchain-ai.github.io/langgraph/concepts/human_in_the_loop/)
- [FastAPI SSE Streaming](https://fastapi.tiangolo.com/advanced/custom-response/#streamingresponse)

---

*Document created: December 18, 2025*  
*Last updated: December 18, 2025*
