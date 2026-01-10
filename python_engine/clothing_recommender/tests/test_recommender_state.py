"""Tests for the Recommender agent state and schemas."""
import pytest
from app.agents.recommender.state import (
    RecommenderState,
    RecommenderStage,
    Category,
    SUBCATEGORIES,
    ExtractedFilters,
    UserProfile,
    WardrobeItem,
)


class TestCategory:
    """Tests for Category enum."""
    
    def test_category_values(self):
        """Test all category values exist."""
        assert Category.TOP.value == "TOP"
        assert Category.BOTTOM.value == "BOTTOM"
        assert Category.SHOE.value == "SHOE"
        assert Category.ACCESSORY.value == "ACCESSORY"
    
    def test_category_count(self):
        """Test we have exactly 4 categories."""
        assert len(Category) == 4


class TestSubcategories:
    """Tests for subcategory mappings."""
    
    def test_top_subcategories(self):
        """Test TOP has correct subcategories."""
        top_subcats = SUBCATEGORIES[Category.TOP]
        assert "T-Shirt" in top_subcats
        assert "Jacket" in top_subcats
        assert "Blazer" in top_subcats
    
    def test_bottom_subcategories(self):
        """Test BOTTOM has correct subcategories."""
        bottom_subcats = SUBCATEGORIES[Category.BOTTOM]
        assert "Jeans" in bottom_subcats
        assert "Trousers" in bottom_subcats
    
    def test_shoe_subcategories(self):
        """Test SHOE has correct subcategories."""
        shoe_subcats = SUBCATEGORIES[Category.SHOE]
        assert "Sneakers" in shoe_subcats
        assert "Boots" in shoe_subcats
    
    def test_accessory_subcategories(self):
        """Test ACCESSORY has correct subcategories."""
        accessory_subcats = SUBCATEGORIES[Category.ACCESSORY]
        assert "Hat" in accessory_subcats
        assert "Bag" in accessory_subcats


class TestRecommenderStage:
    """Tests for RecommenderStage enum."""
    
    def test_all_stages_exist(self):
        """Test all workflow stages are defined."""
        stages = [
            RecommenderStage.ANALYZING,
            RecommenderStage.FETCHING_PROFILE,
            RecommenderStage.SEARCHING,
            RecommenderStage.VERIFYING,
            RecommenderStage.REFINING,
            RecommenderStage.RESPONDING,
            RecommenderStage.DONE,
            RecommenderStage.ERROR,
        ]
        assert len(stages) == 8
    
    def test_stage_values(self):
        """Test stage string values."""
        assert RecommenderStage.ANALYZING.value == "analyzing"
        assert RecommenderStage.SEARCHING.value == "searching"
        assert RecommenderStage.DONE.value == "done"


class TestExtractedFilters:
    """Tests for ExtractedFilters TypedDict."""
    
    def test_empty_filters(self):
        """Test empty filters dict."""
        filters: ExtractedFilters = {}
        assert filters.get("category") is None
    
    def test_partial_filters(self):
        """Test filters with some fields."""
        filters: ExtractedFilters = {
            "category": "TOP",
            "subCategory": "Jacket",
        }
        assert filters["category"] == "TOP"
        assert filters["subCategory"] == "Jacket"
        assert filters.get("brand") is None


class TestUserProfile:
    """Tests for UserProfile TypedDict."""
    
    def test_minimal_profile(self):
        """Test profile with minimal fields."""
        profile: UserProfile = {
            "userId": "user_123",
        }
        assert profile["userId"] == "user_123"
    
    def test_full_profile(self):
        """Test profile with all fields."""
        profile: UserProfile = {
            "userId": "user_123",
            "archetype": "Minimalist",
            "sliders": {"formal": 74, "colorful": 66},
            "favoriteBrands": ["Zara", "Nike"],
            "sizes": {"top": "L", "bottom": "42"},
            "negativeConstraints": ["bright colors"],
        }
        assert profile["archetype"] == "Minimalist"
        assert profile["sliders"]["formal"] == 74
        assert len(profile["favoriteBrands"]) == 2


class TestWardrobeItem:
    """Tests for WardrobeItem TypedDict."""
    
    def test_wardrobe_item(self):
        """Test wardrobe item structure."""
        item: WardrobeItem = {
            "_id": "6938855c485e1f7c84ad1145",
            "userId": "user_123",
            "imageUrl": "https://example.com/image.jpg",
            "category": "BOTTOM",
            "subCategory": "Jeans",
            "brand": "Zara",
            "colorHex": "#494947",
            "isFavorite": False,
            "score": 0.95,
        }
        assert item["_id"] == "6938855c485e1f7c84ad1145"
        assert item["category"] == "BOTTOM"
        assert item["score"] == 0.95
