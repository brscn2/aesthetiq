"""Tests for the verifier node."""
import pytest
from unittest.mock import AsyncMock, MagicMock

from app.agents.recommender.nodes.verifier import (
    verifier_node,
    _format_results_for_verification,
    _format_profile_for_verification,
    _generate_no_results_suggestion,
    _parse_verifier_response,
)
from app.agents.recommender.state import RecommenderState, WardrobeItem, UserProfile


class TestFormatResultsForVerification:
    """Tests for _format_results_for_verification helper."""
    
    def test_single_item(self):
        """Test formatting a single item."""
        results = [{
            "_id": "item1",
            "category": "TOP",
            "subCategory": "Jacket",
            "brand": "Zara",
            "score": 0.95,
        }]
        
        result = _format_results_for_verification(results)
        
        assert "item1" in result
        assert "TOP" in result
        assert "Jacket" in result
        assert "Zara" in result
        assert "0.95" in result
    
    def test_multiple_items(self):
        """Test formatting multiple items."""
        results = [
            {"_id": "item1", "category": "TOP"},
            {"_id": "item2", "category": "BOTTOM"},
        ]
        
        result = _format_results_for_verification(results)
        
        assert "1." in result
        assert "2." in result
        assert "item1" in result
        assert "item2" in result
    
    def test_empty_results(self):
        """Test formatting empty results."""
        result = _format_results_for_verification([])
        assert result == ""


class TestFormatProfileForVerification:
    """Tests for _format_profile_for_verification helper."""
    
    def test_no_profile(self):
        """Test with no profile."""
        result = _format_profile_for_verification(None)
        assert "No user profile" in result
    
    def test_full_profile(self):
        """Test with full profile."""
        profile: UserProfile = {
            "userId": "user_123",
            "archetype": "Minimalist",
            "sliders": {"formal": 80, "colorful": 30},
            "favoriteBrands": ["Zara", "Nike"],
            "negativeConstraints": ["bright colors"],
        }
        
        result = _format_profile_for_verification(profile)
        
        assert "Minimalist" in result
        assert "80" in result
        assert "Zara" in result
        assert "bright colors" in result


class TestGenerateNoResultsSuggestion:
    """Tests for _generate_no_results_suggestion helper."""
    
    def test_with_category_filter(self):
        """Test suggestion when category filter used."""
        filters = {"category": "TOP"}
        result = _generate_no_results_suggestion(filters)
        assert "category" in result.lower()
    
    def test_with_brand_filter(self):
        """Test suggestion when brand filter used."""
        filters = {"brand": "Nike"}
        result = _generate_no_results_suggestion(filters)
        assert "brand" in result.lower()
    
    def test_no_filters(self):
        """Test suggestion when no filters used."""
        filters = {}
        result = _generate_no_results_suggestion(filters)
        assert "general" in result.lower() or "keywords" in result.lower()


class TestParseVerifierResponse:
    """Tests for _parse_verifier_response helper."""
    
    def test_valid_response(self):
        """Test parsing valid verifier response."""
        response = '{"valid_item_ids": ["item1", "item2"], "refinement_suggestions": null}'
        search_results = [
            {"_id": "item1"},
            {"_id": "item2"},
            {"_id": "item3"},
        ]
        
        result = _parse_verifier_response(response, search_results)
        
        assert result["valid_item_ids"] == ["item1", "item2"]
        assert result["refinement_suggestions"] is None
    
    def test_filters_invalid_ids(self):
        """Test that invalid IDs are filtered out."""
        response = '{"valid_item_ids": ["item1", "invalid_id"], "refinement_suggestions": null}'
        search_results = [{"_id": "item1"}, {"_id": "item2"}]
        
        result = _parse_verifier_response(response, search_results)
        
        assert result["valid_item_ids"] == ["item1"]
    
    def test_with_refinement_suggestions(self):
        """Test parsing response with refinement suggestions."""
        response = '{"valid_item_ids": [], "refinement_suggestions": "Try broader search"}'
        
        result = _parse_verifier_response(response, [])
        
        assert result["refinement_suggestions"] == "Try broader search"
    
    def test_markdown_wrapped_response(self):
        """Test parsing markdown-wrapped response."""
        response = '''```json
{"valid_item_ids": ["item1"], "refinement_suggestions": null}
```'''
        search_results = [{"_id": "item1"}]
        
        result = _parse_verifier_response(response, search_results)
        
        assert result["valid_item_ids"] == ["item1"]


@pytest.mark.asyncio
class TestVerifierNode:
    """Tests for verifier_node function."""
    
    async def test_no_search_results(self):
        """Test verifier with no search results."""
        state: RecommenderState = {
            "user_query": "Find me a jacket",
            "user_id": "user_123",
            "search_results": [],
            "iteration": 0,
            "filters": {"category": "TOP"},
        }
        
        mock_llm = AsyncMock()
        
        result = await verifier_node(state, mock_llm)
        
        assert result["valid_item_ids"] == []
        assert result["is_sufficient"] is False
        assert result["refinement_suggestions"] is not None
    
    async def test_sufficient_results(self):
        """Test verifier with sufficient valid results."""
        state: RecommenderState = {
            "user_query": "Find me jeans",
            "user_id": "user_123",
            "search_results": [
                {"_id": "item1", "category": "BOTTOM", "subCategory": "Jeans"},
                {"_id": "item2", "category": "BOTTOM", "subCategory": "Jeans"},
                {"_id": "item3", "category": "BOTTOM", "subCategory": "Jeans"},
                {"_id": "item4", "category": "BOTTOM", "subCategory": "Trousers"},
            ],
            "user_profile": None,
            "iteration": 0,
            "filters": {},
        }
        
        mock_llm = AsyncMock()
        mock_llm.generate_response.return_value = '''
        {"valid_item_ids": ["item1", "item2", "item3"], "refinement_suggestions": null}
        '''
        
        result = await verifier_node(state, mock_llm)
        
        assert len(result["valid_item_ids"]) == 3
        assert result["is_sufficient"] is True
        assert result["refinement_suggestions"] is None
    
    async def test_insufficient_results(self):
        """Test verifier with insufficient valid results."""
        state: RecommenderState = {
            "user_query": "Find me Nike sneakers",
            "user_id": "user_123",
            "search_results": [
                {"_id": "item1", "category": "SHOE", "brand": "Adidas"},
                {"_id": "item2", "category": "SHOE", "brand": "Puma"},
            ],
            "user_profile": None,
            "iteration": 0,
            "filters": {"brand": "Nike"},
        }
        
        mock_llm = AsyncMock()
        mock_llm.generate_response.return_value = '''
        {"valid_item_ids": ["item1"], "refinement_suggestions": "Remove brand filter to find more options"}
        '''
        
        result = await verifier_node(state, mock_llm)
        
        assert len(result["valid_item_ids"]) == 1
        assert result["is_sufficient"] is False
        assert "brand" in result["refinement_suggestions"].lower()
    
    async def test_llm_error_fallback(self):
        """Test fallback when LLM fails."""
        state: RecommenderState = {
            "user_query": "Find me something",
            "user_id": "user_123",
            "search_results": [
                {"_id": "item1", "score": 0.9},
                {"_id": "item2", "score": 0.8},
                {"_id": "item3", "score": 0.7},
            ],
            "user_profile": None,
            "iteration": 0,
            "filters": {},
        }
        
        mock_llm = AsyncMock()
        mock_llm.generate_response.side_effect = Exception("LLM error")
        
        result = await verifier_node(state, mock_llm)
        
        # Should fallback to top results
        assert len(result["valid_item_ids"]) == 3
        assert result["is_sufficient"] is True
