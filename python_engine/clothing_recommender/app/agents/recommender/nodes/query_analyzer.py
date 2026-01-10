"""Query Analyzer node for the Recommender agent.

This node extracts structured filters and semantic query from user input.
On retry iterations, it incorporates refinement suggestions.
"""
import json
from typing import Any

from app.core.logger import get_logger
from app.agents.recommender.state import (
    RecommenderState, 
    RecommenderStage, 
    ExtractedFilters,
    Category,
    SUBCATEGORIES,
)
from app.services.llm.langchain_service import LangChainService
from app.prompts import get_prompt_manager

logger = get_logger(__name__)
prompt_manager = get_prompt_manager()


async def query_analyzer_node(
    state: RecommenderState,
    llm_service: LangChainService
) -> dict[str, Any]:
    """
    Analyze user query and extract filters + semantic query.
    
    On first iteration (iteration=0):
        - Analyzes raw user query
        - Extracts category, subCategory, brand filters
        - Generates semantic search query
        - Determines if profile context is needed
    
    On retry iterations (iteration>0):
        - Incorporates refinement_suggestions from verifier
        - Adjusts filters (broaden/narrow)
        - Modifies semantic query
    
    Args:
        state: Current recommender state
        llm_service: LangChain service for LLM calls
        
    Returns:
        Updated state fields
    """
    user_query = state["user_query"]
    iteration = state.get("iteration", 0)
    refinement_suggestions = state.get("refinement_suggestions")
    
    logger.info(f"Query analyzer: iteration={iteration}, query='{user_query[:50]}...'")
    
    # Build context for prompt
    categories_info = _build_categories_info()
    
    # Build prompt based on iteration
    retry_context = ""
    if iteration > 0 and refinement_suggestions:
        # Retry with refinement suggestions
        previous_filters = json.dumps(state.get("filters", {}), indent=2)
        retry_context = f"""
## Previous Search Context:
This is a RETRY attempt. The previous search did not return enough valid results.

Previous filters used:
{previous_filters}

Refinement suggestions from verifier:
{refinement_suggestions}

Please adjust your analysis based on these suggestions. Consider:
- Broadening filters if too restrictive
- Narrowing filters if results were too generic
- Modifying the semantic query for better matches
"""
    
    system_prompt = prompt_manager.get_template(
        "recommender_query_analyzer",
        categories_info=categories_info,
        user_query=user_query,
        retry_context=retry_context,
    )
    
    try:
        response = await llm_service.generate_response(
            message="",
            system_prompt=system_prompt,
        )
        
        # Parse JSON response
        result = _parse_analyzer_response(response)
        
        # Validate and normalize filters
        filters = _validate_filters(result.get("filters", {}))
        semantic_query = result.get("semantic_query", user_query)
        needs_profile = result.get("needs_profile", False)
        
        logger.info(
            f"Query analysis complete: filters={filters}, "
            f"semantic_query='{semantic_query[:50]}...', needs_profile={needs_profile}"
        )
        
        return {
            "filters": filters,
            "semantic_query": semantic_query,
            "needs_profile": needs_profile,
            "current_stage": RecommenderStage.ANALYZING,
            "stage_metadata": {
                "iteration": iteration,
                "filters_extracted": bool(filters),
            },
        }
        
    except Exception as e:
        logger.error(f"Query analysis failed: {e}")
        # Fallback: use query as-is with no filters
        return {
            "filters": {},
            "semantic_query": user_query,
            "needs_profile": True,  # Conservative: fetch profile
            "current_stage": RecommenderStage.ANALYZING,
            "stage_metadata": {"error": str(e)},
        }


def _build_categories_info() -> str:
    """Build categories information string for prompt."""
    lines = []
    for category in Category:
        subcats = SUBCATEGORIES.get(category, [])
        lines.append(f"- {category.value}: {', '.join(subcats)}")
    return "\n".join(lines)


def _parse_analyzer_response(response: str) -> dict:
    """
    Parse LLM response into structured data.
    
    Expects JSON format:
    {
        "filters": {"category": "TOP", "subCategory": null, "brand": null},
        "semantic_query": "elegant party outfit",
        "needs_profile": true
    }
    """
    # Try to extract JSON from response
    response = response.strip()
    
    # Handle markdown code blocks
    if response.startswith("```"):
        lines = response.split("\n")
        # Remove first and last lines (code block markers)
        json_lines = []
        in_block = False
        for line in lines:
            if line.startswith("```"):
                in_block = not in_block
                continue
            if in_block or not line.startswith("```"):
                json_lines.append(line)
        response = "\n".join(json_lines)
    
    try:
        return json.loads(response)
    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse JSON response: {e}")
        # Try to find JSON object in response
        start = response.find("{")
        end = response.rfind("}") + 1
        if start != -1 and end > start:
            try:
                return json.loads(response[start:end])
            except json.JSONDecodeError:
                pass
        
        # Return empty result
        return {}


def _validate_filters(filters: dict) -> ExtractedFilters:
    """
    Validate and normalize extracted filters.
    
    Args:
        filters: Raw filters from LLM
        
    Returns:
        Validated ExtractedFilters
    """
    validated: ExtractedFilters = {}
    
    # Validate category
    if category := filters.get("category"):
        category_upper = str(category).upper()
        if category_upper in [c.value for c in Category]:
            validated["category"] = category_upper
    
    # Validate subCategory
    if sub_category := filters.get("subCategory"):
        # Check if it's valid for the category (case-insensitive)
        sub_category_str = str(sub_category)
        valid_subcats = []
        
        if validated.get("category"):
            cat = Category(validated["category"])
            valid_subcats = SUBCATEGORIES.get(cat, [])
        else:
            # Check all categories
            for subcats in SUBCATEGORIES.values():
                valid_subcats.extend(subcats)
        
        # Case-insensitive match
        for valid in valid_subcats:
            if valid.lower() == sub_category_str.lower():
                validated["subCategory"] = valid
                break
    
    # Validate brand (no validation needed, just normalize)
    if brand := filters.get("brand"):
        validated["brand"] = str(brand).strip()
    
    # Validate colorHex
    if color := filters.get("colorHex"):
        color_str = str(color).strip()
        if color_str.startswith("#") and len(color_str) == 7:
            validated["colorHex"] = color_str
    
    return validated
