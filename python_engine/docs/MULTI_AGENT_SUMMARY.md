# Multi-Agent System - Executive Summary

## 🎯 System Overview

This document provides a high-level summary of the new multi-agent conversational system that will replace the `clothing_recommender` service.

---

## 🏗️ Architecture at a Glance

```
User Query
    ↓
Gateway (Auth + Rate Limit)
    ↓
LangGraph Workflow Engine
    ├─→ General Conversation Agent (fashion advice, trends)
    └─→ Clothing Recommendation Workflow
         ├─→ Clothing Recommender Agent (finds items)
         ├─→ Clothing Analyzer Agent (validates items)
         └─→ Response Formatter (streams to backend)
    ↓
Backend Chat API (persists to DB)
    ↓
Frontend (displays to user)
```

---

## 🤖 Three Main Agents

### 1. **Conversation Agent** (General Fashion Chat)
- **Purpose:** Handles general fashion questions
- **Capabilities:**
  - Fashion advice and tips
  - Latest trends discussion
  - Fashion expert blogs/articles
  - Color theory explanations
- **Tools Used:**
  - Web Search MCP (for trends/blogs)
  - Style DNA MCP (for personalized advice)

### 2. **Clothing Recommender Agent** (Finds Items)
- **Purpose:** Intelligently retrieves clothing items
- **Key Features:**
  - Understands complex queries
  - Searches commerce, wardrobe, or both
  - Uses user's style DNA for relevance
  - Falls back to web search if needed
- **Tools Used:**
  - Wardrobe MCP (user's virtual wardrobe)
  - Commerce MCP (retail items)
  - Web Search MCP (fallback)
  - User Data MCP (profile)
  - Style DNA MCP (color season, archetype)

### 3. **Clothing Analyzer Agent** (Validates Items)
- **Purpose:** Ensures retrieved items are relevant
- **Decision Logic:**
  - ✅ **APPROVE** - Items are good, proceed
  - 🔄 **REFINE** - Add notes, search again
  - ❓ **CLARIFY** - Ask user for more info

---

## 🔌 MCP Servers (Tool Providers)

**MCP (Model Context Protocol)** servers provide tools that agents can call.

| Server | Purpose | Key Tools |
|--------|---------|-----------|
| **Wardrobe MCP** | Search user's virtual wardrobe | `search_wardrobe_items()`, `get_item()` |
| **Commerce MCP** | Search retail clothing items | `search_commerce_items()`, `filter_items()` |
| **Web Search MCP** | Search external sources | `web_search()`, `search_trends()`, `search_blogs()` |
| **User Data MCP** | Get user profile/preferences | `get_user_profile()`, `get_wardrobe()` |
| **Style DNA MCP** | Get style analysis | `get_style_dna()`, `get_color_season()` |

**Why MCP?**
- Standardized protocol for tool calls
- Tools can be reused by different agents
- Easy to add new tools
- Can be used by external agents too

---

## 🔄 A2A Protocol (Agent-to-Agent Communication)

**A2A (Agent-to-Agent)** protocol enables agents to communicate and coordinate.

**Example Flow:**
```
Clothing Recommender Agent
    ↓ (A2A message)
Clothing Analyzer Agent
    ↓ (A2A response)
Clothing Recommender Agent (retry if needed)
```

**Message Types:**
- `request_analysis` - Analyzer, please analyze these items
- `analysis_result` - Here's my analysis (approve/refine/clarify)
- `refinement_request` - Please search again with these notes
- `clarification_request` - User needs to provide more info

---

## 📊 Workflow States

The LangGraph workflow maintains state throughout execution:

```python
{
    "user_id": "user_123",
    "session_id": "session_abc",
    "message": "Find me jackets",
    "intent": "clothing",
    "user_profile": {...},
    "style_dna": {...},
    "retrieved_items": [...],
    "analysis_result": {...},
    "final_response": "...",
    "metadata": {...}
}
```

---

## 🔀 Decision Points

### 1. **Intent Classification**
```
User Query → Intent Classifier
    ├─→ "general" → Conversation Agent
    └─→ "clothing" → Clothing Workflow
```

### 2. **Search Scope Determination**
```
Clothing Query → Query Analyzer
    ├─→ "buy new" → Commerce only
    ├─→ "use my clothes" → Wardrobe only
    └─→ "combine" → Both commerce + wardrobe
```

### 3. **Analysis Decision**
```
Retrieved Items → Analyzer Agent
    ├─→ Items match → APPROVE → Return to user
    ├─→ Items don't match → REFINE → Retry search
    └─→ Query unclear → CLARIFY → Ask user
```

---

## 🌊 Example Flows

### Flow 1: General Fashion Question
```
User: "What are the latest fashion trends?"
    ↓
Intent: "general"
    ↓
Conversation Agent
    ├─→ Web Search MCP: search_trends()
    └─→ Style DNA MCP: get_style_dna()
    ↓
LLM generates response
    ↓
Stream to user
```

### Flow 2: Simple Clothing Recommendation
```
User: "I need a jacket for a job interview"
    ↓
Intent: "clothing"
    ↓
Query Analyzer: commerce search needed
    ↓
Clothing Recommender Agent
    ├─→ User Data MCP: get_profile()
    ├─→ Style DNA MCP: get_style_dna()
    └─→ Commerce MCP: search_items("jacket", style_dna)
    ↓
Clothing Analyzer Agent
    ├─→ Analyzes: Are jackets formal enough?
    └─→ Decision: APPROVE
    ↓
Response Formatter
    ↓
Stream to user
```

### Flow 3: Refinement Loop
```
User: "Find me jackets"
    ↓
Clothing Recommender: Returns 5 jackets
    ↓
Clothing Analyzer: Only 2/5 match style DNA
    ↓
Decision: REFINE
    ↓
Notes: "Need warm autumn colors, more formal"
    ↓
Clothing Recommender: Retry with notes
    ↓
Returns 3 better jackets
    ↓
Clothing Analyzer: All 3 match
    ↓
Decision: APPROVE
    ↓
Stream to user
```

### Flow 4: Web Search Fallback
```
User: "Find me a specific brand jacket"
    ↓
Commerce MCP: No results
Wardrobe MCP: No results
    ↓
Fallback: Web Search MCP
    ↓
Returns external product links
    ↓
Analyzer: APPROVE (with note about external source)
    ↓
Stream to user
```

---

## 🚀 Key Advantages

1. **Modularity**: Each agent has a specific role
2. **Reusability**: MCP tools can be used by any agent
3. **Flexibility**: Easy to add new agents or tools
4. **Intelligence**: Analyzer ensures quality results
5. **Fallback**: Web search ensures users always get results
6. **Streaming**: Real-time updates for better UX

---

## 🔐 Security & Performance

- **Authentication**: Gateway validates all requests
- **Rate Limiting**: Per user/IP limits
- **Input Sanitization**: All inputs sanitized
- **Caching**: Cache user profiles and style DNA
- **Parallel Calls**: Agents can call multiple tools simultaneously
- **Error Handling**: Graceful degradation if services unavailable

---

## 📁 File Structure Preview

```
conversational_agent/
├── app/
│   ├── agents/
│   │   ├── conversation_agent.py
│   │   ├── clothing_recommender_agent.py
│   │   └── clothing_analyzer_agent.py
│   ├── workflows/
│   │   └── main_workflow.py
│   ├── a2a/
│   │   └── protocol.py
│   ├── mcp/
│   │   └── client.py
│   └── api/
│       └── v1/
│           └── endpoints/
│               └── chat.py

mcp_servers/
├── wardrobe_server/
├── commerce_server/
├── web_search_server/
├── user_data_server/
└── style_dna_server/
```

---

## 🎓 Next Steps

1. **Review Architecture**: Understand the flow and components
2. **Set Up Infrastructure**: LangGraph, MCP protocol, A2A protocol
3. **Build MCP Servers**: Start with Wardrobe and Commerce
4. **Implement Agents**: Build agents one by one
5. **Integrate**: Connect to backend and test end-to-end

---

## 📚 Related Documents

- `MULTI_AGENT_ARCHITECTURE.md` - Detailed architecture documentation
- `MULTI_AGENT_FLOW_DIAGRAM.md` - Visual flow diagrams

---

## ❓ FAQ

**Q: Why use MCP instead of direct function calls?**
A: MCP provides a standardized protocol, making tools reusable and allowing external agents to use them too.

**Q: How does A2A differ from regular function calls?**
A: A2A is a protocol for agent-to-agent communication, allowing agents to coordinate and share context in a structured way.

**Q: What happens if an MCP server is down?**
A: The system gracefully degrades - agents can continue with available tools or return appropriate error messages.

**Q: Can we add more agents later?**
A: Yes! The LangGraph workflow is extensible - just add new nodes and routes.

**Q: How does streaming work?**
A: LangGraph streams events as they happen, which are forwarded through Gateway → Backend → Frontend as SSE.
