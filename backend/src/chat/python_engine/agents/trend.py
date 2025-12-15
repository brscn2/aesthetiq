from tools.trend import trend_fetch_tool
from app.state import GraphState

def trend_agent(state: GraphState) -> GraphState:
    trend_data = trend_fetch_tool(state["user_message"])

    response = (
        f"Key trends for {trend_data['season']}:\n"
        + "\n".join(f"- {t}" for t in trend_data["trends"])
        + "\n\nIf you’d like, I can suggest an outfit tailored to you based on these trends."
    )

    return {
        **state,
        "trend_data": trend_data,
        "response": response,
        "last_agent": state.get("active_agent"),
        "active_agent": "trend",
    }

