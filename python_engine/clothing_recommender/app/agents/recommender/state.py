"""State schema for the Clothing Recommender agent.

This module defines the TypedDict state that flows through the LangGraph workflow.
"""
from typing import TypedDict, Optional, Any
from enum import Enum


class RecommenderStage(str, Enum):
    """Stages of the recommender workflow for SSE updates."""
    ANALYZING = "analyzing"
    FETCHING_PROFILE = "fetching_profile"
    SEARCHING = "searching"
    VERIFYING = "verifying"
    REFINING = "refining"
    RESPONDING = "responding"
    DONE = "done"
    ERROR = "error"


class Category(str, Enum):
    """Valid clothing categories."""
    TOP = "TOP"
    BOTTOM = "BOTTOM"
    SHOE = "SHOE"
    ACCESSORY = "ACCESSORY"


# SubCategories by Category for validation
SUBCATEGORIES: dict[Category, list[str]] = {
    Category.TOP: ["T-Shirt", "Shirt", "Blouse", "Sweater", "Hoodie", "Jacket", "Coat", "Blazer"],
    Category.BOTTOM: ["Jeans", "Trousers", "Shorts", "Skirt", "Dress", "Leggings", "Sweatpants"],
    Category.SHOE: ["Sneakers", "Boots", "Sandals", "Heels", "Flats", "Loafers"],
    Category.ACCESSORY: ["Hat", "Bag", "Belt", "Jewelry", "Scarf", "Sunglasses", "Watch"],
}


class ExtractedFilters(TypedDict, total=False):
    """Filters extracted from user query by the analyzer."""
    category: Optional[str]         # e.g., "TOP", "BOTTOM"
    subCategory: Optional[str]      # e.g., "Jeans", "T-Shirt"
    brand: Optional[str]            # e.g., "Zara"
    colorHex: Optional[str]         # e.g., "#FF0000"


class UserProfile(TypedDict, total=False):
    """User style profile from MongoDB."""
    userId: str
    archetype: Optional[str]
    sliders: Optional[dict[str, int]]       # e.g., {"formal": 74, "colorful": 66}
    favoriteBrands: Optional[list[str]]
    sizes: Optional[dict[str, str]]         # e.g., {"top": "L", "bottom": "42"}
    negativeConstraints: Optional[list[str]]


class WardrobeItem(TypedDict, total=False):
    """Wardrobe item from MongoDB (without embedding)."""
    _id: str
    userId: str
    imageUrl: str
    processedImageUrl: Optional[str]
    category: str
    subCategory: Optional[str]
    brand: Optional[str]
    colorHex: Optional[str]
    notes: Optional[str]            # User notes/description for the item
    isFavorite: bool
    score: Optional[float]          # Vector search score


class RecommenderState(TypedDict, total=False):
    """
    State for the Clothing Recommender LangGraph workflow.
    
    This state flows through all nodes and accumulates data as the
    workflow progresses through analysis, search, and verification.
    """
    # === Input (set at start) ===
    user_id: str
    user_query: str
    session_id: str
    
    # === Query Analysis Output ===
    filters: ExtractedFilters               # Structured filters for MongoDB
    semantic_query: str                     # Text query for embedding
    needs_profile: bool                     # Whether to fetch user profile
    
    # === Profile Data (optional) ===
    user_profile: Optional[UserProfile]
    
    # === Search Results ===
    search_results: list[WardrobeItem]      # Raw results from vector search
    
    # === Verification Output ===
    valid_item_ids: list[str]               # IDs that passed verification
    is_sufficient: bool                     # len(valid_ids) >= MIN_RESULTS
    refinement_suggestions: Optional[str]   # LLM suggestions for next iteration
    
    # === Loop Control ===
    iteration: int                          # Current iteration (0, 1, 2)
    
    # === Streaming Metadata ===
    current_stage: RecommenderStage
    stage_metadata: dict[str, Any]          # Extra data for SSE events
    
    # === Error Handling ===
    error: Optional[str]
    
    # === Final Response ===
    response_item_ids: list[str]
    response_message: Optional[str]         # Fallback message if no results
