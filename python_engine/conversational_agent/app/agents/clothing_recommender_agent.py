"""Clothing Recommender Agent for retrieving clothing items.

This agent handles the "clothing" intent path:
- Fetches user context (profile, style DNA)
- Searches commerce, wardrobe, or both based on scope
- Uses web search as fallback when no items found
- Handles refinement notes from analyzer to improve search
"""
from typing import Any, Dict, List, Optional
import re

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.prebuilt import create_react_agent

from app.workflows.state import ConversationState
from app.services.llm_service import get_llm_service
from app.services.tracing.langfuse_service import get_tracing_service
from app.mcp import get_mcp_tools
from app.core.logger import get_logger

logger = get_logger(__name__)


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
        
        # Category refinements
        if "jacket" in note_lower or "outerwear" in note_lower:
            filters["category"] = "OUTERWEAR"
        elif "pants" in note_lower or "trousers" in note_lower:
            filters["category"] = "BOTTOM"
        elif "shirt" in note_lower or "top" in note_lower or "blouse" in note_lower:
            filters["category"] = "TOP"
        elif "dress" in note_lower:
            filters["sub_category"] = "Dress"
        
        # Specific attribute refinements
        color_matches = re.findall(r'(black|white|navy|blue|red|green|brown|grey|gray|beige|cream)', note_lower)
        if color_matches:
            filters["color"] = color_matches[0]
    
    return filters


RECOMMENDER_AGENT_PROMPT = """You are the Clothing Recommender for AesthetIQ, a fashion AI assistant.

Your role is to find and recommend clothing items based on the user's request.

You have access to several tools to help you:

**User Context Tools:**
- get_user_profile: Get user's preferences and sizes
- get_style_dna: Get user's color season and style archetype
- get_color_season: Get the user's color season
- get_recommended_colors: Get colors that suit the user

**Search Tools:**
- search_wardrobe_items: Search user's existing wardrobe
- filter_wardrobe_items: Filter wardrobe by specific criteria
- search_commerce_items: Search for new items to buy
- filter_commerce_items: Filter commerce items by criteria

**Fallback Tool:**
- web_search: Search the web for fashion items and recommendations

**Instructions:**

1. First, get the user's style profile if available (style DNA, color season)
2. Based on the search scope, use the appropriate search tools:
   - "commerce": Use search_commerce_items and filter_commerce_items
   - "wardrobe": Use search_wardrobe_items and filter_wardrobe_items
   - "both": Use both sets of tools
3. Apply the extracted filters to narrow down results
4. If no results found, use web_search as a fallback
5. Return the best matching items

Always try to personalize recommendations based on the user's style DNA and preferences.
Keep your tool usage efficient - don't call unnecessary tools.
"""


# Tools relevant for clothing recommendations
RECOMMENDER_TOOLS = [
    # User context
    "get_user_profile",
    "get_style_dna",
    "get_color_season",
    "get_recommended_colors",
    # Wardrobe
    "search_wardrobe_items",
    "filter_wardrobe_items",
    # Commerce
    "search_commerce_items",
    "filter_commerce_items",
    # Fallback
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
    
    logger.info(f"Clothing recommender processing: scope={search_scope}, filters={extracted_filters}, iteration={iteration}")
    
    # Get services
    llm_service = get_llm_service()
    tracing_service = get_tracing_service()
    
    # Log agent transition
    if trace_id:
        tracing_service.log_agent_transition(
            trace_id=trace_id,
            from_agent="query_analyzer",
            to_agent="clothing_recommender",
            reason=f"Searching {search_scope} with filters: {extracted_filters}",
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
            
            # Build the search request message
            filter_str = ", ".join(f"{k}={v}" for k, v in extracted_filters.items()) if extracted_filters else "none"
            
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
{refinement_context}
Please find clothing items matching this request. Use the appropriate tools based on the search scope.
{f"This is refinement attempt {iteration + 1}. Pay special attention to the refinement requirements above." if iteration > 0 else ""}
"""
            
            messages = [HumanMessage(content=search_request)]
            
            # Invoke agent
            result = await agent.ainvoke({"messages": messages})
            
            # Process results and extract tool calls
            for msg in result["messages"]:
                if hasattr(msg, "tool_calls") and msg.tool_calls:
                    for tool_call in msg.tool_calls:
                        tool_name = tool_call.get("name", "unknown")
                        tools_used.append(tool_name)
                        
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
                                output="[processed]",
                            )
            
            # Try to extract items from the agent's final response
            final_message = result["messages"][-1].content
            
            # For now, we'll store the agent's response as a "pseudo-item"
            # In a real implementation, we'd parse structured item data from tool results
            if final_message and "no items" not in final_message.lower():
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
                user_message=f"User is looking for: {message}. Filters: {extracted_filters}. Scope: {search_scope}",
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
                input_text=f"Search {search_scope} with filters {extracted_filters}",
                output_text=f"Found {len(retrieved_items)} items from {search_sources_used}",
                metadata={
                    "tools_used": tools_used,
                    "search_sources": search_sources_used,
                    "fallback_used": fallback_used,
                },
            )
        
        logger.info(f"Clothing recommender found {len(retrieved_items)} items from {search_sources_used}")
        
        result = {
            "retrieved_items": retrieved_items,
            "user_profile": user_profile,
            "style_dna": style_dna,
            "search_sources_used": search_sources_used,
            "fallback_used": fallback_used,
        }
        
        # Update filters in state if they were refined
        if refinement_notes and iteration > 0:
            result["extracted_filters"] = extracted_filters
            result["metadata"] = {
                **state.get("metadata", {}),
                "refinement_applied": True,
                "refined_filters": extracted_filters,
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
