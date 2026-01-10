"""Tests for the MongoDB repositories."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId

from app.services.mongodb.wardrobe_repo import WardrobeRepository
from app.services.mongodb.profile_repo import ProfileRepository


class TestWardrobeRepository:
    """Tests for WardrobeRepository class."""
    
    @pytest.fixture
    def wardrobe_repo(self):
        """Create wardrobe repository for testing."""
        return WardrobeRepository()
    
    def test_build_filter_clause_empty(self, wardrobe_repo):
        """Test building filter clause with no filters."""
        result = wardrobe_repo._build_filter_clause(None)
        assert result is None
        
        result = wardrobe_repo._build_filter_clause({})
        assert result is None
    
    def test_build_filter_clause_single(self, wardrobe_repo):
        """Test building filter clause with single filter."""
        filters = {"category": "TOP"}
        result = wardrobe_repo._build_filter_clause(filters)
        assert result == {"category": "TOP"}
    
    def test_build_filter_clause_multiple(self, wardrobe_repo):
        """Test building filter clause with multiple filters."""
        filters = {"category": "TOP", "subCategory": "Jacket"}
        result = wardrobe_repo._build_filter_clause(filters)
        
        assert "$and" in result
        assert len(result["$and"]) == 2
    
    def test_build_filter_clause_brand(self, wardrobe_repo):
        """Test brand filter is case-insensitive."""
        filters = {"brand": "Zara"}
        result = wardrobe_repo._build_filter_clause(filters)
        
        assert "$regex" in result["brand"]
        assert "$options" in result["brand"]
        assert result["brand"]["$options"] == "i"
    
    @pytest.mark.asyncio
    async def test_vector_search(self, wardrobe_repo):
        """Test vector search execution."""
        mock_cursor = AsyncMock()
        mock_cursor.to_list.return_value = [
            {"_id": ObjectId(), "category": "TOP", "score": 0.95},
            {"_id": ObjectId(), "category": "TOP", "score": 0.90},
        ]
        
        mock_collection = MagicMock()
        mock_collection.aggregate.return_value = mock_cursor
        
        with patch.object(wardrobe_repo, 'collection', mock_collection):
            results = await wardrobe_repo.vector_search(
                query_embedding=[0.1] * 512,
                filters={"category": "TOP"},
                limit=10,
            )
            
            assert len(results) == 2
            assert all(isinstance(r["_id"], str) for r in results)
    
    @pytest.mark.asyncio
    async def test_get_by_ids(self, wardrobe_repo):
        """Test fetching items by IDs."""
        test_id = str(ObjectId())
        
        mock_cursor = AsyncMock()
        mock_cursor.to_list.return_value = [
            {"_id": ObjectId(test_id), "category": "TOP"},
        ]
        
        mock_collection = MagicMock()
        mock_collection.find.return_value = mock_cursor
        
        with patch.object(wardrobe_repo, 'collection', mock_collection):
            results = await wardrobe_repo.get_by_ids([test_id])
            
            assert len(results) == 1
            assert results[0]["_id"] == test_id
    
    @pytest.mark.asyncio
    async def test_get_by_ids_empty(self, wardrobe_repo):
        """Test fetching with empty ID list."""
        results = await wardrobe_repo.get_by_ids([])
        assert results == []
    
    @pytest.mark.asyncio
    async def test_get_by_ids_invalid(self, wardrobe_repo):
        """Test fetching with invalid IDs."""
        results = await wardrobe_repo.get_by_ids(["not-a-valid-objectid"])
        assert results == []


class TestProfileRepository:
    """Tests for ProfileRepository class."""
    
    @pytest.fixture
    def profile_repo(self):
        """Create profile repository for testing."""
        return ProfileRepository()
    
    @pytest.mark.asyncio
    async def test_get_by_user_id_found(self, profile_repo):
        """Test fetching existing profile."""
        mock_doc = {
            "_id": ObjectId(),
            "userId": "user_123",
            "archetype": "Minimalist",
            "sliders": {"formal": 74, "colorful": 66},
            "favoriteBrands": ["Zara"],
            "sizes": {"top": "L"},
            "negativeConstraints": [],
        }
        
        mock_collection = MagicMock()
        mock_collection.find_one = AsyncMock(return_value=mock_doc)
        
        with patch.object(profile_repo, 'collection', mock_collection):
            result = await profile_repo.get_by_user_id("user_123")
            
            assert result is not None
            assert result["userId"] == "user_123"
            assert result["archetype"] == "Minimalist"
    
    @pytest.mark.asyncio
    async def test_get_by_user_id_not_found(self, profile_repo):
        """Test fetching non-existent profile."""
        mock_collection = MagicMock()
        mock_collection.find_one = AsyncMock(return_value=None)
        
        with patch.object(profile_repo, 'collection', mock_collection):
            result = await profile_repo.get_by_user_id("nonexistent_user")
            
            assert result is None
    
    @pytest.mark.asyncio
    async def test_has_profile_true(self, profile_repo):
        """Test checking profile exists."""
        mock_collection = MagicMock()
        mock_collection.count_documents = AsyncMock(return_value=1)
        
        with patch.object(profile_repo, 'collection', mock_collection):
            result = await profile_repo.has_profile("user_123")
            
            assert result is True
    
    @pytest.mark.asyncio
    async def test_has_profile_false(self, profile_repo):
        """Test checking profile doesn't exist."""
        mock_collection = MagicMock()
        mock_collection.count_documents = AsyncMock(return_value=0)
        
        with patch.object(profile_repo, 'collection', mock_collection):
            result = await profile_repo.has_profile("nonexistent_user")
            
            assert result is False
