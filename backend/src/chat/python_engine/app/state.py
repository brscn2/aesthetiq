from typing import TypedDict, Literal, Optional, Dict, Any, List

Intent = Literal[
    "chat",
    "fashion_knowledge",
    "trend",
    "product_recommendation"
]

class GraphState(TypedDict, total=False):
    # Current turn
    user_message: str
    intent: Intent
    confidence: float

    # Memory
    trend_data: Optional[Dict[str, Any]]
    user_analysis: Optional[Dict[str, Any]]
    inferred_preferences: Optional[Dict[str, Any]]

    # Conversation tracking
    active_agent: str
    last_agent: Optional[str]

    # Output
    response: Optional[str]
