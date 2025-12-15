from app.state import GraphState

def route_after_classification(state: GraphState) -> str:
    intent = state["intent"]

    if intent == "product_recommendation":
        return "expert"

    if intent == "trend":
        return "trend"

    return "conversational"
