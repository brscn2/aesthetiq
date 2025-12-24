# Tests

This folder contains tests for the Clothing Recommender service.

## Test Categories

### Unit Tests
- LangChain service tests
- LangGraph workflow tests
- Agent function tests
- Intent classification tests

### Integration Tests
- Full chat flow tests
- Streaming response tests
- API endpoint tests

## Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_langgraph.py

# Run with verbose output
pytest -v
```

## Test Structure

```
tests/
├── __init__.py
├── conftest.py           # Pytest fixtures
├── test_chat.py          # Chat endpoint tests
├── test_langgraph.py     # LangGraph workflow tests
├── test_langchain.py     # LangChain service tests
└── test_streaming.py     # Streaming response tests
```

## Mocking LLM Calls

Use pytest-mock or unittest.mock to mock LLM API calls:

```python
@pytest.fixture
def mock_llm(mocker):
    return mocker.patch(
        "app.services.llm.langchain_service.ChatOpenAI",
        return_value=MockLLM()
    )
```
