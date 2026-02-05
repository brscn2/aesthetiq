"""Conversation Agent for handling general fashion questions.

This agent handles the "general" intent path:
- Fashion advice and tips
- Latest trends discussion
- Style guidance
- Color theory explanations
"""

from typing import Any, Dict, List, Optional

import json
import traceback

from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage
from langgraph.prebuilt import create_react_agent

from app.workflows.state import ConversationState
from app.services.llm_service import get_llm_service
from app.services.tracing.langfuse_service import get_tracing_service
from app.mcp import get_mcp_tools
from app.core.logger import get_logger

logger = get_logger(__name__)


CONVERSATION_AGENT_PROMPT = """You are AesthetIQ, an expert AI fashion assistant with deep knowledge of:
- Fashion trends and style advice
- Color theory and seasonal color analysis
- Personal styling and wardrobe curation
- Fashion history and designer knowledge
- Body types and flattering styles

You help users with general fashion questions, provide style advice, and discuss trends.

**Guidelines:**
1. Be friendly, knowledgeable, and helpful
2. Provide specific, actionable advice
3. Consider the user's personal style when relevant - use tools to fetch their style DNA
4. For personalized advice or trends, fetch user profile (get_user_profile) when needed; use gender and birth_date if available to tailor suggestions
4. Reference current trends when appropriate - use web search tools if needed
5. Personalize advice based on user's style profile when available
6. **User-uploaded images:** When the user attached image(s) to their message, they are asking about what is in the image(s). Do NOT reply with "which clothing item?", "please specify", or "what style/color/occasion?" — look at the image and describe the garment (style, color, occasion, etc.). If multiple images in one message, refer ONLY to the last image. Never describe an image from an earlier message in the chat.

7. **CRITICAL — Color:** Never use "blue", "#0000ff", or any color as a default, placeholder, or guess when the actual color is unknown or not provided. If color is not specified in the context (attached items, image, or message), say "color not specified" or omit color—do not invent one.
8. **Attached outfit/item context (source of truth for colors):** When the message includes an "Attached outfit context" section, the colors listed there are from the user's wardrobe and are the ONLY correct colors. If it says "color(s): Yellow" then the item is yellow—never reply that it is blue or #0000ff. If it says "not specified" then say the color was not provided. Do not override wardrobe colors with what you think you see in an image; trust the attached context. When multiple similar items are attached, identify each by its heading or color (e.g. "the red t-shirt", "the navy one").

Keep responses concise but informative. Aim for 2-3 paragraphs maximum unless more detail is requested.
"""


async def conversation_agent_node(state: ConversationState) -> Dict[str, Any]:
    """
    Conversation agent node - handles general fashion questions.

    Reads:
        - state["message"]: The user's current message
        - state["conversation_history"]: Previous messages for context
        - state["user_id"]: For fetching style DNA if needed

    Writes:
        - state["final_response"]: The agent's response
        - state["metadata"]: Updated with agent info and tools used
    """
    message = state.get("message", "")
    conversation_history = state.get("conversation_history", [])
    user_id = state.get("user_id", "")
    trace_id = state.get("langfuse_trace_id")
    attached_outfits = state.get("attached_outfits") or []
    swap_intents = state.get("swap_intents") or []
    attached_images = state.get("attached_images") or []

    logger.info(f"Conversation agent processing: {message[:50]}... (images: {len(attached_images)})")
    # [DEBUG] Log raw attached_outfits colors received from backend
    for idx, outfit in enumerate(attached_outfits):
        if not isinstance(outfit, dict):
            logger.warning(f"[Chat DEBUG] attached_outfits[{idx}] is not a dict: {type(outfit)}")
            continue
        items = outfit.get("items") if isinstance(outfit.get("items"), dict) else {}
        for slot in ("top", "bottom", "outerwear", "footwear", "dress"):
            item = items.get(slot)
            if isinstance(item, dict) and item.get("colors"):
                logger.info(f"[Chat DEBUG] Python received outfit {idx + 1} {slot}: colors={item.get('colors')}")
        for acc_idx, acc in enumerate(items.get("accessories") or []):
            if isinstance(acc, dict) and acc.get("colors"):
                logger.info(f"[Chat DEBUG] Python received outfit {idx + 1} accessory {acc_idx + 1}: colors={acc.get('colors')}")

    # Get services
    llm_service = get_llm_service()
    tracing_service = get_tracing_service()

    # Log agent start
    if trace_id:
        tracing_service.log_agent_transition(
            trace_id=trace_id,
            from_agent="intent_classifier",
            to_agent="conversation_agent",
            reason="General intent detected",
        )

    try:
        # Get all MCP tools - agent decides which to use based on task
        tools = await get_mcp_tools()
        tools_used = []

        # Initialize variables that may be populated by tools
        # (defined here to avoid UnboundLocalError when tools is empty)
        tool_call_ids = {}
        style_dna = None
        color_season = None
        recommended_colors = None
        trends_data = None
        user_profile = state.get("user_profile")

        def _build_outfit_context() -> str:
                if not attached_outfits and not swap_intents:
                    return ""

                lines = [
                    "\n\n--- Attached outfit context ---",
                    "The colors listed below are from the user's wardrobe and are the source of truth. Use only these colors in your answer; do not say blue or #0000ff unless that exact color appears below.",
                    ""
                ]
                for idx, outfit in enumerate(attached_outfits):
                    if not isinstance(outfit, dict):
                        continue
                    name = outfit.get("name", "Outfit")
                    # When multiple items are attached (e.g. 2 t-shirts), add index: "1. T-shirt (Red)"
                    if len(attached_outfits) > 1:
                        name = f"{idx + 1}. {name}"
                    items = (
                        outfit.get("items", {})
                        if isinstance(outfit.get("items"), dict)
                        else {}
                    )

                    def _item_detail(label: str, key: str) -> Optional[str]:
                        item = items.get(key)
                        if not isinstance(item, dict):
                            return None
                        name_value = (
                            item.get("name") or item.get("category") or label
                        )
                        parts = [f"- {label}: {name_value}"]
                        if item.get("subCategory"):
                            parts.append(f"  type: {item.get('subCategory')}")
                        # Always include color line so the model never invents one (e.g. "blue")
                        c = item.get("colors")
                        if c and isinstance(c, list) and len(c) > 0:
                            colors_str = ", ".join(str(x) for x in c)
                            parts.append(f"  color(s): {colors_str}")
                        else:
                            parts.append(
                                "  color(s): not specified (do not guess or invent a color)"
                            )
                        if item.get("brand"):
                            parts.append(f"  brand: {item.get('brand')}")
                        if item.get("notes"):
                            parts.append(f"  notes: {item.get('notes')}")
                        return "\n".join(parts)

                    lines.append(f"- {name}:")
                    for label, key in (
                        ("Top", "top"),
                        ("Bottom", "bottom"),
                        ("Outerwear", "outerwear"),
                        ("Footwear", "footwear"),
                        ("Dress", "dress"),
                    ):
                        entry = _item_detail(label, key)
                        if entry:
                            lines.append(f"  {entry}")

                    accessories = items.get("accessories") or []
                    if isinstance(accessories, list) and accessories:
                        for acc in accessories:
                            if isinstance(acc, dict):
                                acc_name = (
                                    acc.get("name")
                                    or acc.get("category")
                                    or "Accessory"
                                )
                                acc_parts = [f"  - Accessory: {acc_name}"]
                                if acc.get("subCategory"):
                                    acc_parts.append(f"    type: {acc.get('subCategory')}")
                                c_acc = acc.get("colors")
                                if c_acc and isinstance(c_acc, list) and len(c_acc) > 0:
                                    acc_parts.append(
                                        f"    color(s): {', '.join(str(x) for x in c_acc)}"
                                    )
                                else:
                                    acc_parts.append(
                                        "    color(s): not specified (do not guess)"
                                    )
                                if acc.get("brand"):
                                    acc_parts.append(f"    brand: {acc.get('brand')}")
                                if acc.get("notes"):
                                    acc_parts.append(f"    notes: {acc.get('notes')}")
                                lines.append("\n".join(acc_parts))

                if swap_intents:
                    swaps = []
                    for intent in swap_intents:
                        if not isinstance(intent, dict):
                            continue
                        category = intent.get("category")
                        outfit_id = intent.get("outfitId")
                        if category and outfit_id:
                            swaps.append(f"{category} for outfit {outfit_id}")
                    if swaps:
                        lines.append(f"Swap intents: {', '.join(swaps)}")

                return "\n".join(lines)

        if tools:
            logger.info(f"Conversation agent has {len(tools)} tools available")

            # Use vision-capable model when user attached images (default model may not support images)
            llm_for_agent = llm_service.vision_llm if attached_images else llm_service.llm
            if attached_images:
                logger.info("Using vision LLM for message with attached images")
            agent = create_react_agent(
                llm_for_agent,
                tools,
                prompt=CONVERSATION_AGENT_PROMPT,
            )

            # Build messages with conversation history for context
            messages = []
            if conversation_history:
                for msg in conversation_history[-5:]:  # Last 5 messages
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    if role == "user":
                        messages.append(HumanMessage(content=content))
                    elif role == "assistant":
                        messages.append(AIMessage(content=content))

            # Add context about user if available (for tools); keep it brief so the model does not confuse it with the main question
            user_context = f"\n\n[User ID: {user_id}]" if user_id else ""
            if user_profile:
                user_context += f"\nUser profile: {user_profile}"
            outfit_context = _build_outfit_context()
            # When user uploaded images: describe the image(s). Do not ask "which item?" or "please specify".
            image_note = (
                "\n\n[IMPORTANT: The user attached image(s) below and is asking about them. "
                "Describe what you see in the image(s) (if multiple, use only the LAST image). Do NOT ask 'which item?', 'please specify', or for style/color/occasion — just describe the garment in the image.]"
            ) if attached_images else ""
            text_content = message + image_note + user_context + outfit_context

            # [DEBUG] Log the exact outfit context string sent to the LLM (to verify colors are present)
            if outfit_context:
                logger.info(f"[Chat DEBUG] Outfit context sent to LLM:\n{outfit_context}")

            # When user attaches images, send multimodal content so the LLM can see the image (vision)
            if attached_images:
                content: List[Any] = [{"type": "text", "text": text_content}]
                for img_url in attached_images:
                    content.append({"type": "image_url", "image_url": {"url": img_url}})
                messages.append(HumanMessage(content=content))
            else:
                messages.append(HumanMessage(content=text_content))

            # Invoke agent
            agent_result = await agent.ainvoke({"messages": messages})

            # Process messages to extract tool calls and results
            for msg in agent_result["messages"]:
                # Track tool calls from AIMessage
                if hasattr(msg, "tool_calls") and msg.tool_calls:
                    for tool_call in msg.tool_calls:
                        tool_name = tool_call.get("name", "unknown")
                        tool_call_id = tool_call.get("id", "")
                        tools_used.append(tool_name)
                        tool_call_ids[tool_call_id] = tool_name

                        # Log tool call to Langfuse
                        if trace_id:
                            tracing_service.log_tool_call(
                                trace_id=trace_id,
                                tool_name=tool_name,
                                input_params=tool_call.get("args", {}),
                                output="[pending]",
                            )

                # Extract actual results from ToolMessage objects
                if isinstance(msg, ToolMessage):
                    tool_call_id = getattr(msg, "tool_call_id", "")
                    tool_name = tool_call_ids.get(
                        tool_call_id, getattr(msg, "name", "unknown")
                    )
                    tool_content = msg.content

                    # Parse JSON content if possible
                    try:
                        tool_result = (
                            json.loads(tool_content)
                            if isinstance(tool_content, str)
                            else tool_content
                        )
                    except (json.JSONDecodeError, TypeError):
                        tool_result = tool_content

                    # Skip error results
                    if isinstance(tool_result, dict) and tool_result.get("error"):
                        logger.warning(
                            f"Tool '{tool_name}' returned error: {tool_result.get('error')}"
                        )
                        continue

                    # Extract style DNA
                    if tool_name == "get_style_dna":
                        if isinstance(tool_result, dict):
                            style_dna = tool_result.get("style_dna") or tool_result
                            logger.info(f"Extracted style_dna for conversation context")

                    # Extract color season
                    elif tool_name == "get_color_season":
                        if isinstance(tool_result, dict):
                            color_season = (
                                tool_result.get("season")
                                or tool_result.get("color_season")
                                or tool_result
                            )
                            logger.info(f"Extracted color_season: {color_season}")

                    # Extract style archetype
                    elif tool_name == "get_style_archetype":
                        if isinstance(tool_result, dict):
                            archetype = tool_result.get("archetype") or tool_result
                            if style_dna:
                                style_dna["archetype"] = archetype
                            else:
                                style_dna = {"archetype": archetype}
                            logger.info(f"Extracted style archetype")

                    # Extract recommended colors
                    elif tool_name == "get_recommended_colors":
                        if isinstance(tool_result, dict):
                            recommended_colors = (
                                tool_result.get("colors")
                                or tool_result.get("recommended_colors")
                                or tool_result
                            )
                            logger.info(f"Extracted recommended colors")

                    # Extract trends/web search data
                    elif tool_name in ["search_trends", "search_blogs", "web_search"]:
                        if isinstance(tool_result, dict):
                            trends_data = tool_result.get("results") or tool_result
                        else:
                            trends_data = tool_result
                        logger.info(f"Extracted {tool_name} results")

                    # Extract user profile
                    elif tool_name == "get_user_profile":
                        if isinstance(tool_result, dict):
                            user_profile = tool_result.get("profile") or tool_result
                        else:
                            user_profile = tool_result
                        logger.info("Extracted user profile for personalization")

                    # Log actual tool output to Langfuse
                    if trace_id:
                        tracing_service.log_tool_call(
                            trace_id=trace_id,
                            tool_name=f"{tool_name}_result",
                            input_params={},
                            output=str(tool_result)[:500] if tool_result else "empty",
                        )

            # Extract final response
            final_message = agent_result["messages"][-1]
            response = final_message.content

        else:
            logger.warning("No tools available, using direct LLM response")

            # Fallback: build messages (with optional vision when user attached images)
            # Must include outfit context here too so the model sees colors (no-tools path was missing it)
            user_context = f"\n\n[User ID: {user_id}]" if user_id else ""
            outfit_context = _build_outfit_context()
            image_note_fb = (
                "\n\n[IMPORTANT: The user attached image(s) and wants you to describe them. Describe the garment(s) in the image(s) (if multiple, use the LAST image only). Do NOT ask which item or please specify — just describe what you see.]"
            ) if attached_images else ""
            fallback_text = message + image_note_fb + user_context + outfit_context
            if outfit_context:
                logger.info(f"[Chat DEBUG] Fallback path: outfit context sent to LLM:\n{outfit_context}")

            fallback_messages: List[Any] = [SystemMessage(content=CONVERSATION_AGENT_PROMPT)]
            if conversation_history:
                for msg in conversation_history[-5:]:
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    if role == "user":
                        fallback_messages.append(HumanMessage(content=content))
                    elif role == "assistant":
                        fallback_messages.append(AIMessage(content=content))
            if attached_images:
                content: List[Any] = [{"type": "text", "text": fallback_text}]
                for img_url in attached_images:
                    content.append({"type": "image_url", "image_url": {"url": img_url}})
                fallback_messages.append(HumanMessage(content=content))
                logger.info("Fallback path: using vision LLM for attached images")
                resp = await llm_service.vision_llm.ainvoke(fallback_messages)
            else:
                fallback_messages.append(HumanMessage(content=fallback_text))
                resp = await llm_service.llm.ainvoke(fallback_messages)
            response = resp.content if hasattr(resp, "content") else str(resp)

        # Log LLM call to Langfuse
        if trace_id:
            tracing_service.log_llm_call(
                trace_id=trace_id,
                agent_name="conversation_agent",
                input_text=message,
                output_text=response[:500],
                metadata={"tools_used": tools_used},
            )

        logger.info(f"Conversation agent generated response ({len(response)} chars)")

        # Update metadata with extracted tool results
        metadata = state.get("metadata", {})
        metadata["agent_used"] = "conversation_agent"
        metadata["tools_called"] = tools_used
        if style_dna:
            metadata["style_dna_used"] = True
        if trends_data:
            metadata["trends_data_used"] = True
        if user_profile:
            metadata["user_profile_used"] = True

        # Build result with extracted data
        result = {
            "final_response": response,
            "metadata": metadata,
        }

        # Include style_dna if extracted (useful for downstream)
        if style_dna:
            result["style_dna"] = style_dna
        if user_profile:
            result["user_profile"] = user_profile

        return result

    except Exception as e:
        logger.error(f"Conversation agent failed: {e}")
        logger.error(traceback.format_exc())

        # Log error
        if trace_id:
            tracing_service.log_error(trace_id=trace_id, error=e)

        # Fallback response
        fallback_response = (
            "I'd be happy to help with your fashion question! "
            "However, I'm experiencing a temporary issue. "
            "Could you please try rephrasing your question or ask me again in a moment?"
        )

        metadata = state.get("metadata", {})
        metadata["agent_used"] = "conversation_agent"
        metadata["error"] = str(e)

        return {
            "final_response": fallback_response,
            "metadata": metadata,
        }
