"""Outfit Analysis Agent for comparing and evaluating attached outfits.

This agent handles outfit_analysis tasks:
- Compare attached outfits
- Explain which outfit fits the user's style DNA
- Provide qualitative feedback without searching for new items
"""

from typing import Any, Dict, List, Optional
import json

from langchain_core.messages import HumanMessage, SystemMessage

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
If user profile data is available (e.g., gender or birth_date), you may use it to judge age-appropriate or fit considerations without stereotyping.
"""


def _item_detail_str(label: str, item: Dict[str, Any]) -> str:
    """Format a single item with full details (type, colors, brand, notes)."""
    name_value = item.get("name") or item.get("category") or label
    parts = [f"- {label}: {name_value}"]
    if item.get("subCategory"):
        parts.append(f"  type: {item.get('subCategory')}")
    if item.get("colors"):
        c = item.get("colors")
        colors_str = ", ".join(c) if isinstance(c, list) else str(c)
        parts.append(f"  color(s): {colors_str}")
    if item.get("brand"):
        parts.append(f"  brand: {item.get('brand')}")
    if item.get("notes"):
        parts.append(f"  notes: {item.get('notes')}")
    return "\n".join(parts) if len(parts) > 1 else parts[0]


def _build_outfit_context(attached_outfits: List[Dict[str, Any]]) -> str:
    if not attached_outfits:
        return "No attached outfits provided."

    lines = ["Attached outfits:"]
    for outfit in attached_outfits:
        if not isinstance(outfit, dict):
            continue
        name = outfit.get("name", "Outfit")
        items = outfit.get("items", {}) if isinstance(outfit.get("items"), dict) else {}

        lines.append(f"- {name}:")
        for label, key in (
            ("Top", "top"),
            ("Bottom", "bottom"),
            ("Outerwear", "outerwear"),
            ("Footwear", "footwear"),
            ("Dress", "dress"),
        ):
            item = items.get(key)
            if isinstance(item, dict):
                lines.append(f"  {_item_detail_str(label, item)}")

        accessories = items.get("accessories") or []
        if isinstance(accessories, list) and accessories:
            for acc in accessories:
                if isinstance(acc, dict):
                    lines.append(f"  {_item_detail_str('Accessory', acc)}")

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
    attached_images = state.get("attached_images") or []
    trace_id = state.get("langfuse_trace_id")
    conversation_history = state.get("conversation_history", [])

    logger.info(f"Outfit analysis agent processing: {message[:80]}... (images: {len(attached_images)})")

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

    # Use vision LLM when user attached images
    if attached_images:
        logger.info("Using vision LLM for outfit analysis with attached images")
        # Build messages with conversation history for context
        messages: List[Any] = [SystemMessage(content=OUTFIT_ANALYSIS_PROMPT)]
        
        # Include conversation history for context
        if conversation_history:
            for msg in conversation_history[-5:]:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if content:
                    if role == "user":
                        messages.append(HumanMessage(content=content))
                    elif role == "assistant":
                        from langchain_core.messages import AIMessage
                        messages.append(AIMessage(content=content))
        
        # Build multimodal message with images
        image_note = (
            "\n\n[IMPORTANT: The user attached image(s). Analyze the clothing in the image(s). "
            "If multiple images, focus on the LAST/MOST RECENT one unless the user references earlier images.]"
        )
        content: List[Any] = [{"type": "text", "text": prompt + image_note}]
        for img_url in attached_images:
            content.append({"type": "image_url", "image_url": {"url": img_url}})
        messages.append(HumanMessage(content=content))
        
        resp = await llm_service.vision_llm.ainvoke(messages)
        response = resp.content if hasattr(resp, "content") else str(resp)
    else:
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
