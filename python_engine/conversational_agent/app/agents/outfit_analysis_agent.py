"""Outfit Analysis Agent for comparing and evaluating attached outfits.

This agent handles outfit_analysis tasks:
- Compare attached outfits
- Explain which outfit fits the user's style DNA
- Provide qualitative feedback without searching for new items
"""

from typing import Any, Dict, List, Optional
import json

from app.workflows.state import ConversationState
from app.services.llm_service import get_llm_service
from app.services.tracing.langfuse_service import get_tracing_service
from app.mcp import get_mcp_tools
from app.core.logger import get_logger

logger = get_logger(__name__)


OUTFIT_ANALYSIS_PROMPT = """You are an expert fashion stylist.

You analyze ONLY the attached outfits and the user's style DNA.
Do NOT search for new items or suggest shopping unless explicitly asked.
If the user asks to compare outfits, explain your reasoning and pick a winner if requested.
Keep the response concise and grounded in the provided outfit details.
"""


def _build_outfit_context(attached_outfits: List[Dict[str, Any]]) -> str:
    if not attached_outfits:
        return "No attached outfits provided."

    lines = ["Attached outfits:"]
    for outfit in attached_outfits:
        if not isinstance(outfit, dict):
            continue
        name = outfit.get("name", "Outfit")
        items = outfit.get("items", {}) if isinstance(outfit.get("items"), dict) else {}

        def _item_label(label: str, key: str) -> Optional[str]:
            item = items.get(key)
            if isinstance(item, dict):
                name_value = item.get("name") or item.get("category") or label
                return f"- {label}: {name_value}"
            return None

        lines.append(f"- {name}:")
        for label, key in (
            ("Top", "top"),
            ("Bottom", "bottom"),
            ("Outerwear", "outerwear"),
            ("Footwear", "footwear"),
            ("Dress", "dress"),
        ):
            entry = _item_label(label, key)
            if entry:
                lines.append(f"  {entry}")

        accessories = items.get("accessories") or []
        if isinstance(accessories, list) and accessories:
            accessory_names = []
            for acc in accessories:
                if isinstance(acc, dict):
                    accessory_names.append(
                        acc.get("name") or acc.get("category") or "Accessory"
                    )
            if accessory_names:
                lines.append(f"  - Accessories: {', '.join(accessory_names)}")

    return "\n".join(lines)


async def outfit_analysis_agent_node(state: ConversationState) -> Dict[str, Any]:
    """
    Outfit analysis agent node - compares and evaluates attached outfits.

    Reads:
        - state["message"]: User's request
        - state["attached_outfits"]: Attached outfits to analyze
        - state["user_id"]: For fetching style DNA

    Writes:
        - state["final_response"]: Analysis response
        - state["metadata"]: Updated with agent info
    """
    message = state.get("message", "")
    user_id = state.get("user_id", "")
    attached_outfits = state.get("attached_outfits") or []
    trace_id = state.get("langfuse_trace_id")

    logger.info(f"Outfit analysis agent processing: {message[:80]}...")

    llm_service = get_llm_service()
    tracing_service = get_tracing_service()

    def _normalize_tool_result(result: Any) -> Optional[Dict[str, Any]]:
        if isinstance(result, dict):
            return result
        if isinstance(result, list) and result:
            first = result[0]
            if isinstance(first, dict):
                return first
        if isinstance(result, str):
            try:
                parsed = json.loads(result)
                if isinstance(parsed, dict):
                    return parsed
                if isinstance(parsed, list) and parsed:
                    first = parsed[0]
                    if isinstance(first, dict):
                        return first
            except Exception:
                return None
        if hasattr(result, "model_dump"):
            try:
                return result.model_dump()
            except Exception:
                return None
        if hasattr(result, "dict"):
            try:
                return result.dict()
            except Exception:
                return None
        if hasattr(result, "style_dna"):
            try:
                return {"style_dna": getattr(result, "style_dna")}
            except Exception:
                return None
        if hasattr(result, "profile"):
            try:
                return {"profile": getattr(result, "profile")}
            except Exception:
                return None
        if hasattr(result, "data"):
            try:
                data_value = getattr(result, "data")
                if isinstance(data_value, dict):
                    return data_value
            except Exception:
                return None
        if hasattr(result, "__dict__"):
            try:
                return result.__dict__
            except Exception:
                return None
        return None

    def _extract_dict_value(tool_result: Any, *keys: str) -> Optional[Dict[str, Any]]:
        data = _normalize_tool_result(tool_result)
        if isinstance(data, dict):
            for key in keys:
                if key in data:
                    value = data.get(key)
                    return value if isinstance(value, dict) else data
            return data
        return None

    # Fetch style DNA (tool-limited: only get_style_dna)
    style_dna = state.get("style_dna")
    user_profile = state.get("user_profile")
    if not style_dna:
        try:
            tools = await get_mcp_tools()
            tools_by_name = {tool.name: tool for tool in tools if hasattr(tool, "name")}
            tool = tools_by_name.get("get_style_dna")
            if tool:
                tool_result = await tool.ainvoke({"user_id": user_id})
                extracted = _extract_dict_value(
                    tool_result, "style_dna", "data", "result"
                )
                if isinstance(extracted, dict) and "style_dna" in extracted:
                    style_dna = extracted.get("style_dna")
                elif isinstance(extracted, dict):
                    nested = extracted.get("data") or extracted.get("result")
                    if isinstance(nested, dict) and "style_dna" in nested:
                        style_dna = nested.get("style_dna")
                    else:
                        style_dna = extracted
                if not style_dna:
                    logger.warning("get_style_dna returned empty result")
                if trace_id:
                    tracing_service.log_tool_call(
                        trace_id=trace_id,
                        tool_name="get_style_dna",
                        input_params={"user_id": user_id},
                        output=str(tool_result)[:500] if tool_result else "empty",
                    )
            else:
                logger.warning("get_style_dna tool not available from MCP servers")
        except Exception as e:
            logger.warning(f"Failed to fetch style DNA: {e}")

    if not user_profile:
        try:
            tools = await get_mcp_tools()
            tools_by_name = {tool.name: tool for tool in tools if hasattr(tool, "name")}
            tool = tools_by_name.get("get_user_profile")
            if tool:
                tool_result = await tool.ainvoke({"user_id": user_id})
                extracted = _extract_dict_value(
                    tool_result, "profile", "data", "result"
                )
                if isinstance(extracted, dict) and "profile" in extracted:
                    user_profile = extracted.get("profile")
                elif isinstance(extracted, dict):
                    nested = extracted.get("data") or extracted.get("result")
                    if isinstance(nested, dict) and "profile" in nested:
                        user_profile = nested.get("profile")
                    else:
                        user_profile = extracted
                if not user_profile:
                    logger.warning("get_user_profile returned empty result")
                if trace_id:
                    tracing_service.log_tool_call(
                        trace_id=trace_id,
                        tool_name="get_user_profile",
                        input_params={"user_id": user_id},
                        output=str(tool_result)[:500] if tool_result else "empty",
                    )
            else:
                logger.warning("get_user_profile tool not available from MCP servers")
        except Exception as e:
            logger.warning(f"Failed to fetch user profile: {e}")

    outfit_context = _build_outfit_context(attached_outfits)

    prompt = f"""
User request: {message}

{outfit_context}

User style DNA: {style_dna or 'Not available'}

User profile: {user_profile or 'Not available'}

Analyze the outfits based on the request and the user's style DNA. Provide a clear comparison if asked.
"""

    response = await llm_service.chat_with_history(
        system_prompt=OUTFIT_ANALYSIS_PROMPT,
        user_message=prompt,
    )

    if trace_id:
        tracing_service.log_llm_call(
            trace_id=trace_id,
            agent_name="outfit_analysis_agent",
            input_text=prompt[:1000],
            output_text=response[:500] if response else "",
            metadata={"attached_outfits": len(attached_outfits)},
        )

    return {
        "final_response": response,
        "style_dna": style_dna,
        "user_profile": user_profile,
        "metadata": {
            **state.get("metadata", {}),
            "agent_used": "outfit_analysis",
        },
    }
