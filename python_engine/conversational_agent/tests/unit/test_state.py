"""Unit tests for the ConversationState and related data classes."""
import pytest
from app.workflows.state import (
    ConversationState,
    AnalysisResult,
    AnalysisDecision,
    ClothingItem,
    StreamEvent,
    create_initial_state,
    validate_state,
    Intent,
    SearchScope,
)


class TestAnalysisResult:
    """Tests for AnalysisResult dataclass."""
    
    def test_create_approve_result(self):
        """Test creating an approve result."""
        result = AnalysisResult(
            decision=AnalysisDecision.APPROVE,
            approved=True,
            confidence=0.95,
        )
        
        assert result.decision == AnalysisDecision.APPROVE
        assert result.approved is True
        assert result.confidence == 0.95
        assert result.notes is None
    
    def test_create_refine_result(self):
        """Test creating a refine result."""
        result = AnalysisResult(
            decision=AnalysisDecision.REFINE,
            approved=False,
            confidence=0.6,
            notes=["Need more formal options", "Wrong color palette"],
        )
        
        assert result.decision == AnalysisDecision.REFINE
        assert result.approved is False
        assert len(result.notes) == 2
    
    def test_to_dict(self):
        """Test conversion to dictionary."""
        result = AnalysisResult(
            decision=AnalysisDecision.CLARIFY,
            approved=False,
            confidence=0.3,
            notes=["Unclear request"],
        )
        
        data = result.to_dict()
        
        assert data["decision"] == "clarify"
        assert data["approved"] is False
        assert data["confidence"] == 0.3
        assert data["notes"] == ["Unclear request"]
    
    def test_from_dict(self):
        """Test creation from dictionary."""
        data = {
            "decision": "approve",
            "approved": True,
            "confidence": 0.9,
            "notes": None,
        }
        
        result = AnalysisResult.from_dict(data)
        
        assert result.decision == AnalysisDecision.APPROVE
        assert result.approved is True
        assert result.confidence == 0.9


class TestClothingItem:
    """Tests for ClothingItem dataclass."""
    
    def test_create_minimal_item(self):
        """Test creating an item with minimal fields."""
        item = ClothingItem(
            id="item_123",
            name="Blue Jacket",
            source="commerce",
        )
        
        assert item.id == "item_123"
        assert item.name == "Blue Jacket"
        assert item.source == "commerce"
        assert item.category is None
        assert item.metadata == {}
    
    def test_create_full_item(self):
        """Test creating an item with all fields."""
        item = ClothingItem(
            id="item_456",
            name="Leather Jacket",
            source="wardrobe",
            category="TOP",
            sub_category="Jacket",
            color_hex="#8B4513",
            brand="Zara",
            size="M",
            price=149.99,
            image_url="https://example.com/jacket.jpg",
            metadata={"season": "fall", "style": "casual"},
        )
        
        assert item.brand == "Zara"
        assert item.price == 149.99
        assert item.metadata["season"] == "fall"
    
    def test_to_dict(self):
        """Test conversion to dictionary."""
        item = ClothingItem(
            id="item_789",
            name="Cotton Shirt",
            source="commerce",
            category="TOP",
            sub_category="Shirt",
            color_hex="#FFFFFF",
        )
        
        data = item.to_dict()
        
        assert data["id"] == "item_789"
        assert data["subCategory"] == "Shirt"  # camelCase
        assert data["colorHex"] == "#FFFFFF"  # camelCase
    
    def test_from_dict(self):
        """Test creation from dictionary."""
        data = {
            "id": "item_abc",
            "name": "Wool Pants",
            "source": "wardrobe",
            "category": "BOTTOM",
            "subCategory": "Pants",
            "brand": "H&M",
        }
        
        item = ClothingItem.from_dict(data)
        
        assert item.id == "item_abc"
        assert item.sub_category == "Pants"
        assert item.brand == "H&M"


class TestStreamEvent:
    """Tests for StreamEvent dataclass."""
    
    def test_create_event(self):
        """Test creating a stream event."""
        event = StreamEvent(
            type="chunk",
            content="Hello, I found some jackets for you",
        )
        
        assert event.type == "chunk"
        assert event.content == "Hello, I found some jackets for you"
        assert event.timestamp is None
    
    def test_to_dict(self):
        """Test conversion to dictionary."""
        event = StreamEvent(
            type="item",
            content={"id": "123", "name": "Jacket"},
            timestamp="2024-01-01T00:00:00Z",
        )
        
        data = event.to_dict()
        
        assert data["type"] == "item"
        assert data["content"]["id"] == "123"
        assert data["timestamp"] == "2024-01-01T00:00:00Z"


class TestConversationState:
    """Tests for ConversationState TypedDict."""
    
    def test_create_initial_state(self):
        """Test creating initial state."""
        state = create_initial_state(
            user_id="user_123",
            session_id="session_456",
            message="Find me a jacket",
        )
        
        assert state["user_id"] == "user_123"
        assert state["session_id"] == "session_456"
        assert state["message"] == "Find me a jacket"
        assert state["conversation_history"] == []
        assert state["iteration"] == 0
        assert state["needs_clarification"] is False
    
    def test_create_initial_state_with_history(self):
        """Test creating initial state with conversation history."""
        history = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there!"},
        ]
        
        state = create_initial_state(
            user_id="user_123",
            session_id="session_456",
            message="Find me a jacket",
            conversation_history=history,
        )
        
        assert len(state["conversation_history"]) == 2
        assert state["conversation_history"][0]["role"] == "user"
    
    def test_validate_state_valid(self):
        """Test validating a valid state."""
        state = create_initial_state(
            user_id="user_123",
            session_id="session_456",
            message="Find me a jacket",
        )
        
        errors = validate_state(state)
        
        assert errors == []
    
    def test_validate_state_missing_user_id(self):
        """Test validating state with missing user_id."""
        state: ConversationState = {
            "session_id": "session_456",
            "message": "Find me a jacket",
        }
        
        errors = validate_state(state)
        
        assert "user_id is required" in errors
    
    def test_validate_state_missing_message(self):
        """Test validating state with missing message."""
        state: ConversationState = {
            "user_id": "user_123",
            "session_id": "session_456",
        }
        
        errors = validate_state(state)
        
        assert "message is required" in errors
    
    def test_validate_state_iteration_limit(self):
        """Test validating state with exceeded iteration limit."""
        state = create_initial_state(
            user_id="user_123",
            session_id="session_456",
            message="Find me a jacket",
        )
        state["iteration"] = 5  # Over limit
        
        errors = validate_state(state)
        
        assert "iteration limit exceeded (max 3)" in errors
    
    def test_validate_state_invalid_intent(self):
        """Test validating state with invalid intent."""
        state = create_initial_state(
            user_id="user_123",
            session_id="session_456",
            message="Find me a jacket",
        )
        state["intent"] = "invalid_intent"
        
        errors = validate_state(state)
        
        assert any("invalid intent" in e for e in errors)
    
    def test_validate_state_invalid_search_scope(self):
        """Test validating state with invalid search scope."""
        state = create_initial_state(
            user_id="user_123",
            session_id="session_456",
            message="Find me a jacket",
        )
        state["search_scope"] = "invalid_scope"
        
        errors = validate_state(state)
        
        assert any("invalid search_scope" in e for e in errors)


class TestEnums:
    """Tests for enum classes."""
    
    def test_intent_values(self):
        """Test Intent enum values."""
        assert Intent.GENERAL.value == "general"
        assert Intent.CLOTHING.value == "clothing"
    
    def test_search_scope_values(self):
        """Test SearchScope enum values."""
        assert SearchScope.COMMERCE.value == "commerce"
        assert SearchScope.WARDROBE.value == "wardrobe"
        assert SearchScope.BOTH.value == "both"
    
    def test_analysis_decision_values(self):
        """Test AnalysisDecision enum values."""
        assert AnalysisDecision.APPROVE.value == "approve"
        assert AnalysisDecision.REFINE.value == "refine"
        assert AnalysisDecision.CLARIFY.value == "clarify"
