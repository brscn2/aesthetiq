"""Clothing Recommender Agent for retrieving clothing items.

This agent handles the "clothing" intent path:
- Fetches user context (profile, style DNA)
- Searches commerce, wardrobe, or both based on scope
- Uses web search as fallback when no items found
- Handles refinement notes from analyzer to improve search
"""
from typing import Any, Dict, List, Optional
import re
import json

from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
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


def parse_refinement_notes_to_filters(
    refinement_notes: List[str],
    existing_filters: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Parse refinement notes into filter updates.
    
    Analyzes notes like:
    - "Need more formal options" -> occasion: formal
    - "Colors should match warm autumn palette" -> style_dna_colors: true
    - "Missing larger sizes" -> size: XL+
    - "Price too high" -> price_range: budget
    
    Args:
        refinement_notes: List of refinement suggestions from analyzer
        existing_filters: Current filters to update
        
    Returns:
        Updated filters dictionary
    """
    filters = existing_filters.copy() if existing_filters else {}
    
    for note in refinement_notes:
        note_lower = note.lower()
        
        # Occasion refinements
        if any(word in note_lower for word in ["formal", "professional", "business", "office"]):
            filters["occasion"] = "formal"
        elif any(word in note_lower for word in ["casual", "relaxed", "everyday"]):
            filters["occasion"] = "casual"
        elif "party" in note_lower or "event" in note_lower:
            filters["occasion"] = "party"
        elif "wedding" in note_lower:
            filters["occasion"] = "wedding"
        
        # Style refinements
        if "classic" in note_lower or "traditional" in note_lower:
            filters["style"] = "classic"
        elif "modern" in note_lower or "contemporary" in note_lower:
            filters["style"] = "modern"
        elif "minimalist" in note_lower or "simple" in note_lower:
            filters["style"] = "minimalist"
        elif "bold" in note_lower or "statement" in note_lower:
            filters["style"] = "bold"
        
        # Color refinements
        if "warm" in note_lower and ("color" in note_lower or "palette" in note_lower):
            filters["color_preference"] = "warm"
        elif "cool" in note_lower and ("color" in note_lower or "palette" in note_lower):
            filters["color_preference"] = "cool"
        elif "neutral" in note_lower and ("color" in note_lower or "palette" in note_lower):
            filters["color_preference"] = "neutral"
        
        # Price refinements
        if any(word in note_lower for word in ["expensive", "high price", "too costly"]):
            filters["price_range"] = "budget"
        elif any(word in note_lower for word in ["cheap", "low quality"]):
            filters["price_range"] = "mid-range"
        elif "luxury" in note_lower or "premium" in note_lower:
            filters["price_range"] = "luxury"
        
        # Size refinements
        if "larger" in note_lower or "bigger" in note_lower:
            filters["size_preference"] = "larger"
        elif "smaller" in note_lower:
            filters["size_preference"] = "smaller"
        
        # Category refinements - MCP schema only accepts TOP, BOTTOM, SHOE, ACCESSORY
        if "jacket" in note_lower or "blazer" in note_lower or "coat" in note_lower:
            filters["category"] = "TOP"
            filters["sub_category"] = "Jacket"
        elif "pants" in note_lower or "trousers" in note_lower:
            filters["category"] = "BOTTOM"
        elif "shirt" in note_lower or "top" in note_lower or "blouse" in note_lower:
            filters["category"] = "TOP"
        elif "dress" in note_lower:
            filters["category"] = "TOP"
            filters["sub_category"] = "Dress"
        elif "shoes" in note_lower or "sneakers" in note_lower or "boots" in note_lower:
            filters["category"] = "SHOE"
        elif "bag" in note_lower or "accessory" in note_lower or "accessories" in note_lower:
            filters["category"] = "ACCESSORY"
        
        # Specific attribute refinements
        color_matches = re.findall(r'(black|white|navy|blue|red|green|brown|grey|gray|beige|cream)', note_lower)
        if color_matches:
            filters["color"] = color_matches[0]
    
    return filters


RECOMMENDER_AGENT_PROMPT = """You are the Clothing Recommender for AesthetIQ, a fashion AI assistant.

Your role is to find and recommend clothing items based on the user's request.

You have access to several tools to help you:

**User Context Tools:**
- get_style_dna: Get user's color season and style archetype
- get_color_season: Get the user's color season
- get_recommended_colors: Get colors that suit the user
- get_user_profile: Get user's preferences and sizes

**Database Search Tools (USE THESE FIRST):**
- filter_commerce_items: Filter commerce items by EXACT criteria (category, brand, color, price)
- search_commerce_items: Semantic search for vague queries
- filter_wardrobe_items: Filter user's wardrobe by criteria
- search_wardrobe_items: Search user's existing wardrobe

**External Search (LAST RESORT ONLY):**
- web_search: Search the web - ONLY use if database returns 0 results AND user asks for trending/external items

**CRITICAL Instructions:**

1. Get user's style_dna FIRST (one call)
2. For database searches:
   - If filters have specific values (category, brand, color, price), use filter_commerce_items
   - If query is vague/semantic, use search_commerce_items
3. DO NOT call web_search if database returns ANY results
4. DO NOT call multiple search tools sequentially - pick ONE appropriate tool
5. Return results immediately after finding items

Keep your tool usage minimal - ideally 2 calls maximum (style_dna + one search).
"""


# Tools relevant for clothing recommendations (ordered by priority)
RECOMMENDER_TOOLS = [
    # User context (call first)
    "get_style_dna",
    # Primary search - database (call one of these)
    "filter_commerce_items",  # For specific criteria
    "search_commerce_items",  # For semantic queries
    "filter_wardrobe_items",
    "search_wardrobe_items",
    # Secondary context (optional)
    "get_user_profile",
    "get_color_season",
    "get_recommended_colors",
    # Fallback (LAST RESORT)
    "web_search",
]


async def clothing_recommender_node(state: ConversationState) -> Dict[str, Any]:
    """
    Clothing recommender agent node - retrieves clothing items.
    
    Reads:
        - state["message"]: The user's current message
        - state["user_id"]: User identifier for personalization
        - state["search_scope"]: "commerce", "wardrobe", or "both"
        - state["extracted_filters"]: Dict of extracted filters
        - state["refinement_notes"]: Notes from analyzer for refinement (if any)
        
    Writes:
        - state["retrieved_items"]: List of clothing items found
        - state["user_profile"]: User profile if fetched
        - state["style_dna"]: User's style DNA if fetched
        - state["search_sources_used"]: List of search sources used
        - state["fallback_used"]: Whether fallback was used
        - state["extracted_filters"]: Updated filters (if refinement applied)
    """
    message = state.get("message", "")
    user_id = state.get("user_id", "")
    search_scope = state.get("search_scope", "commerce")
    extracted_filters = state.get("extracted_filters", {}) or {}
    refinement_notes = state.get("refinement_notes", []) or []
    iteration = state.get("iteration", 0)
    trace_id = state.get("langfuse_trace_id")
    
    # Apply refinement notes to filters if this is a refinement iteration
    if refinement_notes and iteration > 0:
        logger.info(f"Applying {len(refinement_notes)} refinement notes to filters")
        extracted_filters = parse_refinement_notes_to_filters(
            refinement_notes,
            extracted_filters,
        )
        logger.info(f"Updated filters after refinement: {extracted_filters}")
    
    # Convert filter keys to camelCase for MCP server compatibility
    mcp_filters = convert_filters_to_mcp_format(extracted_filters)
    logger.info(f"Clothing recommender processing: scope={search_scope}, filters={mcp_filters}, iteration={iteration}")
    
    # Get services
    llm_service = get_llm_service()
    tracing_service = get_tracing_service()
    
    # Log agent transition
    if trace_id:
        tracing_service.log_agent_transition(
            trace_id=trace_id,
            from_agent="query_analyzer",
            to_agent="clothing_recommender",
            reason=f"Searching {search_scope} with filters: {mcp_filters}",
        )
    
    try:
        # Get MCP tools and filter to recommender-relevant ones
        all_tools = await get_mcp_tools()
        tools = [t for t in all_tools if t.name in RECOMMENDER_TOOLS]
        
        tools_used = []
        search_sources_used = []
        fallback_used = False
        retrieved_items = []
        user_profile = None
        style_dna = None
        
        if tools:
            logger.info(f"Clothing recommender has {len(tools)} tools available")
            
            # Create react agent with tools
            agent = create_react_agent(
                llm_service.llm,
                tools,
                prompt=RECOMMENDER_AGENT_PROMPT,
            )
            
            # Build the search request message using MCP-compatible filters
            filter_str = ", ".join(f"{k}={v}" for k, v in mcp_filters.items()) if mcp_filters else "none"
            
            # Build tool selection hint based on filters
            tool_hint = ""
            if mcp_filters.get("category") or mcp_filters.get("brand") or mcp_filters.get("color"):
                tool_hint = "\n**IMPORTANT: Use filter_commerce_items since specific filters are provided.**"
            elif search_scope == "commerce":
                tool_hint = "\n**Use search_commerce_items for semantic search.**"
            elif search_scope == "wardrobe":
                tool_hint = "\n**Use filter_wardrobe_items or search_wardrobe_items.**"
            
            # Build refinement context if this is a retry
            refinement_context = ""
            if refinement_notes and iteration > 0:
                refinement_context = f"""

**IMPORTANT - REFINEMENT REQUIRED (Attempt {iteration + 1}):**
The previous search results were not satisfactory. Please adjust your search based on these requirements:
{chr(10).join(f'- {note}' for note in refinement_notes)}

Focus on finding items that specifically address these refinement notes. The filters have been updated accordingly.
"""
            
            search_request = f"""
User request: {message}
User ID: {user_id}
Search scope: {search_scope}
Filters: {filter_str}
{tool_hint}
{refinement_context}
Find items using the database tools. Do NOT use web_search unless database returns zero results.
{f"This is refinement attempt {iteration + 1}. Pay special attention to the refinement requirements above." if iteration > 0 else ""}
"""
            
            messages = [HumanMessage(content=search_request)]
            
            # Invoke agent
            agent_result = await agent.ainvoke({"messages": messages})
            
            # Track tool calls from AIMessage objects
            tool_call_ids = {}  # Map tool_call_id to tool_name
            
            # Process results and extract tool calls + results
            for msg in agent_result["messages"]:
                # Track tool calls from AIMessage
                if hasattr(msg, "tool_calls") and msg.tool_calls:
                    for tool_call in msg.tool_calls:
                        tool_name = tool_call.get("name", "unknown")
                        tool_call_id = tool_call.get("id", "")
                        tools_used.append(tool_name)
                        tool_call_ids[tool_call_id] = tool_name
                        
                        # Track search sources
                        if "wardrobe" in tool_name.lower():
                            if "wardrobe" not in search_sources_used:
                                search_sources_used.append("wardrobe")
                        elif "commerce" in tool_name.lower():
                            if "commerce" not in search_sources_used:
                                search_sources_used.append("commerce")
                        elif tool_name == "web_search":
                            fallback_used = True
                            if "web" not in search_sources_used:
                                search_sources_used.append("web")
                        
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
                    tool_name = tool_call_ids.get(tool_call_id, getattr(msg, "name", "unknown"))
                    tool_content = msg.content
                    
                    # Parse JSON content if possible
                    try:
                        tool_result = json.loads(tool_content) if isinstance(tool_content, str) else tool_content
                    except (json.JSONDecodeError, TypeError):
                        tool_result = tool_content
                    
                    logger.debug(f"Tool '{tool_name}' returned: {str(tool_result)[:200]}...")
                    
                    # Validate result - skip if error response
                    if isinstance(tool_result, dict) and tool_result.get("error"):
                        logger.warning(f"Tool '{tool_name}' returned error: {tool_result.get('error')}")
                        continue
                    if isinstance(tool_result, str) and ("error" in tool_result.lower() or "failed" in tool_result.lower()):
                        logger.warning(f"Tool '{tool_name}' returned error string: {tool_result[:100]}")
                        continue
                    
                    # Extract user profile
                    if tool_name == "get_user_profile":
                        if isinstance(tool_result, dict) and ("profile" in tool_result or "userId" in tool_result or "id" in tool_result):
                            user_profile = tool_result.get("profile") or tool_result
                            logger.info(f"Extracted user_profile from tool result")
                        else:
                            logger.warning(f"get_user_profile returned unexpected format: {type(tool_result)}")
                    
                    # Extract style DNA
                    elif tool_name == "get_style_dna":
                        # Handle various response formats from MCP
                        extracted_dna = None
                        
                        if isinstance(tool_result, dict):
                            # Direct dict format: {"style_dna": {...}} or {...}
                            extracted_dna = tool_result.get("style_dna") or tool_result
                        elif isinstance(tool_result, list) and len(tool_result) > 0:
                            # List format: [{"style_dna": {...}}] or [{...}]
                            first_item = tool_result[0]
                            if isinstance(first_item, dict):
                                extracted_dna = first_item.get("style_dna") or first_item
                            logger.info(f"Parsed style_dna from list format")
                        elif isinstance(tool_result, str):
                            # JSON string format
                            try:
                                parsed = json.loads(tool_result)
                                extracted_dna = parsed.get("style_dna") or parsed
                            except json.JSONDecodeError:
                                pass
                        
                        if extracted_dna and isinstance(extracted_dna, dict):
                            # Validate it has expected fields
                            if any(k in extracted_dna for k in ["archetype", "color_season", "user_id"]):
                                style_dna = extracted_dna
                                logger.info(f"Extracted style_dna: archetype={style_dna.get('archetype')}, season={style_dna.get('color_season')}")
                            else:
                                logger.warning(f"style_dna missing expected fields: {list(extracted_dna.keys())[:5]}")
                        else:
                            logger.warning(f"get_style_dna could not parse result: {type(tool_result)}")
                    
                    # Extract color season
                    elif tool_name == "get_color_season":
                        color_season = None
                        
                        if isinstance(tool_result, dict):
                            color_season = tool_result.get("color_season") or tool_result.get("season")
                        elif isinstance(tool_result, list) and len(tool_result) > 0:
                            first_item = tool_result[0]
                            if isinstance(first_item, dict):
                                color_season = first_item.get("color_season") or first_item.get("season")
                            logger.info(f"Parsed color_season from list format")
                        elif isinstance(tool_result, str):
                            try:
                                parsed = json.loads(tool_result)
                                color_season = parsed.get("color_season") or parsed.get("season")
                            except json.JSONDecodeError:
                                pass
                        
                        if color_season:
                            if style_dna:
                                style_dna["color_season"] = color_season
                            else:
                                style_dna = {"color_season": color_season}
                            logger.info(f"Extracted color_season: {color_season}")
                        else:
                            logger.warning(f"get_color_season could not extract season from: {type(tool_result)}")
                    
                    # Extract recommended colors
                    elif tool_name == "get_recommended_colors":
                        if isinstance(tool_result, dict) and ("colors" in tool_result or "recommended_colors" in tool_result):
                            recommended_colors = tool_result.get("colors") or tool_result.get("recommended_colors")
                            if recommended_colors and style_dna:
                                style_dna["recommended_colors"] = recommended_colors
                            elif recommended_colors:
                                style_dna = {"recommended_colors": recommended_colors}
                            logger.info(f"Extracted recommended_colors: {recommended_colors}")
                        else:
                            logger.warning(f"get_recommended_colors returned unexpected format: {type(tool_result)}")
                    
                    # Extract wardrobe items
                    elif tool_name in ["search_wardrobe_items", "filter_wardrobe_items"]:
                        extracted_items = []
                        if isinstance(tool_result, dict):
                            # Handle search response format: {results: [{item: {...}, score: ...}]}
                            if "results" in tool_result:
                                results = tool_result.get("results", [])
                                for r in results:
                                    if isinstance(r, dict):
                                        # Extract nested item or use result directly
                                        item = r.get("item") if "item" in r else r
                                        if isinstance(item, dict):
                                            extracted_items.append(item)
                                logger.info(f"Extracted {len(extracted_items)} wardrobe items from 'results' format")
                            # Handle filter response format: {items: [...]}
                            elif "items" in tool_result:
                                items = tool_result.get("items", [])
                                extracted_items = [item for item in items if isinstance(item, dict)]
                                logger.info(f"Extracted {len(extracted_items)} wardrobe items from 'items' format")
                        elif isinstance(tool_result, list):
                            extracted_items = [item for item in tool_result if isinstance(item, dict)]
                            logger.info(f"Extracted {len(extracted_items)} wardrobe items from list format")
                        
                        if extracted_items:
                            for item in extracted_items:
                                item["source"] = "wardrobe"
                            retrieved_items.extend(extracted_items)
                            # Early return: if we have enough items from local DB, skip further processing
                            if len(retrieved_items) >= 3 and "web_search" not in tools_used:
                                logger.info(f"Found {len(retrieved_items)} items from wardrobe, sufficient results")
                        else:
                            logger.warning(f"{tool_name} returned no valid items")
                    
                    # Extract commerce items
                    elif tool_name in ["search_commerce_items", "filter_commerce_items"]:
                        extracted_items = []
                        if isinstance(tool_result, dict):
                            # Handle search response format: {results: [{item: {...}, score: ..., breakdown: ...}]}
                            if "results" in tool_result:
                                results = tool_result.get("results", [])
                                for r in results:
                                    if isinstance(r, dict):
                                        # Extract nested item or use result directly
                                        item = r.get("item") if "item" in r else r
                                        if isinstance(item, dict):
                                            # Optionally preserve score/breakdown for ranking
                                            if "score" in r:
                                                item["_search_score"] = r.get("score")
                                            extracted_items.append(item)
                                logger.info(f"Extracted {len(extracted_items)} commerce items from 'results' format")
                            # Handle filter response format: {items: [...]}
                            elif "items" in tool_result:
                                items = tool_result.get("items", [])
                                extracted_items = [item for item in items if isinstance(item, dict)]
                                logger.info(f"Extracted {len(extracted_items)} commerce items from 'items' format")
                        elif isinstance(tool_result, list):
                            extracted_items = [item for item in tool_result if isinstance(item, dict)]
                            logger.info(f"Extracted {len(extracted_items)} commerce items from list format")
                        
                        if extracted_items:
                            for item in extracted_items:
                                item["source"] = "commerce"
                            retrieved_items.extend(extracted_items)
                            # Early return: if we have enough items from local DB, skip further processing
                            if len(retrieved_items) >= 3 and "web_search" not in tools_used:
                                logger.info(f"Found {len(retrieved_items)} items from local DB, sufficient results")
                        else:
                            logger.warning(f"{tool_name} returned no valid items")
                    
                    # Extract web search results
                    elif tool_name == "web_search":
                        if isinstance(tool_result, dict):
                            web_items = tool_result.get("results", [])
                            if web_items:
                                for item in web_items:
                                    if isinstance(item, dict):
                                        item["source"] = "web"
                                retrieved_items.extend(web_items)
                                logger.info(f"Extracted {len(web_items)} web search results")
                        elif isinstance(tool_result, str):
                            # Web search might return a text summary
                            retrieved_items.append({
                                "type": "web_summary",
                                "content": tool_result,
                                "source": "web",
                            })
                    
                    # Log actual tool output to Langfuse
                    if trace_id:
                        tracing_service.log_tool_call(
                            trace_id=trace_id,
                            tool_name=f"{tool_name}_result",
                            input_params={},
                            output=str(tool_result)[:500],
                        )
            
            # Get final message for context
            final_message = agent_result["messages"][-1].content
            
            # If no structured items were extracted but agent has a response, add it
            if not retrieved_items and final_message and "no items" not in final_message.lower():
                retrieved_items = [{
                    "type": "agent_response",
                    "content": final_message,
                    "sources": search_sources_used,
                }]
            
        else:
            logger.warning("No MCP tools available, using fallback response")
            fallback_used = True
            search_sources_used.append("fallback")
            
            # Generate a helpful response without tools
            response = await llm_service.chat_with_history(
                system_prompt="You are a fashion AI. Help the user find clothing based on their request.",
                user_message=f"User is looking for: {message}. Filters: {mcp_filters}. Scope: {search_scope}",
            )
            
            retrieved_items = [{
                "type": "llm_response",
                "content": response,
                "sources": ["llm_fallback"],
            }]
        
        # Log LLM call summary to Langfuse
        if trace_id:
            tracing_service.log_llm_call(
                trace_id=trace_id,
                agent_name="clothing_recommender",
                input_text=f"Search {search_scope} with filters {mcp_filters}",
                output_text=f"Found {len(retrieved_items)} items from {search_sources_used}",
                metadata={
                    "tools_used": tools_used,
                    "search_sources": search_sources_used,
                    "fallback_used": fallback_used,
                },
            )
        
        logger.info(
            f"Clothing recommender found {len(retrieved_items)} items from {search_sources_used}, "
            f"style_dna={'set' if style_dna else 'not set'}, user_profile={'set' if user_profile else 'not set'}"
        )
        
        result = {
            "retrieved_items": retrieved_items,
            "user_profile": user_profile,
            "style_dna": style_dna,
            "search_sources_used": search_sources_used,
            "fallback_used": fallback_used,
        }
        
        # Update filters in state if they were refined
        if refinement_notes and iteration > 0:
            result["extracted_filters"] = extracted_filters  # Keep snake_case in state
            result["metadata"] = {
                **state.get("metadata", {}),
                "refinement_applied": True,
                "refined_filters": extracted_filters,
                "mcp_filters": mcp_filters,  # Track converted filters for debugging
            }
        
        return result
        
    except Exception as e:
        logger.error(f"Clothing recommender failed: {e}")
        
        # Log error
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
