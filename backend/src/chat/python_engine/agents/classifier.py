import json, re
from langchain_core.messages import SystemMessage, HumanMessage
from llm.gemini import get_llm
from app.state import GraphState

llm = get_llm()

CLASSIFIER_SYS = """
Classify the user's message into EXACTLY one intent:
chat | fashion_knowledge | trend | product_recommendation
Return ONLY JSON.
"""

def classify_intent(state: GraphState) -> GraphState:
    msg = llm.invoke([
        SystemMessage(content=CLASSIFIER_SYS),
        HumanMessage(content=state["user_message"])
    ])

    raw = (msg.content or "").strip()
    match = re.search(r"\{[\s\S]*\}", raw)

    if match:
        try:
            data = json.loads(match.group())
        except json.JSONDecodeError:
            data = {"intent": "fashion_knowledge", "confidence": 0.5}
    else:
        data = {"intent": "fashion_knowledge", "confidence": 0.5}

    return {
        **state,
        "intent": data["intent"],
        "confidence": float(data.get("confidence", 0.5))
    }
