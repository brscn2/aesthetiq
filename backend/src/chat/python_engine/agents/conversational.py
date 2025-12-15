from langchain_core.messages import SystemMessage, HumanMessage
from llm.gemini import get_llm
from app.state import GraphState

llm = get_llm()

SYSTEM = """
You are AesthetIQ's Conversational Fashion Agent.
Never recommend outfits or products.
"""

def conversational_agent(state: GraphState) -> GraphState:
    msg = llm.invoke([
        SystemMessage(content=SYSTEM),
        HumanMessage(content=state["user_message"])
    ])

    return {
        **state,
        "response": msg.content,
        "last_agent": state.get("active_agent"),
        "active_agent": "conversational",
    }

