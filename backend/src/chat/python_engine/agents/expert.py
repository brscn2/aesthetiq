import json
from langchain_core.messages import SystemMessage, HumanMessage
from llm.gemini import get_llm
from tools.user_analysis import user_analysis_tool
from app.state import GraphState

llm = get_llm()

SYSTEM = """
You are AesthetIQ's Fashion Expert Agent.
Give concrete outfit recommendations.
"""

def fashion_expert_agent(state: GraphState) -> GraphState:
    analysis = user_analysis_tool()

    payload = {
        "user_request": state["user_message"],
        "user_analysis": analysis,
        "trend_context": state.get("trend_data")
    }

    msg = llm.invoke([
        SystemMessage(content=SYSTEM),
        HumanMessage(content=json.dumps(payload, ensure_ascii=False))
    ])

    return {
        **state,
        "user_analysis": analysis,
        "response": msg.content,
        "last_agent": state.get("active_agent"),
        "active_agent": "fashion_expert",
    }

