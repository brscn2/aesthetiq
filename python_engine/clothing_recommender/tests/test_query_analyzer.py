"""Tests for the query analyzer node."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.agents.recommender.nodes.query_analyzer import (
    query_analyzer_node,
    _build_categories_info,
    _parse_analyzer_response,
    _validate_filters,
)
from app.agents.recommender.state import RecommenderState, Category


class TestBuildCategoriesInfo:
    """Tests for _build_categories_info helper."""
    
    def test_returns_string(self):
        """Test that categories info is a string."""
        result = _build_categories_info()
        assert isinstance(result, str)
    
    def test_contains_all_categories(self):
        """Test all categories are in the output."""
        result = _build_categories_info()
        assert "TOP" in result
        assert "BOTTOM" in result
        assert "SHOE" in result
        assert "ACCESSORY" in result
    
    def test_contains_subcategories(self):
        """Test subcategories are included."""
        result = _build_categories_info()
        assert "T-Shirt" in result
        assert "Jeans" in result
        assert "Sneakers" in result


class TestParseAnalyzerResponse:
    """Tests for _parse_analyzer_response helper."""
    
    def test_valid_json(self):
        """Test parsing valid JSON response."""
        response = '{"filters": {"category": "TOP"}, "semantic_query": "test", "needs_profile": false}'
        result = _parse_analyzer_response(response)
        assert result["filters"]["category"] == "TOP"
        assert result["semantic_query"] == "test"
        assert result["needs_profile"] is False
    
    def test_json_with_markdown(self):
        """Test parsing JSON wrapped in markdown code block."""
        response = '''```json
{"filters": {"category": "BOTTOM"}, "semantic_query": "jeans", "needs_profile": true}
```'''
        result = _parse_analyzer_response(response)
        assert result["filters"]["category"] == "BOTTOM"
        assert result["needs_profile"] is True
    
    def test_json_embedded_in_text(self):
        """Test extracting JSON from surrounding text."""
        response = 'Here is the analysis: {"filters": {}, "semantic_query": "party"} Hope this helps!'
        result = _parse_analyzer_response(response)
        assert result["semantic_query"] == "party"
    
    def test_invalid_json(self):
        """Test handling invalid JSON."""
        response = "This is not JSON at all"
        result = _parse_analyzer_response(response)
        assert result == {}


class TestValidateFilters:
    """Tests for _validate_filters helper."""
    
    def test_valid_category(self):
        """Test validating a valid category."""
        filters = {"category": "TOP"}
        result = _validate_filters(filters)
        assert result["category"] == "TOP"
    
    def test_lowercase_category(self):
        """Test category is normalized to uppercase."""
        filters = {"category": "top"}
        result = _validate_filters(filters)
        assert result["category"] == "TOP"
    
    def test_invalid_category_ignored(self):
        """Test invalid category is not included."""
        filters = {"category": "INVALID"}
        result = _validate_filters(filters)
        assert "category" not in result
    
    def test_valid_subcategory(self):
        """Test validating a valid subcategory."""
        filters = {"category": "TOP", "subCategory": "Jacket"}
        result = _validate_filters(filters)
        assert result["subCategory"] == "Jacket"
    
    def test_subcategory_case_insensitive(self):
        """Test subcategory matching is case-insensitive."""
        filters = {"category": "TOP", "subCategory": "jacket"}
        result = _validate_filters(filters)
        assert result["subCategory"] == "Jacket"
    
    def test_brand_preserved(self):
        """Test brand is preserved and stripped."""
        filters = {"brand": "  Zara  "}
        result = _validate_filters(filters)
        assert result["brand"] == "Zara"
    
    def test_valid_color_hex(self):
        """Test valid hex color is preserved."""
        filters = {"colorHex": "#FF0000"}
        result = _validate_filters(filters)
        assert result["colorHex"] == "#FF0000"
    
    def test_invalid_color_hex_ignored(self):
        """Test invalid hex color is not included."""
        filters = {"colorHex": "red"}
        result = _validate_filters(filters)
        assert "colorHex" not in result


@pytest.mark.asyncio
class TestQueryAnalyzerNode:
    """Tests for query_analyzer_node function."""
    
    async def test_first_iteration(self):
        """Test query analysis on first iteration."""
        state: RecommenderState = {
            "user_query": "Find me a jacket for a party",
            "user_id": "user_123",
            "session_id": "session_123",
            "iteration": 0,
        }
        
        mock_llm = AsyncMock()
        mock_llm.generate_response.return_value = '''
        {"filters": {"category": "TOP", "subCategory": "Jacket"}, "semantic_query": "elegant party jacket", "needs_profile": false}
        '''
        
        result = await query_analyzer_node(state, mock_llm)
        
        assert result["filters"]["category"] == "TOP"
        assert result["semantic_query"] == "elegant party jacket"
        assert result["needs_profile"] is False
    
    async def test_retry_iteration(self):
        """Test query analysis on retry with refinement suggestions."""
        state: RecommenderState = {
            "user_query": "Find me a jacket for a party",
            "user_id": "user_123",
            "session_id": "session_123",
            "iteration": 1,
            "refinement_suggestions": "Try removing category filter",
            "filters": {"category": "TOP"},
        }
        
        mock_llm = AsyncMock()
        mock_llm.generate_response.return_value = '''
        {"filters": {}, "semantic_query": "party outfit jacket", "needs_profile": true}
        '''
        
        result = await query_analyzer_node(state, mock_llm)
        
        assert result["filters"] == {}
        assert "party" in result["semantic_query"]
    
    async def test_llm_error_fallback(self):
        """Test fallback behavior when LLM fails."""
        state: RecommenderState = {
            "user_query": "Find me something nice",
            "user_id": "user_123",
            "session_id": "session_123",
            "iteration": 0,
        }
        
        mock_llm = AsyncMock()
        mock_llm.generate_response.side_effect = Exception("LLM error")
        
        result = await query_analyzer_node(state, mock_llm)
        
        # Should fallback to using query as-is
        assert result["semantic_query"] == "Find me something nice"
        assert result["needs_profile"] is True  # Conservative fallback
