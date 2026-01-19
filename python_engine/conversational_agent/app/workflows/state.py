"""LangGraph state definitions for the conversational workflow."""
from typing import TypedDict, List, Dict, Any, Optional, Literal
from dataclasses import dataclass, field
from enum import Enum


class Intent(str, Enum):
    """User intent classification."""
    GENERAL = "general"
    CLOTHING = "clothing"


class SearchScope(str, Enum):
    """Search scope for clothing recommendations."""
    COMMERCE = "commerce"
    WARDROBE = "wardrobe"
    BOTH = "both"


class AnalysisDecision(str, Enum):
    """Decision from the Clothing Analyzer Agent."""
    APPROVE = "approve"
    REFINE = "refine"
    CLARIFY = "clarify"


@dataclass
class AnalysisResult:
    """Result from the Clothing Analyzer Agent."""
    decision: AnalysisDecision
    approved: bool
    confidence: float = 0.0
    notes: Optional[List[str]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "decision": self.decision.value,
            "approved": self.approved,
            "confidence": self.confidence,
            "notes": self.notes,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AnalysisResult":
        """Create from dictionary."""
        return cls(
            decision=AnalysisDecision(data["decision"]),
            approved=data["approved"],
            confidence=data.get("confidence", 0.0),
            notes=data.get("notes"),
        )


@dataclass
class ClothingItem:
    """A clothing item from wardrobe or commerce."""
    id: str
    name: str
    source: str  # "wardrobe", "commerce", or "web_search"
    category: Optional[str] = None
    sub_category: Optional[str] = None
    color_hex: Optional[str] = None
    brand: Optional[str] = None
    size: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "id": self.id,
            "name": self.name,
            "source": self.source,
            "category": self.category,
            "subCategory": self.sub_category,
            "colorHex": self.color_hex,
            "brand": self.brand,
            "size": self.size,
            "price": self.price,
            "imageUrl": self.image_url,
            "metadata": self.metadata,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ClothingItem":
        """Create from dictionary."""
        return cls(
            id=data["id"],
            name=data["name"],
            source=data["source"],
            category=data.get("category"),
            sub_category=data.get("subCategory"),
            color_hex=data.get("colorHex"),
            brand=data.get("brand"),
            size=data.get("size"),
            price=data.get("price"),
            image_url=data.get("imageUrl"),
            metadata=data.get("metadata", {}),
        )


@dataclass
class StreamEvent:
    """Streaming event for SSE responses."""
    type: str  # "metadata", "status", "agent_start", "tool_call", "item", "analysis", "chunk", "done", "error"
    content: Any
    timestamp: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "type": self.type,
            "content": self.content,
            "timestamp": self.timestamp,
        }


class ConversationState(TypedDict, total=False):
    """
    Shared state for the LangGraph conversational workflow.
    
    All agents read from and write to this state.
    State transitions handle agent communication automatically.
    """
    
    # =========================================================================
    # Input Fields
    # =========================================================================
    user_id: str
    session_id: str
    message: str
    conversation_history: List[Dict[str, str]]
    
    # =========================================================================
    # Intent Classification (Intent Classifier Node)
    # =========================================================================
    intent: Literal["general", "clothing"]
    
    # =========================================================================
    # Query Analysis (Query Analyzer Node)
    # =========================================================================
    search_scope: Literal["commerce", "wardrobe", "both"]
    extracted_filters: Optional[Dict[str, Any]]
    # Example extracted_filters:
    # {
    #     "category": "TOP",
    #     "subCategory": "Jacket",
    #     "brand": "Zara",
    #     "colorHex": "#000000",
    #     "occasion": "formal",
    # }
    
    # =========================================================================
    # User Context (Fetched via MCP by Recommender Agent)
    # =========================================================================
    user_profile: Optional[Dict[str, Any]]
    # Example user_profile:
    # {
    #     "id": "user_123",
    #     "email": "user@example.com",
    #     "preferences": {"sizes": {"top": "M"}, "brands": ["Zara"]},
    # }
    
    style_dna: Optional[Dict[str, Any]]
    # Example style_dna:
    # {
    #     "colorSeason": "warm_autumn",
    #     "faceShape": "oval",
    #     "archetype": "classic",
    #     "recommendedColors": ["#8B4513", "#D2691E"],
    # }
    
    # =========================================================================
    # Clothing Workflow State (Recommender Agent)
    # =========================================================================
    retrieved_items: List[Dict[str, Any]]
    search_sources_used: List[str]  # ["commerce", "wardrobe", "web_search"]
    fallback_used: bool  # True if web search was used as fallback
    
    # =========================================================================
    # Analysis Result (Clothing Analyzer Agent)
    # =========================================================================
    analysis_result: Optional[Dict[str, Any]]
    # Contains: {"decision": "approve"|"refine"|"clarify", "approved": bool, "confidence": float, "notes": []}
    
    refinement_notes: Optional[List[str]]
    # Only set if analysis_result.decision == "refine"
    # Example: ["Need more formal options", "Require colors matching warm autumn palette"]
    
    needs_clarification: bool
    # Only set if analysis_result.decision == "clarify"
    
    clarification_question: Optional[str]
    # Only set if needs_clarification == True
    # Example: "What occasion is this outfit for?"
    
    # =========================================================================
    # Output Fields
    # =========================================================================
    final_response: str
    streaming_events: List[Dict[str, Any]]
    
    # =========================================================================
    # Metadata and Tracing
    # =========================================================================
    metadata: Dict[str, Any]
    # Contains: {
    #     "input_safe": bool,
    #     "output_safe": bool,
    #     "agent_used": str,
    #     "tools_called": List[str],
    #     "query_analysis": Dict,
    #     "search_performed": Dict,
    #     "refinement_applied": bool,
    # }
    
    langfuse_trace_id: Optional[str]
    iteration: int  # Track refinement iterations (max 3)


def create_initial_state(
    user_id: str,
    session_id: str,
    message: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
) -> ConversationState:
    """
    Create an initial conversation state for a new workflow execution.
    
    Args:
        user_id: The user's identifier
        session_id: The chat session identifier
        message: The user's current message
        conversation_history: Previous messages in the conversation
        
    Returns:
        Initial ConversationState with default values
    """
    return ConversationState(
        user_id=user_id,
        session_id=session_id,
        message=message,
        conversation_history=conversation_history or [],
        intent=None,
        search_scope=None,
        extracted_filters=None,
        user_profile=None,
        style_dna=None,
        retrieved_items=[],
        search_sources_used=[],
        fallback_used=False,
        analysis_result=None,
        refinement_notes=None,
        needs_clarification=False,
        clarification_question=None,
        final_response="",
        streaming_events=[],
        metadata={},
        langfuse_trace_id=None,
        iteration=0,
    )


def validate_state(state: ConversationState) -> List[str]:
    """
    Validate the conversation state.
    
    Args:
        state: The state to validate
        
    Returns:
        List of validation error messages (empty if valid)
    """
    errors = []
    
    # Required fields
    if not state.get("user_id"):
        errors.append("user_id is required")
    if not state.get("session_id"):
        errors.append("session_id is required")
    if not state.get("message"):
        errors.append("message is required")
    
    # Iteration limit
    if state.get("iteration", 0) > 3:
        errors.append("iteration limit exceeded (max 3)")
    
    # Intent validation
    intent = state.get("intent")
    if intent and intent not in ["general", "clothing"]:
        errors.append(f"invalid intent: {intent}")
    
    # Search scope validation
    scope = state.get("search_scope")
    if scope and scope not in ["commerce", "wardrobe", "both"]:
        errors.append(f"invalid search_scope: {scope}")
    
    return errors
