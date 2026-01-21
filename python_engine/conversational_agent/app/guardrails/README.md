# Safety Guardrails

This module provides a generic safety guardrails system that supports multiple providers (llm-guard, langkit, etc.) for input and output validation.

## Overview

The guardrails system is designed to:
- Validate user inputs before processing
- Validate LLM outputs before returning to users
- Support multiple guardrail providers simultaneously
- Be configurable via environment variables
- Provide a simple, generic interface

## Architecture

### Core Components

1. **`base.py`**: Base classes and data structures
   - `GuardrailResult`: Result dataclass with safety status, sanitized content, warnings, and risk score
   - `GuardrailProvider`: Abstract base class for provider implementations

2. **`safety_guardrails.py`**: Main generic class
   - `SafetyGuardrails`: Orchestrates multiple providers
   - `get_safety_guardrails()`: Factory function to get singleton instance

3. **`providers/`**: Provider implementations
   - `base_provider.py`: Base provider with common functionality (length validation, basic sanitization)
   - `llm_guard_provider.py`: LLM Guard implementation
   - `langkit_provider.py`: LangKit/WhyLabs implementation

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Guardrails Configuration
GUARDRAIL_PROVIDERS=llm-guard  # Options: "llm-guard", "langkit", or "llm-guard,langkit" (comma-separated)
GUARDRAIL_MAX_INPUT_LENGTH=10000
GUARDRAIL_MAX_OUTPUT_LENGTH=50000

# LLM Guard Configuration (if using llm-guard)
LLM_GUARD_INPUT_SCANNERS=prompt_injection,toxicity,pii  # Comma-separated list
LLM_GUARD_OUTPUT_SCANNERS=toxicity,relevance,pii  # Comma-separated list
LLM_GUARD_THRESHOLD=0.5  # Risk threshold (0.0 to 1.0)

# LangKit Configuration (if using langkit)
WHYLABS_API_KEY=your_whylabs_api_key  # Optional, for cloud features
LANGKIT_TOXICITY_THRESHOLD=0.5
LANGKIT_PII_ENABLED=true  # "true" or "false"
```

### Available LLM Guard Scanners

**Input Scanners:**
- `prompt_injection`: Detects prompt injection attempts
- `toxicity`: Detects toxic/inappropriate content
- `ban_topics`: Blocks specific topics (violence, hate, self-harm)
- `pii`: Detects and redacts personally identifiable information

**Output Scanners:**
- `toxicity`: Detects toxic/inappropriate content in responses
- `relevance`: Checks if response is relevant to the prompt
- `ban_topics`: Blocks specific topics
- `pii`: Detects and redacts PII in responses

## Usage

### In Workflow Nodes

The guardrails are already integrated into the workflow:

```python
from app.guardrails import get_safety_guardrails

# Get guardrails instance
guardrails = get_safety_guardrails()

# Check input
result = guardrails.check_input(user_message)
if not result.is_safe:
    # Handle unsafe input
    return error_response

# Use sanitized input
sanitized_message = result.sanitized_content

# Check output (currently not used in workflow, but available)
result = guardrails.check_output(prompt, llm_response)
if not result.is_safe:
    # Handle unsafe output
    pass
```

### Direct Usage

```python
from app.guardrails import SafetyGuardrails

# Create instance with specific providers
guardrails = SafetyGuardrails(
    providers=["llm-guard", "langkit"],
    max_input_length=10000,
    max_output_length=50000,
)

# Check input
result = guardrails.check_input("User input text")
print(f"Safe: {result.is_safe}")
print(f"Risk Score: {result.risk_score}")
print(f"Warnings: {result.warnings}")
print(f"Sanitized: {result.sanitized_content}")

# Check output
result = guardrails.check_output("Original prompt", "LLM response")
```

## How It Works

1. **Provider Selection**: Providers are determined from `GUARDRAIL_PROVIDERS` env var
2. **Multiple Providers**: If multiple providers are specified, ALL must pass for content to be safe
3. **Risk Scoring**: Each provider returns a risk score (0.0 to 1.0); the highest score is used
4. **Sanitization**: Providers can sanitize/filter content; the most restrictive sanitization is applied
5. **Warnings**: All warnings from all providers are collected

## Current Implementation Status

- ✅ **Input Guardrails**: Fully implemented and active in workflow
- ✅ **Output Guardrails**: Implemented but not used in workflow (per requirements)
- ✅ **LLM Guard Provider**: Fully implemented
- ✅ **LangKit Provider**: Implemented (basic metrics, can be extended)
- ✅ **Generic Interface**: Complete with multi-provider support

## Installation

To use LLM Guard:
```bash
pip install llm-guard
```

To use LangKit:
```bash
pip install langkit[all]
```

## Adding New Providers

To add a new provider:

1. Create a new file in `providers/` (e.g., `new_provider.py`)
2. Inherit from `GuardrailProvider` or `BaseProvider`
3. Implement `check_input()`, `check_output()`, and `get_provider_name()`
4. Add provider creation logic to `SafetyGuardrails._create_provider()`
5. Add configuration options to `Settings` in `config.py`

## Notes

- If no providers are available, basic validation (length, sanitization) is used
- Providers are initialized lazily to avoid import errors if libraries aren't installed
- Errors in individual providers are logged but don't block the workflow (provider returns safe result with warning)
- Output guardrails are implemented but currently don't block responses (always marked as safe per requirements)
