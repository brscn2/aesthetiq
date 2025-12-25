# Tests

This folder contains tests for the Face Analysis service.

## Test Categories

### Unit Tests
- Model inference tests
- Preprocessing tests
- Service function tests

### Integration Tests
- API endpoint tests
- Full pipeline tests

## Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_face_analysis.py
```

## Test Structure

```
tests/
├── __init__.py
├── conftest.py           # Pytest fixtures
├── test_face_analysis.py # Face analysis tests
├── test_preprocessing.py # Preprocessing tests
└── test_api.py          # API endpoint tests
```
