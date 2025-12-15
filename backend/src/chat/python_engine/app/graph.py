from langgraph.graph import StateGraph, END
from app.state import GraphState
from agents.classifier import classify_intent
from agents.conversational import conversational_agent
from agents.trend import trend_agent
from agents.expert import fashion_expert_agent
from routing.router import route_after_classification

# Local fallback router to decide whether to continue looping or end
# It checks common flags set by agents (e.g., should_end) and routes accordingly.
def route_after_agent(state: GraphState):
    # Try multiple keys to be robust with different state implementations
    keys = ("should_end", "end", "terminate")
    def _get(k):
        try:
            # Support both attr and dict-like state
            if hasattr(state, k):
                v = getattr(state, k)
                return bool(v)
            if isinstance(state, dict):
                return bool(state.get(k))
            # If state has a .get method (Pydantic/BaseModel), use it
            if hasattr(state, "get"):
                return bool(state.get(k))
        except Exception:
            return False
        return False

    # If an agent explicitly requests continuation, loop; if it requests end, end.
    should_continue = _get("should_continue")
    should_end = any(_get(k) for k in keys)

    # Safety: if we have produced a response (common key names), and no continue flag, end.
    response_keys = ("response", "last_response", "agent_response", "output")
    has_response = any(_get(k) for k in response_keys)

    if should_end:
        return END
    if should_continue:
        return "classify"
    if has_response:
        return END

    # Default: keep looping to classify
    return "classify"


def build_graph():
    g = StateGraph(GraphState)

    g.add_node("classify", classify_intent)
    g.add_node("conversational", conversational_agent)
    g.add_node("trend", trend_agent)
    g.add_node("expert", fashion_expert_agent)

    g.set_entry_point("classify")

    # After classification, route to agents or END if router returns "END"
    g.add_conditional_edges(
        "classify",
        route_after_classification,
        {
            "conversational": "conversational",
            "trend": "trend",
            "expert": "expert",
            # Allow router to end the conversation explicitly
            "END": END,
        }
    )

    # After each agent, either go back to classify (loop) or END based on state flags
    g.add_conditional_edges("conversational", route_after_agent, {"classify": "classify", END: END})
    g.add_conditional_edges("trend", route_after_agent, {"classify": "classify", END: END})
    g.add_conditional_edges("expert", route_after_agent, {"classify": "classify", END: END})

    return g.compile()
