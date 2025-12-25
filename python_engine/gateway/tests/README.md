# Tests

This folder contains tests for the Gateway service.

## Test Categories

### Unit Tests
- Proxy function tests
- Configuration tests

### Integration Tests
- Health check aggregation tests
- Route proxying tests

## Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app
```

## Test Structure

```
tests/
├── __init__.py
├── conftest.py           # Pytest fixtures
├── test_health.py        # Health endpoint tests
├── test_proxy.py         # Proxy function tests
└── test_routes.py        # Route tests
```
