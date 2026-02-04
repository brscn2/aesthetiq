"""LangGraph state definitions for the conversational workflow."""

from typing import TypedDict, List, Dict, Any, Optional, Literal
from dataclasses import dataclass, field
from enum import Enum


class ItemFeedbackType(str, Enum):
    """Type of feedback for an item."""

    LIKE = "like"
    DISLIKE = "dislike"
    IRRELEVANT = "irrelevant"


class ItemFeedbackReason(str, Enum):
    """Reason for disliking an item."""

    WRONG_COLOR = "wrong_color"
    WRONG_SIZE = "wrong_size"
    TOO_EXPENSIVE = "too_expensive"
    POOR_QUALITY = "poor_quality"
    NOT_STYLE = "not_style"
    NOT_OCCASION = "not_occasion"
    ALREADY_HAVE = "already_have"
    OTHER = "other"


@dataclass
class ItemFeedback:
    """Feedback for a single item."""

    item_id: str
    feedback: ItemFeedbackType
    reason: Optional[ItemFeedbackReason] = None
    reason_text: Optional[str] = None  # Free-form reason if "other"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "item_id": self.item_id,
            "feedback": self.feedback.value,
            "reason": self.reason.value if self.reason else None,
            "reason_text": self.reason_text,
        }


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

    type: str  # "metadata", "status", "node_start", "node_end", "tool_call", "items_found", "analysis", "chunk", "done", "error"
    content: Any
    timestamp: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "type": self.type,
            "content": self.content,
            "timestamp": self.timestamp,
        }

    @classmethod
    def metadata(cls, session_id: str, user_id: str, **kwargs) -> "StreamEvent":
        """Create a metadata event."""
        from datetime import datetime

        return cls(
            type="metadata",
            content={"session_id": session_id, "user_id": user_id, **kwargs},
            timestamp=datetime.utcnow().isoformat(),
        )

    @classmethod
    def status(cls, message: str) -> "StreamEvent":
        """Create a status event with a human-readable message."""
        from datetime import datetime

        return cls(
            type="status",
            content={"message": message},
            timestamp=datetime.utcnow().isoformat(),
        )

    @classmethod
    def node_start(cls, node: str, display_name: str = None) -> "StreamEvent":
        """Create a node_start event."""
        from datetime import datetime

        return cls(
            type="node_start",
            content={"node": node, "display_name": display_name or node},
            timestamp=datetime.utcnow().isoformat(),
        )

    @classmethod
    def node_end(cls, node: str) -> "StreamEvent":
        """Create a node_end event."""
        from datetime import datetime

        return cls(
            type="node_end",
            content={"node": node},
            timestamp=datetime.utcnow().isoformat(),
        )

    @classmethod
    def tool_call(cls, tool: str, input_data: Any = None) -> "StreamEvent":
        """Create a tool_call event."""
        from datetime import datetime

        return cls(
            type="tool_call",
            content={
                "tool": tool,
                "input": str(input_data)[:200] if input_data else None,
            },
            timestamp=datetime.utcnow().isoformat(),
        )

    @classmethod
    def items_found(cls, count: int, sources: List[str] = None) -> "StreamEvent":
        """Create an items_found event."""
        from datetime import datetime

        return cls(
            type="items_found",
            content={"count": count, "sources": sources or []},
            timestamp=datetime.utcnow().isoformat(),
        )

    @classmethod
    def analysis(cls, decision: str, confidence: float = None) -> "StreamEvent":
        """Create an analysis event."""
        from datetime import datetime

        return cls(
            type="analysis",
            content={"decision": decision, "confidence": confidence},
            timestamp=datetime.utcnow().isoformat(),
        )

    @classmethod
    def chunk(cls, content: str) -> "StreamEvent":
        """Create a chunk event for streaming response text."""
        from datetime import datetime

        return cls(
            type="chunk",
            content={"content": content},
            timestamp=datetime.utcnow().isoformat(),
        )

    @classmethod
    def done(
        cls, response: str, intent: str = None, items: List = None, **kwargs
    ) -> "StreamEvent":
        """Create a done event with the final response."""
        from datetime import datetime

        return cls(
            type="done",
            content={
                "response": response,
                "intent": intent,
                "items": items or [],
                **kwargs,
            },
            timestamp=datetime.utcnow().isoformat(),
        )

    @classmethod
    def error(cls, message: str) -> "StreamEvent":
        """Create an error event."""
        from datetime import datetime

        return cls(
            type="error",
            content={"message": message},
            timestamp=datetime.utcnow().isoformat(),
        )


class WorkflowStatus(str, Enum):
    """Status of the workflow execution."""

    ACTIVE = "active"
    AWAITING_CLARIFICATION = "awaiting_clarification"
    COMPLETED = "completed"


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
    attached_outfits: Optional[List[Dict[str, Any]]]
    swap_intents: Optional[List[Dict[str, Any]]]
    attached_images: Optional[List[str]]
    # Base64 data URLs of user-uploaded images (e.g. for "what is this?" questions)

    # =========================================================================
    # Workflow Control (for multi-turn conversations)
    # =========================================================================
    workflow_status: Literal["active", "awaiting_clarification", "completed"]
    is_clarification_response: (
        bool  # True if this message is a response to a clarification
    )
    pending_clarification_context: Optional[Dict[str, Any]]
    # Stores context when awaiting clarification:
    # {
    #     "original_message": str,
    #     "clarification_question": str,
    #     "extracted_filters": Dict,
    #     "search_scope": str,
    #     "retrieved_items": List,
    #     "iteration": int,
    # }

    # =========================================================================
    # Intent Classification (Intent Classifier Node)
    # =========================================================================
    intent: Literal["general", "clothing"]
    task_type: Literal["general", "item_search", "outfit_analysis"]

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
    # Contains: {"decision": "approve"|"refine"|"clarify"|"approve_with_feedback", "approved": bool, "confidence": float, "notes": []}

    refinement_notes: Optional[List[str]]
    # Only set if analysis_result.decision == "refine"
    # Example: ["Need more formal options", "Require colors matching warm autumn palette"]

    needs_clarification: bool
    # Only set if analysis_result.decision == "clarify"

    clarification_question: Optional[str]
    # Only set if needs_clarification == True
    # Example: "What occasion is this outfit for?"

    # =========================================================================
    # Item-Level Feedback (User feedback on individual items)
    # =========================================================================
    item_feedback_pending: Optional[List[Dict[str, Any]]]
    # Items in current session that user has liked/disliked
    # Example: [{"item_id": "123", "feedback": "dislike", "reason": "wrong_color"}]
    # Only used during current conversation; persisted to DB separately

    item_feedback_applied: bool
    # True if disliked items were soft-de-ranked in the last search

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
    pending_context: Optional[Dict[str, Any]] = None,
    attached_outfits: Optional[List[Dict[str, Any]]] = None,
    swap_intents: Optional[List[Dict[str, Any]]] = None,
    attached_images: Optional[List[str]] = None,
) -> ConversationState:
    """
    Create an initial conversation state for a new workflow execution.

    Args:
        user_id: The user's identifier
        session_id: The chat session identifier
        message: The user's current message
        conversation_history: Previous messages in the conversation
        pending_context: Previous workflow context if this is a clarification response

    Returns:
        Initial ConversationState with default values
    """
    # Check if this is a response to a pending clarification
    is_clarification = pending_context is not None

    state = ConversationState(
        user_id=user_id,
        session_id=session_id,
        message=message,
        conversation_history=conversation_history or [],
        attached_outfits=attached_outfits or [],
        swap_intents=swap_intents or [],
        attached_images=attached_images or [],
        # Workflow control
        workflow_status="active",
        is_clarification_response=is_clarification,
        pending_clarification_context=pending_context,
        # Intent and query analysis
        intent=None,
        search_scope=None,
        extracted_filters=None,
        user_profile=None,
        style_dna=None,
        # Clothing workflow
        retrieved_items=[],
        search_sources_used=[],
        fallback_used=False,
        # Analysis
        analysis_result=None,
        refinement_notes=None,
        needs_clarification=False,
        clarification_question=None,
        # Item feedback
        item_feedback_pending=None,
        item_feedback_applied=False,
        # Output
        final_response="",
        streaming_events=[],
        metadata={},
        langfuse_trace_id=None,
        iteration=0,
    )

    # If resuming from clarification, restore previous context
    if pending_context:
        state["extracted_filters"] = pending_context.get("extracted_filters")
        state["search_scope"] = pending_context.get("search_scope")
        state["retrieved_items"] = pending_context.get("retrieved_items", [])
        state["iteration"] = pending_context.get("iteration", 0)
        state["intent"] = "clothing"  # Clarification is always in clothing context
        # Restore style_dna and user_profile to avoid re-fetching
        state["style_dna"] = pending_context.get("style_dna")
        state["user_profile"] = pending_context.get("user_profile")
        state["attached_outfits"] = pending_context.get(
            "attached_outfits", attached_outfits or []
        )
        state["swap_intents"] = pending_context.get("swap_intents", swap_intents or [])

    return state


def create_clarification_context(state: ConversationState) -> Dict[str, Any]:
    """
    Create a context snapshot when clarification is needed.

    This context will be stored and used to resume the workflow
    when the user provides their clarification response.

    Args:
        state: Current workflow state

    Returns:
        Context dictionary to be stored
    """
    return {
        "original_message": state.get("message", ""),
        "clarification_question": state.get("clarification_question", ""),
        "extracted_filters": state.get("extracted_filters"),
        "search_scope": state.get("search_scope"),
        "retrieved_items": state.get("retrieved_items", []),
        "iteration": state.get("iteration", 0),
        "style_dna": state.get("style_dna"),
        "user_profile": state.get("user_profile"),
        "intent": state.get("intent"),
        "attached_outfits": state.get("attached_outfits", []),
        "swap_intents": state.get("swap_intents", []),
    }


def merge_clarification_into_filters(
    existing_filters: Optional[Dict[str, Any]],
    clarification_response: str,
    clarification_question: str,
) -> Dict[str, Any]:
    """
    Minimal fallback for merging clarification response into filters.

    Primary extraction happens via LLM in merge_clarification_context_node.
    This is only called if LLM extraction fails - just preserves existing filters.

    Args:
        existing_filters: Previously extracted filters
        clarification_response: User's response (logged for debugging)
        clarification_question: The question asked (logged for debugging)

    Returns:
        Existing filters (unchanged)
    """
    # LLM extraction in main_workflow.py handles the heavy lifting
    # This fallback just preserves existing filters
    return existing_filters.copy() if existing_filters else {}


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

    task_type = state.get("task_type")
    if task_type and task_type not in ["general", "item_search", "outfit_analysis"]:
        errors.append(f"invalid task_type: {task_type}")

    # Search scope validation
    scope = state.get("search_scope")
    if scope and scope not in ["commerce", "wardrobe", "both"]:
        errors.append(f"invalid search_scope: {scope}")

    return errors
