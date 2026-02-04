"""Conversation Agent for handling general fashion questions.

This agent handles the "general" intent path:
- Fashion advice and tips
- Latest trends discussion
- Style guidance
- Color theory explanations
"""

from typing import Any, Dict, List, Optional

import json

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

    logger.info(f"Conversation agent processing: {message[:50]}...")

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

        if tools:
            logger.info(f"Conversation agent has {len(tools)} tools available")

            # Create react agent with tools
            agent = create_react_agent(
                llm_service.llm,
                tools,
                prompt=CONVERSATION_AGENT_PROMPT,
            )

            # Build messages with history
            messages = []
            if conversation_history:
                for msg in conversation_history[-5:]:  # Last 5 messages
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    if role == "user":
                        messages.append(HumanMessage(content=content))
                    elif role == "assistant":
                        messages.append(AIMessage(content=content))

            def _build_outfit_context() -> str:
                if not attached_outfits and not swap_intents:
                    return ""

                lines = ["\n\nAttached outfit context:"]
                for outfit in attached_outfits:
                    if not isinstance(outfit, dict):
                        continue
                    name = outfit.get("name", "Outfit")
                    items = (
                        outfit.get("items", {})
                        if isinstance(outfit.get("items"), dict)
                        else {}
                    )

                    def _item_label(label: str, key: str) -> Optional[str]:
                        item = items.get(key)
                        if isinstance(item, dict):
                            name_value = (
                                item.get("name") or item.get("category") or label
                            )
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
                                    acc.get("name")
                                    or acc.get("category")
                                    or "Accessory"
                                )
                        if accessory_names:
                            lines.append(
                                f"  - Accessories: {', '.join(accessory_names)}"
                            )

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

            # Add context about user if available
            user_context = f"\n\n[User ID: {user_id}]" if user_id else ""
            if user_profile:
                user_context += f"\nUser profile: {user_profile}"
            outfit_context = _build_outfit_context()
            messages.append(
                HumanMessage(content=message + user_context + outfit_context)
            )

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

            # Fallback to direct LLM response without tools
            response = await llm_service.chat_with_history(
                system_prompt=CONVERSATION_AGENT_PROMPT,
                user_message=message,
                conversation_history=conversation_history[-5:],
            )

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
