"""Test fixtures for Face Analysis service."""
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def sample_image():
    """Create a sample image for testing."""
    # TODO: Create or load a test image
    pass
