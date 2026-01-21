"""Query Analyzer node for the clothing workflow.

This node analyzes clothing-related queries to determine:
- Search scope: commerce (buy new), wardrobe (existing clothes), or both
- Extracted filters: category, subCategory, brand, color, occasion, etc.
"""
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from app.workflows.state import ConversationState
from app.services.llm_service import get_llm_service
from app.services.tracing.langfuse_service import get_tracing_service
from app.core.logger import get_logger

logger = get_logger(__name__)


class ExtractedFilters(BaseModel):
    """Structured filters extracted from the query."""
    category: Optional[str] = Field(
        None,
        description="Clothing category: TOP, BOTTOM, SHOE, ACCESSORY (jackets/blazers/coats are TOP with sub_category)"
    )
    sub_category: Optional[str] = Field(
        None,
        description="Specific type: Jacket, Shirt, Pants, Dress, etc."
    )
    brand: Optional[str] = Field(
        None,
        description="Brand name if specified"
    )
    color: Optional[str] = Field(
        None,
        description="Color if specified (e.g., 'navy', 'black', 'red')"
    )
    occasion: Optional[str] = Field(
        None,
        description="Occasion if specified: casual, formal, business, party, date, wedding, interview"
    )
    style: Optional[str] = Field(
        None,
        description="Style preference if specified: classic, modern, minimalist, bold, elegant"
    )
    price_range: Optional[str] = Field(
        None,
        description="Price preference if specified: budget, mid-range, luxury"
    )


class QueryAnalysis(BaseModel):
    """Structured output for query analysis."""
    search_scope: Literal["commerce", "wardrobe", "both"] = Field(
        description="Where to search: 'commerce' for new items, 'wardrobe' for existing clothes, 'both' for combination"
    )
    filters: ExtractedFilters = Field(
        description="Extracted filters from the query"
    )
    reasoning: str = Field(
        description="Brief explanation of the analysis"
    )


QUERY_ANALYZER_PROMPT = """You are a query analyzer for AesthetIQ, a fashion AI assistant.

Your task is to analyze the user's clothing-related query and extract:

1. **Search Scope** - Where should we look for items?
   - "commerce": User wants to BUY NEW items (keywords: "buy", "new", "purchase", "shop", "get")
   - "wardrobe": User wants to use EXISTING clothes (keywords: "my wardrobe", "my closet", "what I have", "existing", "already own")
   - "both": User wants to COMBINE existing items with new purchases or compare options

2. **Filters** - Extract any specific requirements:
   - category: TOP, BOTTOM, SHOE, ACCESSORY (Note: jackets, blazers, coats are categorized as TOP with appropriate sub_category)
   - sub_category: Jacket, Blazer, Coat, Shirt, T-shirt, Pants, Jeans, Dress, Skirt, Sneakers, Boots, etc.
   - brand: Any mentioned brand name
   - color: Any mentioned color
   - occasion: casual, formal, business, party, date, wedding, interview, everyday
   - style: classic, modern, minimalist, bold, elegant, sporty
   - price_range: budget, mid-range, luxury (if mentioned)

Guidelines:
- Default to "commerce" if unclear but buying seems implied
- Default to "both" if the user mentions combining items
- Only extract filters that are explicitly or clearly implied in the query
- Leave filters as null if not mentioned
"""


async def query_analyzer_node(state: ConversationState) -> Dict[str, Any]:
    """
    Query analyzer node - analyzes query and determines search scope.
    
    Reads:
        - state["message"]: The user's current message
        - state["conversation_history"]: Previous messages for context
        
    Writes:
        - state["search_scope"]: "commerce", "wardrobe", or "both"
        - state["extracted_filters"]: Dict of extracted filters
        - state["metadata"]["query_analysis"]: Full analysis details
    """
    message = state.get("message", "")
    conversation_history = state.get("conversation_history", [])
    trace_id = state.get("langfuse_trace_id")
    
    logger.info(f"Analyzing query: {message[:50]}...")
    
    # Get services
    llm_service = get_llm_service()
    tracing_service = get_tracing_service()
    
    try:
        # Build context from recent history
        context = ""
        if conversation_history:
            recent_history = conversation_history[-3:]
            context = "\n\nRecent conversation:\n"
            for msg in recent_history:
                role = msg.get("role", "user")
                content = msg.get("content", "")[:100]
                context += f"- {role}: {content}\n"
        
        # Analyze query using structured output
        user_prompt = f"User query: {message}{context}"
        
        analysis = await llm_service.structured_chat(
            system_prompt=QUERY_ANALYZER_PROMPT,
            user_message=user_prompt,
            output_schema=QueryAnalysis,
        )
        
        # Convert filters to dict, removing None values
        filters_dict = {k: v for k, v in analysis.filters.model_dump().items() if v is not None}
        
        # Log to Langfuse
        if trace_id:
            tracing_service.log_llm_call(
                trace_id=trace_id,
                agent_name="query_analyzer",
                input_text=user_prompt,
                output_text=f"scope={analysis.search_scope}, filters={filters_dict}",
                metadata={
                    "search_scope": analysis.search_scope,
                    "filters": filters_dict,
                    "reasoning": analysis.reasoning,
                },
            )
        
        logger.info(f"Query analyzed: scope={analysis.search_scope}, filters={filters_dict}")
        
        # Update metadata
        metadata = state.get("metadata", {})
        metadata["query_analysis"] = {
            "search_scope": analysis.search_scope,
            "filters": filters_dict,
            "reasoning": analysis.reasoning,
        }
        
        return {
            "search_scope": analysis.search_scope,
            "extracted_filters": filters_dict,
            "metadata": metadata,
        }
        
    except Exception as e:
        logger.error(f"Query analysis failed: {e}")
        
        # Fallback to keyword-based analysis
        message_lower = message.lower()
        
        # Determine scope
        if any(kw in message_lower for kw in ["my wardrobe", "my closet", "what i have", "already own"]):
            scope = "wardrobe"
        elif any(kw in message_lower for kw in ["buy", "new", "purchase", "shop"]):
            scope = "commerce"
        elif any(kw in message_lower for kw in ["combine", "mix", "pair with"]):
            scope = "both"
        else:
            scope = "commerce"  # Default
        
        # Simple filter extraction
        filters = {}
        
        # Categories - Note: MCP schema only accepts TOP, BOTTOM, SHOE, ACCESSORY
        if any(kw in message_lower for kw in ["jacket", "blazer"]):
            filters["category"] = "TOP"
            filters["sub_category"] = "Jacket"
        elif "coat" in message_lower:
            filters["category"] = "TOP"
            filters["sub_category"] = "Coat"
        elif any(kw in message_lower for kw in ["shirt", "blouse", "top"]):
            filters["category"] = "TOP"
        elif any(kw in message_lower for kw in ["pants", "jeans", "trousers"]):
            filters["category"] = "BOTTOM"
        elif "dress" in message_lower:
            filters["category"] = "TOP"
            filters["sub_category"] = "Dress"
        elif any(kw in message_lower for kw in ["shoes", "sneakers", "boots", "heels"]):
            filters["category"] = "SHOE"
        elif any(kw in message_lower for kw in ["bag", "watch", "belt", "scarf", "hat"]):
            filters["category"] = "ACCESSORY"
        
        # Occasions
        if "interview" in message_lower or "job" in message_lower:
            filters["occasion"] = "interview"
        elif "party" in message_lower:
            filters["occasion"] = "party"
        elif "wedding" in message_lower:
            filters["occasion"] = "wedding"
        elif "casual" in message_lower:
            filters["occasion"] = "casual"
        elif "formal" in message_lower:
            filters["occasion"] = "formal"
        
        logger.warning(f"Fallback query analysis: scope={scope}, filters={filters}")
        
        metadata = state.get("metadata", {})
        metadata["query_analysis"] = {
            "search_scope": scope,
            "filters": filters,
            "reasoning": "Fallback keyword-based analysis due to LLM error",
            "error": str(e),
        }
        
        return {
            "search_scope": scope,
            "extracted_filters": filters,
            "metadata": metadata,
        }
