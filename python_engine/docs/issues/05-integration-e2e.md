# Issue 5: Integration and End-to-End Testing

## Overview
Integrate the conversational agent service with the backend chat API, update gateway routes, and perform comprehensive end-to-end testing of the complete system.

## Context
All components are now built. We need to connect them together, integrate with the existing backend, and verify the entire system works end-to-end from frontend to database.

## Tasks

### 1. API Endpoint Implementation
- Create `conversational_agent/app/api/v1/endpoints/chat.py`
- Implement streaming endpoint:
  - `POST /api/v1/agent/chat/stream`
  - Accept conversation request
  - Load session/history
  - Execute workflow
  - Stream events to backend
  - Save messages to backend
- Implement non-streaming endpoint (optional):
  - `POST /api/v1/agent/chat`

### 2. Backend Chat API Integration
- Ensure session service correctly calls backend API
- Test session creation
- Test session loading with history
- Test message persistence
- Verify SSE streaming works

### 3. Gateway Route Updates
- Update `gateway/app/routes/agent.py`
- Route `/api/v1/agent/chat/stream` to new conversational agent service
- Update proxy configuration
- Test routing

### 4. Docker Compose Updates
- Update `python_engine/docker-compose.yml`
- Add conversational_agent service
- Add MCP server services (or run as separate processes)
- Configure service dependencies
- Test docker-compose up

### 5. End-to-End Testing
- Test complete flow:
  - Frontend → Backend → Gateway → Agent Service → MCP Servers → Backend → Frontend
- Test scenarios:
  - General conversation
  - Simple clothing recommendation
  - Clothing with refinement loop
  - Clothing with clarification
  - Web search fallback
  - Multi-turn conversations
  - Session persistence
- Verify:
  - SSE streaming works
  - Messages persist to backend
  - History loads correctly
  - All agents work correctly
  - MCP servers respond
  - Guardrails block unsafe content
  - Langfuse traces are created

### 6. Error Handling
- Test error scenarios:
  - MCP server unavailable
  - MongoDB connection failure
  - LLM API failure
  - Backend API failure
- Verify graceful degradation
- Verify error messages are user-friendly

## Testing Requirements
- Integration tests for API endpoints
- Integration tests for backend client
- End-to-end tests for complete flows
- Error handling tests
- Performance tests (response times)
- All tests must pass

## Files to Create/Modify
- `conversational_agent/app/api/v1/endpoints/chat.py` (new)
- `conversational_agent/app/main.py` (new - FastAPI app)
- `gateway/app/routes/agent.py` (modify)
- `python_engine/docker-compose.yml` (modify)
- `conversational_agent/tests/e2e/test_complete_flow.py` (new)
- `conversational_agent/tests/e2e/test_error_handling.py` (new)

## How to Create PR
1. Create feature branch: `git checkout -b feature/integration-e2e`
2. Implement API endpoints
3. Update gateway and docker-compose
4. Write E2E tests
5. Run all tests: `pytest conversational_agent/tests/ -v`
6. Test manually with frontend
7. Commit: `git commit -m "feat: integration and e2e testing"`
8. Push: `git push origin feature/integration-e2e`
9. Create PR with:
   - Description of integration
   - E2E test results
   - Screenshots of working system
   - Performance metrics
   - Checklist of completed tasks

## PR Title
`[Phase 5] Integration and End-to-End Testing`

## Dependencies
- Issue 1 (Core Infrastructure)
- Issue 2 (MCP Servers)
- Issue 3 (Agents and Workflow)
- Issue 4 (Guardrails)

## Blocks
- Issue 6 (Performance Optimization)

## Estimated Time
5-7 days

## Notes
- E2E tests should use test data, not production data
- Verify SSE streaming works correctly (no connection drops)
- Test with real frontend if possible
- Document any issues found for Issue 6
