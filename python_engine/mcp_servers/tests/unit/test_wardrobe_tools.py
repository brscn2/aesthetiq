"""Unit tests for Wardrobe tools."""
import pytest

from mcp_servers.wardrobe_server.schemas import WardrobeFilters, WardrobeItem, Category
from mcp_servers.wardrobe_server import tools


@pytest.mark.asyncio
async def test_search_wardrobe_items_ranks_by_similarity(monkeypatch):
    """Test that search ranks items by embedding similarity."""
    # Mock documents returned from DB (with pre-computed embeddings)
    mock_docs = [
        {
            "_id": "a",
            "userId": "u1",
            "imageUrl": "https://example.com/jacket.jpg",
            "category": "TOP",
            "subCategory": "Jacket",
            "brand": "Nike",
            "colors": ["#0000FF"],
            "embedding": [1.0, 0.0],  # Similar to query
        },
        {
            "_id": "b",
            "userId": "u1",
            "imageUrl": "https://example.com/pants.jpg",
            "category": "BOTTOM",
            "subCategory": "Pants",
            "brand": "Adidas",
            "colors": ["#FF0000"],
            "embedding": [0.0, 1.0],  # Different from query
        },
    ]

    async def fake_find_with_embeddings(user_id, filters=None, limit=200):
        return mock_docs

    async def fake_embed(text: str, timeout_s: float = 30.0):
        # Query "jacket" -> [1,0] (similar to item A)
        return [1.0, 0.0]

    monkeypatch.setattr(tools.db, "find_items_with_embeddings", fake_find_with_embeddings)
    monkeypatch.setattr(tools, "embed_text", fake_embed)

    # Act
    results = await tools.search_wardrobe_items(query="jacket", user_id="u1")

    # Assert
    assert len(results) == 2
    assert results[0]["item"].id == "a"  # Jacket should rank higher
    assert results[0]["score"] >= results[1]["score"]


@pytest.mark.asyncio
async def test_filter_wardrobe_items_delegates_to_db(monkeypatch):
    """Test that filter_wardrobe_items properly queries the database."""
    async def fake_find(user_id, filters=None, limit=100):
        assert user_id == "u1"
        assert filters["category"] == "TOP"
        return [{
            "_id": "item1",
            "userId": "u1",
            "imageUrl": "https://example.com/top.jpg",
            "category": "TOP",
            "subCategory": "T-Shirt",
            "colors": ["#FFFFFF"],
        }]

    monkeypatch.setattr(tools.db, "find_wardrobe_items", fake_find)

    items = await tools.filter_wardrobe_items("u1", WardrobeFilters(category=Category.TOP), limit=10)
    
    assert len(items) == 1
    assert items[0].category == Category.TOP
    assert items[0].subCategory == "T-Shirt"


@pytest.mark.asyncio
async def test_get_wardrobe_item_returns_item(monkeypatch):
    """Test that get_wardrobe_item returns the correct item."""
    async def fake_get(item_id, user_id):
        if item_id == "item123" and user_id == "u1":
            return {
                "_id": "item123",
                "userId": "u1",
                "imageUrl": "https://example.com/shoe.jpg",
                "category": "FOOTWEAR",
                "brand": "Nike",
                "colors": ["#000000", "#FFFFFF"],
                "isFavorite": True,
            }
        return None

    monkeypatch.setattr(tools.db, "get_wardrobe_item", fake_get)

    item = await tools.get_wardrobe_item("item123", "u1")
    
    assert item is not None
    assert item.id == "item123"
    assert item.category == Category.SHOE
    assert item.brand == "Nike"
    assert item.isFavorite is True
    assert "#000000" in item.colors


@pytest.mark.asyncio
async def test_get_wardrobe_item_returns_none_for_missing(monkeypatch):
    """Test that get_wardrobe_item returns None for non-existent items."""
    async def fake_get(item_id, user_id):
        return None

    monkeypatch.setattr(tools.db, "get_wardrobe_item", fake_get)

    item = await tools.get_wardrobe_item("nonexistent", "u1")
    assert item is None


@pytest.mark.asyncio
async def test_search_falls_back_to_all_items_when_no_embeddings(monkeypatch):
    """Test that search falls back to on-the-fly embedding when no pre-computed embeddings."""
    # No items with embeddings
    async def fake_find_with_embeddings(user_id, filters=None, limit=200):
        return []
    
    # All items (without embeddings)
    async def fake_find(user_id, filters=None, limit=200):
        return [{
            "_id": "c",
            "userId": "u1",
            "imageUrl": "https://example.com/shirt.jpg",
            "category": "TOP",
            "colors": [],
            # No embedding field
        }]

    async def fake_embed(text: str, timeout_s: float = 30.0):
        return [1.0, 0.0]

    monkeypatch.setattr(tools.db, "find_items_with_embeddings", fake_find_with_embeddings)
    monkeypatch.setattr(tools.db, "find_wardrobe_items", fake_find)
    monkeypatch.setattr(tools, "embed_text", fake_embed)

    results = await tools.search_wardrobe_items(query="shirt", user_id="u1")

    assert len(results) == 1
    assert results[0]["item"].id == "c"
