"""Clothing Recommender Agent for retrieving clothing items.

This agent handles the "clothing" intent path:
- Fetches user context (profile, style DNA)
- Searches commerce, wardrobe, or both based on scope
- Uses web search as fallback when no items found
"""
from typing import Any, Dict, List, Optional
import json

from langchain_core.messages import HumanMessage, ToolMessage
from langgraph.prebuilt import create_react_agent

from app.workflows.state import ConversationState
from app.services.llm_service import get_llm_service
from app.services.tracing.langfuse_service import get_tracing_service
from app.mcp import get_mcp_tools
from app.core.logger import get_logger

logger = get_logger(__name__)


def convert_filters_to_mcp_format(filters: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert filter keys from snake_case to camelCase for MCP servers.
    
    Agent uses snake_case (e.g., sub_category, price_range)
    MCP servers use camelCase (e.g., subCategory, priceRange)
    
    Args:
        filters: Filters with snake_case keys
        
    Returns:
        Filters with camelCase keys for MCP compatibility
    """
    if not filters:
        return {}
    
    key_mapping = {
        "sub_category": "subCategory",
        "price_range": "priceRange",
        "max_price": "priceMax",
        "min_price": "priceMin",
        "is_favorite": "isFavorite",
        "in_stock": "inStock",
        "brand_id": "brandId",
        "retailer_id": "retailerId",
        "seasonal_palette": "seasonalPalette",
        "min_palette_score": "minPaletteScore",
    }
    
    converted = {}
    for key, value in filters.items():
        # Convert key if mapping exists, otherwise keep original
        new_key = key_mapping.get(key, key)
        converted[new_key] = value
    
    return converted



RECOMMENDER_AGENT_PROMPT = """You are the Clothing Recommender for AesthetIQ, a fashion AI assistant.

Your role is to find and recommend clothing items based on the user's request.

**Tool Usage Guidelines:**

1. Get user's style_dna FIRST to personalize recommendations
2. For database searches:
   - Use filter tools when specific criteria are provided (category, brand, color, price)
   - Use search tools for vague or semantic queries
3. Prioritize database tools over web search
4. Only use web_search if database returns zero results AND user explicitly wants trending/external items
5. Pick ONE appropriate search tool - don't call multiple search tools sequentially

Keep tool usage minimal - ideally 2 calls maximum (style_dna + one search).
Return results immediately after finding items.
"""


def _extract_items_from_result(tool_result: Any, source: str) -> List[Dict[str, Any]]:
    """
    Generic helper to extract items from various tool result formats.
    
    Handles: {results: [{item: {...}}]}, {items: [...]}, direct list, etc.
    """
    items = []
    
    if isinstance(tool_result, dict):
        # Handle {results: [{item: {...}, score: ...}]} format
        if "results" in tool_result:
            for r in tool_result.get("results", []):
                if isinstance(r, dict):
                    item = r.get("item") if "item" in r else r
                    if isinstance(item, dict):
                        if "score" in r:
                            item["_search_score"] = r.get("score")
                        items.append(item)
        # Handle {items: [...]} format
        elif "items" in tool_result:
            items = [item for item in tool_result.get("items", []) if isinstance(item, dict)]
    elif isinstance(tool_result, list):
        items = [item for item in tool_result if isinstance(item, dict)]
    
    # Add source tag to all items
    for item in items:
        item["source"] = source
    
    return items


def _extract_dict_value(tool_result: Any, *keys: str) -> Optional[Dict[str, Any]]:
    """
    Extract a dict value from various result formats.
    
    Tries keys in order, handles nested/list/string formats.
    """
    data = None
    
    if isinstance(tool_result, dict):
        for key in keys:
            if key in tool_result:
                data = tool_result[key]
                break
        if data is None:
            data = tool_result
    elif isinstance(tool_result, list) and tool_result:
        first = tool_result[0]
        if isinstance(first, dict):
            for key in keys:
                if key in first:
                    data = first[key]
                    break
            if data is None:
                data = first
    elif isinstance(tool_result, str):
        try:
            parsed = json.loads(tool_result)
            for key in keys:
                if key in parsed:
                    data = parsed[key]
                    break
            if data is None:
                data = parsed
        except json.JSONDecodeError:
            pass
    
    return data if isinstance(data, dict) else None


async def clothing_recommender_node(state: ConversationState) -> Dict[str, Any]:
    """
    Clothing recommender agent node - retrieves clothing items.
    
    Uses a ReAct agent with MCP tools to find clothing items based on user request.
    The agent autonomously decides which tools to use and how to combine results.
    """
    message = state.get("message", "")
    user_id = state.get("user_id", "")
    search_scope = state.get("search_scope", "commerce")
    extracted_filters = state.get("extracted_filters", {}) or {}
    refinement_notes = state.get("refinement_notes", []) or []
    iteration = state.get("iteration", 0)
    trace_id = state.get("langfuse_trace_id")
    
    # Convert filter keys to camelCase for MCP server compatibility
    mcp_filters = convert_filters_to_mcp_format(extracted_filters)
    logger.info(f"Clothing recommender processing: scope={search_scope}, filters={mcp_filters}, iteration={iteration}")
    
    # Get services
    llm_service = get_llm_service()
    tracing_service = get_tracing_service()
    
    if trace_id:
        tracing_service.log_agent_transition(
            trace_id=trace_id,
            from_agent="query_analyzer",
            to_agent="clothing_recommender",
            reason=f"Searching {search_scope} with filters: {mcp_filters}",
        )
    
    try:
        # Get all MCP tools - agent decides which to use based on task
        tools = await get_mcp_tools()
        
        if not tools:
            logger.warning("No MCP tools available, using fallback response")
            response = await llm_service.chat_with_history(
                system_prompt="You are a fashion AI. Help the user find clothing based on their request.",
                user_message=f"User is looking for: {message}. Filters: {mcp_filters}. Scope: {search_scope}",
            )
            return {
                "retrieved_items": [{"type": "llm_response", "content": response, "sources": ["llm_fallback"]}],
                "user_profile": None,
                "style_dna": None,
                "search_sources_used": ["fallback"],
                "fallback_used": True,
            }
        
        logger.info(f"Clothing recommender has {len(tools)} tools available")
        
        # Create and invoke the ReAct agent
        agent = create_react_agent(llm_service.llm, tools, prompt=RECOMMENDER_AGENT_PROMPT)
        
        # Build search request - let agent decide which tools to use
        filter_str = ", ".join(f"{k}={v}" for k, v in mcp_filters.items()) if mcp_filters else "none"
        refinement_context = ""
        if refinement_notes and iteration > 0:
            refinement_context = f"\n\nRefinement needed (attempt {iteration + 1}): {', '.join(refinement_notes)}"
        
        search_request = f"""User request: {message}
User ID: {user_id}
Search scope: {search_scope}
Filters: {filter_str}{refinement_context}"""
        
        agent_result = await agent.ainvoke({"messages": [HumanMessage(content=search_request)]})
        
        # Process agent results - simplified extraction
        tools_used = []
        search_sources_used = []
        fallback_used = False
        retrieved_items = []
        user_profile = None
        style_dna = None
        tool_call_ids = {}
        
        for msg in agent_result["messages"]:
            # Track tool calls
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                for tool_call in msg.tool_calls:
                    tool_name = tool_call.get("name", "unknown")
                    tools_used.append(tool_name)
                    tool_call_ids[tool_call.get("id", "")] = tool_name
                    
                    # Track sources based on tool name
                    if "wardrobe" in tool_name:
                        search_sources_used.append("wardrobe") if "wardrobe" not in search_sources_used else None
                    elif "commerce" in tool_name:
                        search_sources_used.append("commerce") if "commerce" not in search_sources_used else None
                    elif tool_name == "web_search":
                        fallback_used = True
                        search_sources_used.append("web") if "web" not in search_sources_used else None
                    
                    if trace_id:
                        tracing_service.log_tool_call(
                            trace_id=trace_id,
                            tool_name=tool_name,
                            input_params=tool_call.get("args", {}),
                            output="[pending]",
                        )
            
            # Extract data from ToolMessage results
            if isinstance(msg, ToolMessage):
                tool_name = tool_call_ids.get(getattr(msg, "tool_call_id", ""), "unknown")
                
                try:
                    tool_result = json.loads(msg.content) if isinstance(msg.content, str) else msg.content
                except (json.JSONDecodeError, TypeError):
                    tool_result = msg.content
                
                # Skip error results
                if isinstance(tool_result, dict) and tool_result.get("error"):
                    continue
                
                # Extract based on tool category (simplified)
                if tool_name == "get_user_profile":
                    user_profile = _extract_dict_value(tool_result, "profile") or tool_result
                
                elif tool_name in ("get_style_dna", "get_color_season", "get_recommended_colors"):
                    extracted = _extract_dict_value(tool_result, "style_dna", "color_season", "colors")
                    if extracted:
                        style_dna = {**(style_dna or {}), **extracted} if style_dna else extracted
                
                elif any(kw in tool_name for kw in ("wardrobe", "commerce", "web_search")):
                    source = "wardrobe" if "wardrobe" in tool_name else ("web" if "web" in tool_name else "commerce")
                    items = _extract_items_from_result(tool_result, source)
                    if items:
                        retrieved_items.extend(items)
                        logger.info(f"Extracted {len(items)} items from {tool_name}")
                    elif isinstance(tool_result, str) and tool_name == "web_search":
                        retrieved_items.append({"type": "web_summary", "content": tool_result, "source": "web"})
                
                if trace_id:
                    tracing_service.log_tool_call(
                        trace_id=trace_id,
                        tool_name=f"{tool_name}_result",
                        input_params={},
                        output=str(tool_result)[:500],
                    )
        
        # Fallback: use agent's final response if no items extracted
        if not retrieved_items:
            final_message = agent_result["messages"][-1].content
            if final_message and "no items" not in final_message.lower():
                retrieved_items = [{"type": "agent_response", "content": final_message, "sources": search_sources_used}]
        
        if trace_id:
            tracing_service.log_llm_call(
                trace_id=trace_id,
                agent_name="clothing_recommender",
                input_text=f"Search {search_scope} with filters {mcp_filters}",
                output_text=f"Found {len(retrieved_items)} items from {search_sources_used}",
                metadata={"tools_used": tools_used, "search_sources": search_sources_used, "fallback_used": fallback_used},
            )
        
        logger.info(f"Clothing recommender found {len(retrieved_items)} items from {search_sources_used}")
        
        return {
            "retrieved_items": retrieved_items,
            "user_profile": user_profile,
            "style_dna": style_dna,
            "search_sources_used": search_sources_used,
            "fallback_used": fallback_used,
        }
        
    except Exception as e:
        logger.error(f"Clothing recommender failed: {e}")
        if trace_id:
            tracing_service.log_error(trace_id=trace_id, error=e)
        
        return {
            "retrieved_items": [],
            "user_profile": None,
            "style_dna": None,
            "search_sources_used": ["error"],
            "fallback_used": True,
            "metadata": {**state.get("metadata", {}), "recommender_error": str(e)},
        }
