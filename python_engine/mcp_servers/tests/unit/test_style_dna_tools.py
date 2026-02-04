"""Unit tests for Style DNA tools."""
import pytest

from mcp_servers.style_dna_server import tools


@pytest.mark.asyncio
async def test_get_recommended_colors_uses_color_season(monkeypatch):
    """Test that get_recommended_colors returns colors based on color season from ColorAnalysis."""
    # Mock get_color_analysis to return a color analysis with season
    async def fake_get_color_analysis(user_id: str):
        return {
            "userId": user_id,
            "season": "Warm Autumn",  # Matches backend format (title case with space)
            "contrastLevel": "Medium",
            "undertone": "Warm",
            "palette": [],
        }

    monkeypatch.setattr(tools.db, "get_color_analysis", fake_get_color_analysis)

    colors = await tools.get_recommended_colors("u1")
    # warm_autumn palette should now use the same hex colors as backend/frontend
    assert "#FF8C00" in colors


@pytest.mark.asyncio
async def test_get_style_dna_combines_both_collections(monkeypatch):
    """Test that get_style_dna combines data from StyleProfile and ColorAnalysis."""
    async def fake_get_style_profile(user_id: str):
        return {
            "userId": user_id,
            "archetype": "Urban Minimalist",
            "sliders": {"formal": 50, "colorful": 20},
            "favoriteBrands": ["COS", "Arket"],
            "budgetRange": "mid-range",
        }

    async def fake_get_color_analysis(user_id: str):
        return {
            "userId": user_id,
            "season": "Cool Winter",
            "contrastLevel": "High",
            "undertone": "Cool",
            "palette": [{"name": "Navy", "hex": "#000080"}],
        }

    monkeypatch.setattr(tools.db, "get_style_profile", fake_get_style_profile)
    monkeypatch.setattr(tools.db, "get_color_analysis", fake_get_color_analysis)

    dna = await tools.get_style_dna("u1")
    
    assert dna is not None
    assert dna.user_id == "u1"
    # From StyleProfile
    assert dna.archetype == "Urban Minimalist"
    assert dna.sliders == {"formal": 50, "colorful": 20}
    assert dna.favorite_brands == ["COS", "Arket"]
    # From ColorAnalysis
    assert dna.color_season == "Cool Winter"
    assert dna.contrast_level == "High"
    assert dna.undertone == "Cool"
    assert len(dna.palette) == 1
    assert dna.palette[0].name == "Navy"


@pytest.mark.asyncio
async def test_get_color_season_from_color_analysis(monkeypatch):
    """Test that get_color_season fetches from ColorAnalysis collection."""
    async def fake_get_color_analysis(user_id: str):
        return {"userId": user_id, "season": "Light Spring"}

    monkeypatch.setattr(tools.db, "get_color_analysis", fake_get_color_analysis)

    season = await tools.get_color_season("u1")
    assert season == "Light Spring"


@pytest.mark.asyncio
async def test_get_style_archetype_from_style_profile(monkeypatch):
    """Test that get_style_archetype fetches from StyleProfile collection."""
    async def fake_get_style_profile(user_id: str):
        return {"userId": user_id, "archetype": "Bohemian Chic"}

    monkeypatch.setattr(tools.db, "get_style_profile", fake_get_style_profile)

    archetype = await tools.get_style_archetype("u1")
    assert archetype == "Bohemian Chic"


@pytest.mark.asyncio
async def test_get_style_dna_returns_none_when_no_data(monkeypatch):
    """Test that get_style_dna returns None when user has no data in either collection."""
    async def fake_get_style_profile(user_id: str):
        return None

    async def fake_get_color_analysis(user_id: str):
        return None

    monkeypatch.setattr(tools.db, "get_style_profile", fake_get_style_profile)
    monkeypatch.setattr(tools.db, "get_color_analysis", fake_get_color_analysis)

    dna = await tools.get_style_dna("nonexistent")
    assert dna is None
