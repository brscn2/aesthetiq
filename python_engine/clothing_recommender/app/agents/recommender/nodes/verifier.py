"""Verifier node for the Recommender agent.

This node verifies search results against user requirements
and provides refinement suggestions if needed.
"""
import json
from typing import Any

from app.core.logger import get_logger
from app.core.config import get_settings
from app.agents.recommender.state import RecommenderState, RecommenderStage, WardrobeItem
from app.services.llm.langchain_service import LangChainService
from app.prompts import get_prompt_manager

logger = get_logger(__name__)
settings = get_settings()
prompt_manager = get_prompt_manager()


async def verifier_node(
    state: RecommenderState,
    llm_service: LangChainService,
) -> dict[str, Any]:
    """
    Verify search results and filter valid items.
    
    Uses LLM to analyze each result against:
    - Original user query
    - User profile preferences (if available)
    
    If insufficient results, provides refinement suggestions.
    
    Args:
        state: Current recommender state
        llm_service: LangChain service for LLM calls
        
    Returns:
        Updated state with valid_item_ids, is_sufficient, refinement_suggestions
    """
    user_query = state["user_query"]
    search_results = state.get("search_results", [])
    user_profile = state.get("user_profile")
    iteration = state.get("iteration", 0)
    filters = state.get("filters", {})
    
    logger.info(
        f"Verifier: iteration={iteration}, results_count={len(search_results)}"
    )
    
    if not search_results:
        # No results to verify
        logger.info("No search results to verify")
        return {
            "valid_item_ids": [],
            "is_sufficient": False,
            "refinement_suggestions": _generate_no_results_suggestion(filters),
            "iteration": iteration + 1,  # Increment for retry
            "current_stage": RecommenderStage.VERIFYING,
            "stage_metadata": {
                "iteration": iteration,
                "candidates": 0,
                "valid_count": 0,
            },
        }
    
    # Format results for LLM
    results_summary = _format_results_for_verification(search_results)
    profile_summary = _format_profile_for_verification(user_profile)
    
    system_prompt = prompt_manager.get_template(
        "recommender_verifier",
        user_query=user_query,
        results_summary=results_summary,
        profile_summary=profile_summary,
        filters_used=json.dumps(filters, indent=2),
        min_results=settings.RECOMMENDER_MIN_RESULTS,
        iteration=iteration,
        max_iterations=settings.RECOMMENDER_MAX_ITERATIONS,
    )
    
    try:
        response = await llm_service.generate_response(
            message="",
            system_prompt=system_prompt,
        )
        
        result = _parse_verifier_response(response, search_results)
        
        valid_ids = result.get("valid_item_ids", [])
        is_sufficient = len(valid_ids) >= settings.RECOMMENDER_MIN_RESULTS
        refinement_suggestions = result.get("refinement_suggestions")
        
        logger.info(
            f"Verification complete: valid={len(valid_ids)}, "
            f"sufficient={is_sufficient}"
        )
        
        # Increment iteration if we need to retry
        next_iteration = iteration + 1 if not is_sufficient else iteration
        
        return {
            "valid_item_ids": valid_ids,
            "is_sufficient": is_sufficient,
            "refinement_suggestions": refinement_suggestions if not is_sufficient else None,
            "iteration": next_iteration,  # Increment for retry
            "current_stage": RecommenderStage.VERIFYING,
            "stage_metadata": {
                "iteration": iteration,
                "candidates": len(search_results),
                "valid_count": len(valid_ids),
            },
        }
        
    except Exception as e:
        logger.error(f"Verification failed: {e}")
        # Fallback: accept top results by score
        valid_ids = [r["_id"] for r in search_results[:settings.RECOMMENDER_MIN_RESULTS]]
        return {
            "valid_item_ids": valid_ids,
            "is_sufficient": len(valid_ids) >= settings.RECOMMENDER_MIN_RESULTS,
            "refinement_suggestions": None,
            "iteration": iteration + 1,  # Increment to prevent infinite loop
            "current_stage": RecommenderStage.VERIFYING,
            "stage_metadata": {"error": str(e)},
        }


def _format_results_for_verification(results: list[WardrobeItem]) -> str:
    """Format search results as text for LLM verification."""
    lines = []
    for i, item in enumerate(results, 1):
        parts = [f"{i}. ID: {item['_id']}"]
        
        if cat := item.get("category"):
            parts.append(f"Category: {cat}")
        if sub := item.get("subCategory"):
            parts.append(f"SubCategory: {sub}")
        if brand := item.get("brand"):
            parts.append(f"Brand: {brand}")
        if color := item.get("colorHex"):
            parts.append(f"Color: {color}")
        if desc := item.get("description"):
            # Truncate long descriptions
            parts.append(f"Description: {desc[:100]}{'...' if len(desc) > 100 else ''}")
        if score := item.get("score"):
            parts.append(f"Score: {score:.3f}")
        
        lines.append(" | ".join(parts))
    
    return "\n".join(lines)


def _format_profile_for_verification(profile: dict | None) -> str:
    """Format user profile as text for LLM."""
    if not profile:
        return "No user profile available. Accept items that generally match the query."
    
    parts = []
    
    if archetype := profile.get("archetype"):
        parts.append(f"Style Archetype: {archetype}")
        # Add description based on archetype
        archetype_descriptions = {
            "minimalist": "Prefers clean lines, neutral colors, simple designs",
            "classic": "Prefers timeless pieces, tailored fits, traditional styles",
            "trendy": "Prefers current fashion trends, bold choices, statement pieces",
            "bohemian": "Prefers relaxed fits, earthy tones, artistic patterns",
            "streetwear": "Prefers urban styles, graphic designs, casual comfort",
            "elegant": "Prefers sophisticated pieces, luxurious fabrics, refined aesthetics",
            "sporty": "Prefers athletic wear, functional clothing, active styles",
            "romantic": "Prefers feminine details, soft colors, delicate fabrics",
        }
        if desc := archetype_descriptions.get(archetype.lower()):
            parts.append(f"  → {desc}")
    
    if sliders := profile.get("sliders"):
        formal = sliders.get("formal", 50)
        colorful = sliders.get("colorful", 50)
        
        # Add descriptive labels
        formal_label = "very casual" if formal < 25 else "casual" if formal < 50 else "smart casual" if formal < 75 else "formal"
        color_label = "neutral/muted" if colorful < 25 else "balanced" if colorful < 75 else "bold/colorful"
        
        parts.append(f"Formal preference: {formal}/100 ({formal_label})")
        parts.append(f"Color preference: {colorful}/100 ({color_label})")
    
    if colors := profile.get("favoriteColors"):
        parts.append(f"Favorite colors: {', '.join(colors)}")
    
    if brands := profile.get("favoriteBrands"):
        parts.append(f"Favorite brands: {', '.join(brands)}")
    
    if constraints := profile.get("negativeConstraints"):
        parts.append(f"Dislikes/Avoids: {', '.join(constraints)}")
    
    if not parts:
        return "No specific style preferences. Accept items that generally match the query."
    
    return "\n".join(parts)


def _generate_no_results_suggestion(filters: dict) -> str:
    """Generate suggestions when no results found."""
    suggestions = []
    
    if filters.get("category"):
        suggestions.append("Try removing the category filter to search all clothing types")
    if filters.get("subCategory"):
        suggestions.append("Try removing the subCategory filter for broader results")
    if filters.get("brand"):
        suggestions.append("Try removing the brand filter to include all brands")
    
    if not suggestions:
        suggestions.append("Try using a more general search query")
        suggestions.append("Consider different keywords or style descriptions")
    
    return ". ".join(suggestions) + "."


def _parse_verifier_response(response: str, search_results: list[WardrobeItem]) -> dict:
    """
    Parse LLM verification response.
    
    Expects JSON format:
    {
        "valid_item_ids": ["id1", "id2"],
        "refinement_suggestions": "Try broader search..."
    }
    """
    response = response.strip()
    
    # Handle markdown code blocks
    if "```" in response:
        lines = response.split("\n")
        json_lines = []
        in_block = False
        for line in lines:
            if line.startswith("```"):
                in_block = not in_block
                continue
            if in_block:
                json_lines.append(line)
        response = "\n".join(json_lines)
    
    try:
        result = json.loads(response)
    except json.JSONDecodeError:
        # Try to find JSON in response
        start = response.find("{")
        end = response.rfind("}") + 1
        if start != -1 and end > start:
            try:
                result = json.loads(response[start:end])
            except json.JSONDecodeError:
                result = {}
        else:
            result = {}
    
    # Validate item IDs exist in search results
    valid_result_ids = {r["_id"] for r in search_results}
    valid_ids = []
    
    for item_id in result.get("valid_item_ids", []):
        item_id_str = str(item_id)
        if item_id_str in valid_result_ids:
            valid_ids.append(item_id_str)
    
    return {
        "valid_item_ids": valid_ids,
        "refinement_suggestions": result.get("refinement_suggestions"),
    }
