"""Query Analyzer node for the clothing workflow.

This node analyzes clothing-related queries to determine:
- Search scope: commerce (buy new), wardrobe (existing clothes), or both
- Extracted filters: category, subCategory, brand, color, occasion, etc.
- Occasion-based outfit decomposition via LLM with static fallback map
"""

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from app.workflows.state import ConversationState
from app.services.llm_service import get_llm_service
from app.services.tracing.langfuse_service import get_tracing_service
from app.core.logger import get_logger

logger = get_logger(__name__)


# Fallback occasion-to-items mapping for ~15 common occasions
OCCASION_FALLBACK_MAP = {
    "gym": ["T-shirt", "Sweatpants", "Sneakers"],
    "gym outfit": ["T-shirt", "Sweatpants", "Sneakers"],
    "workout": ["T-shirt", "Leggings", "Sneakers"],
    "athletic": ["Sports Top", "Leggings", "Sneakers"],
    "casual": ["Jeans", "T-shirt", "Sneakers"],
    "casual look": ["Jeans", "Shirt", "Sneakers"],
    "business casual": ["Blazer", "Dress Pants", "Loafers"],
    "formal": ["Blazer", "Dress Pants", "Formal Shoes"],
    "date night": ["Dress", "Heels"],
    "party": ["Dress", "Heels"],
    "beach": ["Swimsuit", "Shorts", "Flip-flops"],
    "winter": ["Coat", "Sweater", "Jeans", "Boots"],
    "summer": ["T-shirt", "Shorts", "Sneakers"],
    "athleisure": ["Leggings", "Sports Top", "Sneakers"],
    "casual weekend": ["Jeans", "Sweater", "Sneakers"],
    "office": ["Blazer", "Dress Pants", "Loafers"],
    "interview": ["Blazer", "Dress Pants", "Formal Shoes"],
    "wedding": ["Dress", "Heels"],
}


class ExtractedFilters(BaseModel):
    """Structured filters extracted from the query."""

    category: Optional[str] = Field(
        None,
        description="Clothing category: TOP, BOTTOM, FOOTWEAR, OUTERWEAR, DRESS, ACCESSORY (jackets/blazers/coats are OUTERWEAR with sub_category)",
    )
    sub_category: Optional[str] = Field(
        None,
        description="Specific type: Jacket, Shirt, Pants, Dress, etc. (directly mentioned in query)",
    )
    sub_categories: Optional[List[str]] = Field(
        None,
        description="Decomposed clothing items for outfit concepts (e.g., 'gym outfit' -> ['T-shirt', 'Sweatpants', 'Sneakers'])",
    )
    brand: Optional[str] = Field(None, description="Brand name if specified")
    color: Optional[str] = Field(
        None, description="Color if specified (e.g., 'navy', 'black', 'red')"
    )
    occasion: Optional[str] = Field(
        None,
        description="Occasion if specified: casual, formal, business, party, date, wedding, interview",
    )
    style: Optional[str] = Field(
        None,
        description="Style preference if specified: classic, modern, minimalist, bold, elegant",
    )
    price_range: Optional[str] = Field(
        None, description="Price preference if specified: budget, mid-range, luxury"
    )


class QueryAnalysis(BaseModel):
    """Structured output for query analysis."""

    search_scope: Literal["commerce", "wardrobe", "both"] = Field(
        description="Where to search: 'commerce' for new items, 'wardrobe' for existing clothes, 'both' for combination"
    )
    filters: ExtractedFilters = Field(description="Extracted filters from the query")
    reasoning: str = Field(description="Brief explanation of the analysis")


def _get_occasion_decomposition_fallback(message: str) -> Optional[List[str]]:
    """
    Fallback function to decompose outfit concepts using static map.

    Used when LLM decomposition fails or returns invalid results.

    Args:
        message: The user's message

    Returns:
        List of decomposed items, or None if no match found
    """
    message_lower = message.lower()

    # Check for exact or partial matches in fallback map
    for occasion_key, items in OCCASION_FALLBACK_MAP.items():
        if occasion_key in message_lower:
            return items

    return None


async def _decompose_outfit_occasion_llm(
    message: str,
    occasion: Optional[str],
) -> Optional[List[str]]:
    """
    Use LLM to intelligently decompose outfit occasions into specific items.

    Args:
        message: The full user message
        occasion: Already-extracted occasion string (if any)

    Returns:
        List of decomposed item types, or None if no outfit concept detected
    """
    llm_service = get_llm_service()

    decomposition_prompt = f"""You are a fashion stylist decomposing outfit concepts into specific clothing items.

Given the user's message, if they're asking for an outfit (not just a single item), decompose it into 2-4 specific clothing types.

User message: "{message}"
Detected occasion: {occasion or "none"}

If this is an outfit request (like "gym outfit", "casual look", "business casual"), return a JSON list of specific item types:
["Item Type 1", "Item Type 2", "Item Type 3"]

Item types should be concrete and specific:
- Good: "T-shirt", "Sweatpants", "Sneakers"
- Bad: "gym", "casual", "athletic"

If this is NOT an outfit request (just a single item like "I need a jacket"), return: null

Return ONLY valid JSON (a list or null), nothing else."""

    try:
        response = await llm_service.raw_chat(decomposition_prompt)
        response_text = response.strip()

        # Try to parse as JSON
        import json

        result = json.loads(response_text)

        # Validate result is a list of strings
        if (
            isinstance(result, list)
            and all(isinstance(item, str) for item in result)
            and len(result) >= 2
        ):
            logger.info(f"LLM decomposition successful: {result}")
            return result
        elif result is None:
            logger.info("LLM determined this is not an outfit request")
            return None
        else:
            logger.warning(f"LLM decomposition returned invalid format: {result}")
            return None
    except json.JSONDecodeError:
        logger.warning(f"LLM decomposition returned invalid JSON: {response_text}")
        return None
    except Exception as e:
        logger.error(f"LLM decomposition failed: {e}")
        return None


QUERY_ANALYZER_PROMPT = """You are a query analyzer for AesthetIQ, a fashion AI assistant.

Your task is to analyze the user's clothing-related query and extract:

1. **Search Scope** - Where should we look for items?
   - "wardrobe": User explicitly wants to use EXISTING clothes (keywords: "my wardrobe", "my closet", "what I have", "existing", "already own", "from my closet")
   - "commerce": User explicitly wants to BUY NEW items (keywords: "buy", "new", "purchase", "shop", "get new", "find me", "look for")
   - "both": DEFAULT for outfit requests and ambiguous cases. Search wardrobe FIRST, then show new items if needed (keywords: "make", "create", "put together", "need", "outfit", "look")

2. **Decision Logic for Search Scope**:
   - If user says "what can I make with what I have?" → "wardrobe"
   - If user says "buy me a jacket" → "commerce"
   - If user says "I need a casual outfit" or "casual weekend look" → "both" (DEFAULT - wardrobe first!)
   - If user says "what should I wear?" → "both" (DEFAULT - wardrobe first!)
   - If unclear/ambiguous → "both" (wardrobe-first is the safest default)

3. **Filters** - Extract any specific requirements:
   - category: TOP, BOTTOM, FOOTWEAR, OUTERWEAR, DRESS, ACCESSORY (Note: jackets, blazers, coats are categorized as OUTERWEAR with appropriate sub_category)
   - sub_category: Jacket, Blazer, Coat, Shirt, T-shirt, Pants, Jeans, Dress, Skirt, Sneakers, Boots, etc. (for directly mentioned items)
   - sub_categories: DECOMPOSED OUTFIT ITEMS - If user asks for an outfit concept, decompose it into concrete items:
     * "gym outfit" -> ["T-shirt", "Sweatpants", "Sneakers"]
     * "casual look" -> ["Jeans", "Shirt", "Sneakers"]
     * "business casual" -> ["Blazer", "Dress Pants", "Loafers"]
     * "date night" -> ["Dress", "Heels"]
     * "beach outfit" -> ["Swimsuit", "Shorts", "T-shirt"]
     * "athleisure" -> ["Leggings", "Sports Top", "Sneakers"]
     * "winter outfit" -> ["Coat", "Sweater", "Jeans", "Boots"]
   - brand: Any mentioned brand name
   - color: Any mentioned color
   - occasion: casual, formal, business, party, date, wedding, interview, everyday, gym, athletic
   - style: classic, modern, minimalist, bold, elegant, sporty, athletic
   - price_range: budget, mid-range, luxury (if mentioned)

Guidelines:
- **OUTFIT DECOMPOSITION**: If user mentions an outfit concept (gym outfit, casual look, business casual, etc.):
  1. Identify the outfit type
  2. Decompose it into 2-4 concrete clothing item types
  3. Return these in sub_categories list
  4. Set occasion to describe the context
- **DEFAULT TO "both"** for outfit requests and when intent is unclear - the recommender will search wardrobe first
- Only extract filters that are explicitly or clearly implied in the query
- Leave filters as null if not mentioned
- Prioritize outfit decomposition over generic searches (e.g., don't just search for "GYM", search for T-shirt, Sweatpants, etc.)
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
                content = msg.get("content", "")[:1000]
                context += f"- {role}: {content}\n"

        # Analyze query using structured output
        user_prompt = f"User query: {message}{context}"

        analysis = await llm_service.structured_chat(
            system_prompt=QUERY_ANALYZER_PROMPT,
            user_message=user_prompt,
            output_schema=QueryAnalysis,
        )

        # Convert filters to dict, removing None values
        filters_dict = {
            k: v for k, v in analysis.filters.model_dump().items() if v is not None
        }

        # === LLM-BASED OCCASION DECOMPOSITION WITH FALLBACK ===
        # Check if we have an occasion but no sub_categories (outfit decomposition needed)
        occasion = filters_dict.get("occasion")
        decomposed_items = filters_dict.get("sub_categories")

        if occasion and not decomposed_items:
            logger.info(
                f"Occasion detected '{occasion}' without outfit decomposition, attempting LLM decomposition..."
            )

            # Try LLM decomposition first
            llm_decomposed = await _decompose_outfit_occasion_llm(message, occasion)

            if llm_decomposed:
                filters_dict["sub_categories"] = llm_decomposed
                logger.info(f"LLM decomposition succeeded: {llm_decomposed}")
            else:
                # Fallback to static map
                fallback_decomposed = _get_occasion_decomposition_fallback(message)
                if fallback_decomposed:
                    filters_dict["sub_categories"] = fallback_decomposed
                    logger.info(f"Fallback decomposition used: {fallback_decomposed}")
                else:
                    logger.warning(f"No decomposition found for occasion '{occasion}'")

        if filters_dict.get("sub_categories") and filters_dict.get("category"):
            if not filters_dict.get("sub_category"):
                logger.info(
                    "Clearing category filter for outfit decomposition to avoid narrowing"
                )
                filters_dict.pop("category", None)

        # === OUTFIT ATTACHMENT CONTEXT ===
        attached_outfits = state.get("attached_outfits") or []
        swap_intents = state.get("swap_intents") or []

        def _category_to_search_guidance(category: str) -> str:
            """Generate natural language search guidance for a category.
            This helps the agent construct proper search queries instead of searching for generic terms like 'BOTTOM'.
            """
            guidance = {
                "TOP": "tops, shirts, blouses, sweaters",
                "BOTTOM": "bottoms, jeans, pants, shorts, skirts",
                "OUTERWEAR": "outerwear, jackets, coats, blazers",
                "FOOTWEAR": "footwear, sneakers, boots, sandals, heels",
                "ACCESSORY": "accessories, bags, jewelry, belts, scarves, hats",
                "DRESS": "dresses, maxi, midi, mini, cocktail",
            }
            return guidance.get(category, category.lower())

        def _missing_categories(outfit: Dict[str, Any]) -> List[str]:
            items = outfit.get("items", {}) if isinstance(outfit, dict) else {}
            missing = []
            if not items.get("top"):
                missing.append("TOP")
            if not items.get("bottom"):
                missing.append("BOTTOM")
            if not items.get("outerwear"):
                missing.append("OUTERWEAR")
            if not items.get("footwear"):
                missing.append("FOOTWEAR")
            if not items.get("dress"):
                missing.append("DRESS")
            if not (items.get("accessories") or []):
                missing.append("ACCESSORY")
            return missing

        target_categories: List[str] = []
        if swap_intents:
            target_categories = [
                intent.get("category")
                for intent in swap_intents
                if intent.get("category")
            ]
        elif attached_outfits:
            for outfit in attached_outfits:
                target_categories.extend(_missing_categories(outfit))

        target_categories = [c for c in target_categories if c]
        unique_targets = list(dict.fromkeys(target_categories))

        # Check if LLM extracted a specific sub_category - if it did, user was specific about what they want
        user_was_specific = bool(filters_dict.get("sub_category"))

        # Prioritize outfit attachment context - override LLM-extracted filters if outfit context exists
        if unique_targets and attached_outfits:
            logger.info(
                f"Overriding filters with outfit attachment context: {unique_targets}"
            )
            if len(unique_targets) == 1:
                # Single missing category - set it as category filter
                filters_dict["category"] = unique_targets[0]
                # Only add generic search hint if user didn't specify a particular item
                if not user_was_specific:
                    search_hint = _category_to_search_guidance(unique_targets[0])
                    filters_dict["_search_hint"] = search_hint
                    logger.info(
                        f"Set category filter: {unique_targets[0]} with search hint: {search_hint}"
                    )
                else:
                    logger.info(
                        f"Set category filter: {unique_targets[0]}, preserving user's specific sub_category: {filters_dict.get('sub_category')}"
                    )
            else:
                # Multiple missing categories - pass as list
                filters_dict["target_categories"] = unique_targets
                # Only add generic search hints if user didn't specify a particular item
                if not user_was_specific:
                    combined_hints = ", ".join(
                        [_category_to_search_guidance(cat) for cat in unique_targets]
                    )
                    filters_dict["_search_hint"] = combined_hints
                    logger.info(
                        f"Set target categories: {unique_targets} with search hints: {combined_hints}"
                    )
                else:
                    logger.info(
                        f"Set target categories: {unique_targets}, preserving user's specific sub_category: {filters_dict.get('sub_category')}"
                    )
        elif (
            unique_targets
            and not filters_dict.get("category")
            and not filters_dict.get("sub_categories")
        ):
            # Fall back to applying target categories if no filters yet and swap intents specified
            logger.info(
                f"Applying target categories from swap intents: {unique_targets}"
            )
            if len(unique_targets) == 1:
                filters_dict["category"] = unique_targets[0]
                if not user_was_specific:
                    search_hint = _category_to_search_guidance(unique_targets[0])
                    filters_dict["_search_hint"] = search_hint
                    logger.info(
                        f"Set category filter: {unique_targets[0]} with search hint: {search_hint}"
                    )
                else:
                    logger.info(
                        f"Set category filter: {unique_targets[0]}, preserving user's specific sub_category: {filters_dict.get('sub_category')}"
                    )
            else:
                filters_dict["target_categories"] = unique_targets
                if not user_was_specific:
                    combined_hints = ", ".join(
                        [_category_to_search_guidance(cat) for cat in unique_targets]
                    )
                    filters_dict["_search_hint"] = combined_hints
                    logger.info(
                        f"Set target categories: {unique_targets} with search hints: {combined_hints}"
                    )
                else:
                    logger.info(
                        f"Set target categories: {unique_targets}, preserving user's specific sub_category: {filters_dict.get('sub_category')}"
                    )

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
                    "decomposed_items": filters_dict.get("sub_categories"),
                },
            )

        logger.info(
            f"Query analyzed: scope={analysis.search_scope}, filters={filters_dict}"
        )

        # Update metadata
        metadata = state.get("metadata", {})
        metadata["query_analysis"] = {
            "search_scope": analysis.search_scope,
            "filters": filters_dict,
            "reasoning": analysis.reasoning,
        }
        if unique_targets:
            metadata["outfit_target_categories"] = unique_targets

        return {
            "search_scope": analysis.search_scope,
            "extracted_filters": filters_dict,
            "metadata": metadata,
        }

    except Exception as e:
        logger.error(f"Query analysis failed: {e}")

        # Minimal fallback - just determine scope, let agent handle filters
        message_lower = message.lower()
        scope = (
            "wardrobe"
            if "wardrobe" in message_lower or "closet" in message_lower
            else "commerce"
        )

        # Try fallback decomposition anyway
        filters_dict = {}
        fallback_decomposed = _get_occasion_decomposition_fallback(message)
        if fallback_decomposed:
            filters_dict["sub_categories"] = fallback_decomposed

        logger.warning(
            f"Fallback query analysis: scope={scope}, filters={filters_dict}"
        )

        metadata = state.get("metadata", {})
        metadata["query_analysis"] = {
            "search_scope": scope,
            "filters": filters_dict,
            "error": str(e),
        }

        return {
            "search_scope": scope,
            "extracted_filters": filters_dict,
            "metadata": metadata,
        }
