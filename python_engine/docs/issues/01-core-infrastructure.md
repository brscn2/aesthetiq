# Issue 1: Core Infrastructure Implementation

## Overview
Set up the foundational infrastructure for the multi-agent conversational system. This includes LangGraph workflow structure, state management, MCP client library, Langfuse tracing, session management, and backend client.

## Context
We're building a new multi-agent conversational system to replace the `clothing_recommender` service. This issue establishes the core foundation that all other components will build upon.

## Tasks

### 1. LangGraph State Management
- Create `conversational_agent/app/workflows/state.py`
- Define `ConversationState` TypedDict with all required fields:
  - Input fields (user_id, session_id, message, conversation_history)
  - Intent classification
  - Query analysis (search_scope, extracted_filters)
  - User context (user_profile, style_dna)
  - Clothing workflow state (retrieved_items, analysis_result, etc.)
  - Output fields (final_response, streaming_events)
  - Metadata (langfuse_trace_id, iteration, etc.)

### 2. MCP Client Library
- Create `conversational_agent/app/mcp/client.py`
- Implement MCP client that can:
  - Connect to MCP servers (stdio or HTTP)
  - Call tools via MCP protocol (JSON-RPC)
  - Handle errors and retries
  - Support async operations

### 3. Langfuse Tracing Service
- Create `conversational_agent/app/services/tracing/langfuse_service.py`
- Implement:
  - `start_trace()` - Create parent trace
  - `log_llm_call()` - Log LLM calls as spans
  - `log_tool_call()` - Log MCP tool calls as spans
  - `log_agent_transition()` - Log agent state changes
- Configure Langfuse with API keys from environment

### 4. Session Management Service
- Create `conversational_agent/app/services/session/session_service.py`
- Implement:
  - `load_session()` - Load or create session from backend
  - `save_message()` - Persist messages to backend
  - `format_history_for_llm()` - Format conversation history for LLM context

### 5. Backend Client
- Create `conversational_agent/app/services/backend_client.py`
- Implement HTTP client for backend chat API:
  - `create_session()` - Create new chat session
  - `get_session()` - Get session by sessionId
  - `add_message()` - Add message to session

### 6. Basic Workflow Structure
- Create `conversational_agent/app/workflows/main_workflow.py`
- Set up basic LangGraph workflow skeleton:
  - Create StateGraph with ConversationState
  - Add placeholder nodes (will be implemented in later issues)
  - Set up basic routing structure

## Testing Requirements
- Write unit tests for each service/component
- Write integration tests for:
  - MCP client connection
  - Langfuse trace creation
  - Session loading/saving
  - Backend client API calls
- All tests must pass before creating PR

## Files to Create
- `conversational_agent/app/workflows/state.py`
- `conversational_agent/app/workflows/main_workflow.py`
- `conversational_agent/app/mcp/client.py`
- `conversational_agent/app/services/tracing/langfuse_service.py`
- `conversational_agent/app/services/session/session_service.py`
- `conversational_agent/app/services/backend_client.py`
- `conversational_agent/tests/unit/test_state.py`
- `conversational_agent/tests/unit/test_mcp_client.py`
- `conversational_agent/tests/unit/test_langfuse_service.py`
- `conversational_agent/tests/unit/test_session_service.py`
- `conversational_agent/tests/integration/test_backend_client.py`

## How to Create PR
1. Create feature branch: `git checkout -b feature/core-infrastructure`
2. Implement all components
3. Write and run tests: `pytest conversational_agent/tests/ -v`
4. Verify Langfuse traces are created (check Langfuse dashboard)
5. Commit: `git commit -m "feat: implement core infrastructure"`
6. Push: `git push origin feature/core-infrastructure`
7. Create PR with:
   - Description of all components implemented
   - Test results (pytest output)
   - Screenshot of Langfuse trace (if available)
   - Checklist of completed tasks

## PR Title
`[Phase 1] Core Infrastructure Implementation`

## Dependencies
- None (this is the foundation)

## Blocks
- Issue 2 (MCP Servers)
- Issue 3 (Agents)

## Estimated Time
3-5 days
