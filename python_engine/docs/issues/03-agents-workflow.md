# Issue 3: Create and Define Agents, Test Workflow with Langfuse

**STATUS: IMPLEMENTED** ✅

## Overview
Implement all agents (Conversation Agent, Clothing Recommender Agent, Clothing Analyzer Agent) and the Query Analyzer Node. Assemble the complete LangGraph workflow and integrate Langfuse tracing. Test the workflow end-to-end and share Langfuse traces in the PR.

## Context
Agents are the core intelligence of the system. They use MCP servers to retrieve data and LLMs to make decisions. The workflow orchestrates agent interactions using LangGraph state management.

## Implementation Notes (Post-Implementation)

The workflow has been enhanced with multi-turn clarification support:

### New Workflow Nodes Added:
- **check_clarification**: Entry node that detects if this is a clarification response
- **merge_clarification**: Merges user's clarification into existing filters
- **save_clarification**: Saves context before sending clarification question

### New State Fields:
- `workflow_status`: "active" | "awaiting_clarification" | "completed"
- `is_clarification_response`: True when user is responding to clarification
- `pending_clarification_context`: Saves filters, items, iteration for resumption

### Key Fixes Applied:
1. **Clarification Routing**: Changed from looping back to query_analyzer (infinite loop) to routing through save_clarification → response_formatter
2. **Refinement Notes Parsing**: Added `parse_refinement_notes_to_filters()` to extract structured filters from refinement notes
3. **Analyzer Approval Priority**: Fixed `route_after_analysis` to respect analyzer's approval decision over max_iterations check

## Tasks

### 1. Intent Classifier Node
- Create `conversational_agent/app/workflows/nodes/intent_classifier_node.py`
- Implement:
  - Analyze user message to determine intent (general or clothing)
  - Use LLM to classify intent
  - Handle edge cases (unclear intent)
- Write to state: `intent`
- Add Langfuse tracing

### 2. Query Analyzer Node
- Create `conversational_agent/app/workflows/nodes/query_analyzer_node.py`
- Implement:
  - Analyze user query to determine search scope (commerce/wardrobe/both)
  - Extract filters (category, subCategory, brand, colorHex)
  - Use LLM to understand query intent
- Write to state: `search_scope`, `extracted_filters`
- Add Langfuse tracing

### 3. Conversation Agent
- Create `conversational_agent/app/agents/conversation_agent.py`
- Implement:
  - Handle general fashion questions
  - Use Web Search MCP for trends/blogs
  - Use Style DNA MCP for personalized advice
  - Generate natural language responses
- Read from state: `message`, `conversation_history`, `style_dna`
- Write to state: `final_response`
- Add Langfuse tracing

### 4. Clothing Recommender Agent
- Create `conversational_agent/app/agents/clothing_recommender_agent.py`
- Implement:
  - Fetch user context (User Data MCP, Style DNA MCP)
  - Search based on scope (Wardrobe MCP, Commerce MCP, or both)
  - Fallback to Web Search MCP if no results
  - Combine and rank results
- Read from state: `message`, `search_scope`, `refinement_notes`
- Write to state: `retrieved_items`, `user_profile`, `style_dna`
- Add Langfuse tracing

### 5. Clothing Analyzer Agent
- Create `conversational_agent/app/agents/clothing_analyzer_agent.py`
- Implement:
  - Analyze retrieved items against query and style DNA
  - Make decision: APPROVE, REFINE, or CLARIFY
  - Generate refinement notes if needed
  - Generate clarification question if needed
- Read from state: `retrieved_items`, `message`, `style_dna`
- Write to state: `analysis_result`, `refinement_notes`, `needs_clarification`
- Add Langfuse tracing

### 6. Response Formatter Node
- Create `conversational_agent/app/workflows/nodes/response_formatter_node.py`
- Implement:
  - Format final response with clothing items
  - Add styling tips and explanations
  - Prepare streaming events
- Write to state: `final_response`, `streaming_events`

### 7. Complete Workflow Assembly
- Update `conversational_agent/app/workflows/main_workflow.py`
- Assemble complete workflow:
  - Input Guardrails → Intent Classifier → Route to General or Clothing
  - General path: Conversation Agent → Output Guardrails → Response Formatter
  - Clothing path: Query Analyzer → Scope Decision → Recommender → Results Check → Analyzer → Output Guardrails → Response Formatter
  - Implement conditional routing based on state
  - Implement refinement loop (Analyzer → Recommender, max 3 iterations)
  - Implement clarification loop (Analyzer → Query Analyzer)
- Add Langfuse tracing at workflow level

### 8. Test Workflow
- Create test queries for each workflow path
- Test general conversation flow
- Test clothing recommendation flow
- Test refinement loop
- Test clarification flow
- Test web search fallback
- Verify Langfuse traces capture all steps

## Testing Requirements
- Unit tests for each agent (mock LLM, mock MCP clients)
- Integration tests for workflow (real MCP servers, test LLM calls)
- Test all workflow paths:
  - General conversation
  - Simple clothing recommendation
  - Clothing with refinement
  - Clothing with clarification
  - Web search fallback
- Verify Langfuse traces show complete workflow execution
- All tests must pass

## Files to Create
- `conversational_agent/app/workflows/nodes/intent_classifier_node.py`
- `conversational_agent/app/workflows/nodes/query_analyzer_node.py`
- `conversational_agent/app/agents/conversation_agent.py`
- `conversational_agent/app/agents/clothing_recommender_agent.py`
- `conversational_agent/app/agents/clothing_analyzer_agent.py`
- `conversational_agent/app/workflows/nodes/response_formatter_node.py`
- `conversational_agent/tests/unit/test_agents.py`
- `conversational_agent/tests/integration/test_workflow.py`

## How to Create PR
1. Create feature branch: `git checkout -b feature/agents-workflow`
2. Implement all agents and workflow
3. Write tests
4. Run tests: `pytest conversational_agent/tests/ -v`
5. Test workflow with sample queries
6. Capture Langfuse trace screenshots for:
   - General conversation flow
   - Clothing recommendation flow
   - Refinement loop
7. Commit: `git commit -m "feat: implement agents and workflow"`
8. Push: `git push origin feature/agents-workflow`
9. Create PR with:
   - Description of all agents and workflow
   - Test results
   - **Langfuse trace screenshots/links** (required)
   - Example workflow executions
   - Checklist of completed components

## PR Title
`[Phase 3] Agents and Workflow Implementation with Langfuse`

## Dependencies
- Issue 1 (Core Infrastructure)
- Issue 2 (MCP Servers)

## Blocks
- Issue 4 (Guardrails)
- Issue 5 (Integration)

## Estimated Time
7-10 days

## Notes
- Langfuse traces are critical for this PR - ensure all agent calls, tool calls, and state transitions are traced
- Share trace links or screenshots showing complete workflow execution
- Test with real LLM calls (use test API keys)
