# Issue 4: Add Safety Guardrails

## Overview
Implement input and output guardrails to ensure user safety, content moderation, and prevent inappropriate content from being processed or returned.

## Context
Guardrails protect the system from malicious inputs, inappropriate content, and ensure responses are safe and on-topic. Input guardrails validate user queries, output guardrails validate LLM responses.

## Tasks

### 1. Input Guardrails
- Create `conversational_agent/app/guardrails/input_guardrails.py`
- Implement validation for:
  - Content moderation (inappropriate content detection)
  - PII detection and redaction
  - Input length validation (max 10,000 characters)
  - Special character sanitization
  - Basic prompt injection pattern detection
- Return: `GuardrailResult` with `is_safe`, `sanitized_input`, `warnings`

### 2. Output Guardrails
- Create `conversational_agent/app/guardrails/output_guardrails.py`
- Implement validation for:
  - Content moderation of LLM responses
  - On-topic validation (ensure fashion-related)
  - Inappropriate content filtering
  - Response format validation
- Return: `GuardrailResult` with `is_safe`, `filtered_response`, `warnings`

### 3. Guardrail Base Classes
- Create `conversational_agent/app/guardrails/base.py`
- Define `GuardrailResult` dataclass
- Define base guardrail interface

### 4. Integrate Guardrails into Workflow
- Update `conversational_agent/app/workflows/main_workflow.py`
- Add input guardrails at workflow entry
- Add output guardrails:
  - After Conversation Agent
  - After Clothing Analyzer (before Response Formatter)
- Handle guardrail failures (return error response)

### 5. Test Guardrails
- Test with inappropriate content
- Test with PII in input
- Test with off-topic LLM responses
- Test with prompt injection attempts
- Verify guardrails block unsafe content
- Verify guardrails allow safe content

## Testing Requirements
- Unit tests for input guardrails:
  - Inappropriate content detection
  - PII detection
  - Length validation
  - Prompt injection patterns
- Unit tests for output guardrails:
  - Content moderation
  - On-topic validation
  - Format validation
- Integration tests:
  - Guardrails in workflow
  - Error handling when guardrails fail
- All tests must pass

## Files to Create
- `conversational_agent/app/guardrails/__init__.py`
- `conversational_agent/app/guardrails/base.py`
- `conversational_agent/app/guardrails/input_guardrails.py`
- `conversational_agent/app/guardrails/output_guardrails.py`
- `conversational_agent/tests/guardrails/test_input_guardrails.py`
- `conversational_agent/tests/guardrails/test_output_guardrails.py`
- `conversational_agent/tests/integration/test_guardrails_in_workflow.py`

## How to Create PR
1. Create feature branch: `git checkout -b feature/safety-guardrails`
2. Implement guardrails
3. Integrate into workflow
4. Write tests
5. Run tests: `pytest conversational_agent/tests/guardrails/ -v`
6. Test with various unsafe inputs/outputs
7. Commit: `git commit -m "feat: add input and output guardrails"`
8. Push: `git push origin feature/safety-guardrails`
9. Create PR with:
   - Description of guardrail implementation
   - Test results
   - Examples of blocked unsafe content
   - Checklist of completed tasks

## PR Title
`[Phase 4] Safety Guardrails Implementation`

## Dependencies
- Issue 3 (Agents and Workflow - need workflow to integrate guardrails)

## Blocks
- Issue 5 (Integration - guardrails must be in place)

## Estimated Time
3-4 days

## Notes
- Use appropriate libraries for content moderation (e.g., profanity filters, content moderation APIs)
- PII detection should redact, not block (to avoid false positives)
- On-topic validation should be lenient (fashion-related topics are broad)
