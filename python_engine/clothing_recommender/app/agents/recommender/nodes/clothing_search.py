"""Clothing Search node for the Recommender agent.

This node performs vector similarity search on the wardrobe collection.
"""
from typing import Any

from app.core.logger import get_logger
from app.core.config import get_settings
from app.agents.recommender.state import RecommenderState, RecommenderStage
from app.services.embedding_client import EmbeddingClient
from app.services.mongodb.wardrobe_repo import WardrobeRepository

logger = get_logger(__name__)
settings = get_settings()


async def clothing_search_node(
    state: RecommenderState,
    embedding_client: EmbeddingClient,
    wardrobe_repo: WardrobeRepository,
) -> dict[str, Any]:
    """
    Search for clothing items using vector similarity.
    
    Steps:
    1. Build semantic query (possibly enhanced with profile info)
    2. Generate embedding via embedding service
    3. Execute vector search on MongoDB Atlas
    
    Args:
        state: Current recommender state
        embedding_client: Client for embedding service
        wardrobe_repo: Wardrobe repository
        
    Returns:
        Updated state fields with search_results
    """
    semantic_query = state["semantic_query"]
    filters = state.get("filters", {})
    user_profile = state.get("user_profile")
    iteration = state.get("iteration", 0)
    
    logger.info(
        f"Clothing search: iteration={iteration}, "
        f"query='{semantic_query[:50]}...', filters={filters}"
    )
    
    # Enhance query with profile context if available
    enhanced_query = _enhance_query_with_profile(semantic_query, user_profile)
    
    try:
        # Step 1: Generate embedding
        logger.info("Generating embedding for search query")
        embedding = await embedding_client.embed_text(enhanced_query)
        
        # Step 2: Execute vector search
        logger.info(f"Executing vector search with {len(filters)} filters")
        results = await wardrobe_repo.vector_search(
            query_embedding=embedding,
            filters=filters if filters else None,
            limit=settings.RECOMMENDER_SEARCH_LIMIT,
        )
        
        logger.info(f"Vector search returned {len(results)} items")
        
        return {
            "search_results": results,
            "current_stage": RecommenderStage.SEARCHING,
            "stage_metadata": {
                "iteration": iteration,
                "results_count": len(results),
                "filters_used": filters,
            },
        }
        
    except Exception as e:
        logger.error(f"Clothing search failed: {e}")
        sanitized_error = _sanitize_error_message(str(e))
        return {
            "search_results": [],
            "current_stage": RecommenderStage.SEARCHING,
            "stage_metadata": {
                "error": str(e),  # Keep full error in metadata for debugging
                "iteration": iteration,
            },
            "error": sanitized_error,
        }


def _sanitize_error_message(error: str) -> str:
    """
    Sanitize error messages for user-facing display.
    
    Hides technical MongoDB/internal errors and provides friendly messages.
    """
    error_lower = error.lower()
    
    # MongoDB filter index errors
    if "needs to be indexed as filter" in error_lower:
        return "Search filters are temporarily unavailable. Showing general results."
    
    # MongoDB connection errors
    if "dns" in error_lower or "connection" in error_lower or "timeout" in error_lower:
        return "Unable to connect to the database. Please try again later."
    
    # Authentication errors
    if "auth" in error_lower or "unauthorized" in error_lower:
        return "Database access error. Please contact support."
    
    # Embedding service errors
    if "embedding" in error_lower or "embed" in error_lower:
        return "Unable to process your search query. Please try again."
    
    # Generic database errors
    if "mongo" in error_lower or "aggregation" in error_lower or "planexecutor" in error_lower:
        return "Search encountered a database issue. Please try a simpler query."
    
    # Default: generic message (don't expose internal details)
    return "Search encountered an unexpected error. Please try again."


def _enhance_query_with_profile(
    semantic_query: str,
    user_profile: dict | None
) -> str:
    """
    Enhance semantic query with user profile context.
    
    Adds style preferences to improve search relevance.
    
    Args:
        semantic_query: Base semantic query
        user_profile: User style profile (optional)
        
    Returns:
        Enhanced query string
    """
    if not user_profile:
        return semantic_query
    
    enhancements = []
    
    # Add archetype context
    if archetype := user_profile.get("archetype"):
        enhancements.append(f"{archetype} style")
    
    # Add style slider context
    if sliders := user_profile.get("sliders"):
        formal = sliders.get("formal", 50)
        colorful = sliders.get("colorful", 50)
        
        if formal > 70:
            enhancements.append("formal elegant")
        elif formal < 30:
            enhancements.append("casual relaxed")
        
        if colorful > 70:
            enhancements.append("colorful vibrant")
        elif colorful < 30:
            enhancements.append("neutral muted colors")
    
    # Add favorite brands as context (not filter)
    if brands := user_profile.get("favoriteBrands"):
        if brands:
            # Just mention the style, not specific brands
            enhancements.append("premium quality")
    
    if enhancements:
        enhanced = f"{semantic_query}, {', '.join(enhancements)}"
        logger.info(f"Enhanced query: {enhanced[:80]}...")
        return enhanced
    
    return semantic_query
