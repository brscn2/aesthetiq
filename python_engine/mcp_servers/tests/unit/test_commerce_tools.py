"""Unit tests for Commerce tools."""
import pytest

from mcp_servers.commerce_server import tools
from mcp_servers.commerce_server.schemas import (
    CommerceFilters,
    CommerceItem,
    Category,
    SeasonalPaletteScores,
)
from mcp_servers.commerce_server.style_ranking import (
    score_from_palette_scores,
    normalize_palette_key,
    get_best_palettes,
)


@pytest.mark.asyncio
async def test_search_commerce_items_uses_seasonal_palette_scores(monkeypatch):
    """Test that search uses pre-computed seasonalPaletteScores for ranking."""
    # Mock documents with pre-computed seasonalPaletteScores
    mock_docs = [
        {
            "_id": "a",
            "name": "Camel Wool Coat",
            "imageUrl": "https://example.com/coat.jpg",
            "category": "TOP",
            "retailerId": "retailer1",
            "productUrl": "https://shop.com/coat",
            "colors": ["#C19A6B"],  # Camel color
            "seasonalPaletteScores": {
                "WARM_AUTUMN": 0.95,
                "COOL_WINTER": 0.15,
            },
            "embedding": [1.0, 0.0],
        },
        {
            "_id": "b",
            "name": "Navy Blue Blazer",
            "imageUrl": "https://example.com/blazer.jpg",
            "category": "TOP",
            "retailerId": "retailer1",
            "productUrl": "https://shop.com/blazer",
            "colors": ["#000080"],  # Navy
            "seasonalPaletteScores": {
                "WARM_AUTUMN": 0.20,
                "COOL_WINTER": 0.90,
            },
            "embedding": [1.0, 0.0],  # Same embedding for equal semantic score
        },
    ]

    async def fake_find_with_embeddings(filters=None, limit=200):
        return mock_docs

    async def fake_embed(text: str, timeout_s: float = 30.0):
        # Query embedding - same for both items to isolate season effect
        return [1.0, 0.0]

    monkeypatch.setattr(tools.db, "find_items_with_embeddings", fake_find_with_embeddings)
    monkeypatch.setattr(tools, "embed_text", fake_embed)

    # Search with warm_autumn style DNA - camel coat should rank higher
    results = await tools.search_commerce_items(
        query="coat",
        style_dna="warm_autumn"
    )
    
    assert len(results) == 2
    assert results[0]["item"].id == "a"  # Camel coat should rank first
    assert results[0]["score"] > results[1]["score"]
    assert results[0]["breakdown"]["color_season"] == 0.95
    assert results[1]["breakdown"]["color_season"] == 0.20


@pytest.mark.asyncio
async def test_filter_commerce_items_delegates_to_db(monkeypatch):
    """Test that filter_commerce_items properly queries the database."""
    async def fake_find(filters=None, limit=100):
        assert filters["category"] == "TOP"
        return [{
            "_id": "item1",
            "name": "White T-Shirt",
            "imageUrl": "https://example.com/tshirt.jpg",
            "category": "TOP",
            "retailerId": "retailer1",
            "productUrl": "https://shop.com/tshirt",
            "colors": ["#FFFFFF"],
            "inStock": True,
        }]

    monkeypatch.setattr(tools.db, "find_commerce_items", fake_find)

    items = await tools.filter_commerce_items(
        CommerceFilters(category=Category.TOP),
        limit=10
    )
    
    assert len(items) == 1
    assert items[0].category == Category.TOP
    assert items[0].name == "White T-Shirt"


@pytest.mark.asyncio
async def test_get_commerce_item_returns_item(monkeypatch):
    """Test that get_commerce_item returns the correct item."""
    async def fake_get(item_id):
        if item_id == "item123":
            return {
                "_id": "item123",
                "name": "Running Shoes",
                "imageUrl": "https://example.com/shoes.jpg",
                "category": "SHOE",
                "retailerId": "retailer2",
                "productUrl": "https://shop.com/shoes",
                "brand": "Nike",
                "colors": ["#000000", "#FFFFFF"],
                "price": 12999,
                "currency": "USD",
                "inStock": True,
            }
        return None

    monkeypatch.setattr(tools.db, "get_commerce_item", fake_get)

    item = await tools.get_commerce_item("item123")
    
    assert item is not None
    assert item.id == "item123"
    assert item.category == Category.SHOE
    assert item.brand == "Nike"
    assert item.price == 12999
    assert item.inStock is True


@pytest.mark.asyncio
async def test_get_commerce_item_returns_none_for_missing(monkeypatch):
    """Test that get_commerce_item returns None for non-existent items."""
    async def fake_get(item_id):
        return None

    monkeypatch.setattr(tools.db, "get_commerce_item", fake_get)

    item = await tools.get_commerce_item("nonexistent")
    assert item is None


# Style ranking unit tests

def test_score_from_palette_scores():
    """Test score_from_palette_scores returns correct score."""
    scores = {
        "WARM_AUTUMN": 0.85,
        "COOL_WINTER": 0.30,
        "LIGHT_SPRING": 0.60,
    }
    
    assert score_from_palette_scores(scores, "warm_autumn") == 0.85
    assert score_from_palette_scores(scores, "WARM_AUTUMN") == 0.85
    assert score_from_palette_scores(scores, "Warm Autumn") == 0.85
    assert score_from_palette_scores(scores, "COOL_WINTER") == 0.30
    assert score_from_palette_scores(scores, "unknown_palette") == 0.0
    assert score_from_palette_scores(None, "warm_autumn") == 0.0
    assert score_from_palette_scores(scores, None) == 0.0


def test_normalize_palette_key():
    """Test normalize_palette_key handles various formats."""
    assert normalize_palette_key("warm_autumn") == "WARM_AUTUMN"
    assert normalize_palette_key("WARM_AUTUMN") == "WARM_AUTUMN"
    assert normalize_palette_key("Warm Autumn") == "WARM_AUTUMN"
    assert normalize_palette_key("  cool_winter  ") == "COOL_WINTER"


def test_get_best_palettes():
    """Test get_best_palettes returns sorted matches above threshold."""
    scores = {
        "WARM_AUTUMN": 0.85,
        "COOL_WINTER": 0.30,
        "LIGHT_SPRING": 0.75,
        "MUTED_AUTUMN": 0.90,
    }
    
    best = get_best_palettes(scores, threshold=0.7)
    assert len(best) == 3
    assert best[0] == ("MUTED_AUTUMN", 0.90)
    assert best[1] == ("WARM_AUTUMN", 0.85)
    assert best[2] == ("LIGHT_SPRING", 0.75)
    
    # Test with limit
    best_limited = get_best_palettes(scores, threshold=0.7, limit=2)
    assert len(best_limited) == 2
    
    # Test with None
    assert get_best_palettes(None) == []
