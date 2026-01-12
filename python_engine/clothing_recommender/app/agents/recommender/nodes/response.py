"""Response node for the Recommender agent.

This node formats the final response with item IDs.
"""
from typing import Any

from app.core.logger import get_logger
from app.agents.recommender.state import RecommenderState, RecommenderStage

logger = get_logger(__name__)


def _is_technical_error(error: str) -> bool:
    """Check if error message contains technical details that shouldn't be shown to users."""
    technical_indicators = [
        "mongo", "aggregation", "planexecutor", "dns", "connection",
        "timeout", "auth", "unauthorized", "traceback", "exception",
        "index", "::caused by::", "errmsg", "codename"
    ]
    error_lower = error.lower()
    return any(indicator in error_lower for indicator in technical_indicators)


async def response_node(state: RecommenderState) -> dict[str, Any]:
    """
    Format final response with recommended item IDs.
    
    Handles both success and fallback scenarios.
    
    Args:
        state: Current recommender state
        
    Returns:
        Updated state with response fields
    """
    valid_item_ids = state.get("valid_item_ids", [])
    iteration = state.get("iteration", 0)
    error = state.get("error")
    
    logger.info(
        f"Response node: items={len(valid_item_ids)}, "
        f"iterations={iteration + 1}, error={error}"
    )
    
    if error:
        # Error occurred during processing - error should already be sanitized
        # but add fallback sanitization just in case
        user_message = error if not _is_technical_error(error) else "An error occurred during search."
        return {
            "response_item_ids": [],
            "response_message": f"Unable to find recommendations. {user_message}",
            "current_stage": RecommenderStage.RESPONDING,
            "stage_metadata": {
                "success": False,
                "error": error,
            },
        }
    
    if not valid_item_ids:
        # No valid items found after all iterations
        return {
            "response_item_ids": [],
            "response_message": (
                "No matching items found in the wardrobe. "
                "Try a different search with different keywords or broader criteria."
            ),
            "current_stage": RecommenderStage.RESPONDING,
            "stage_metadata": {
                "success": False,
                "fallback": True,
                "iterations": iteration + 1,
            },
        }
    
    # Success - return valid item IDs
    return {
        "response_item_ids": valid_item_ids,
        "response_message": None,
        "current_stage": RecommenderStage.RESPONDING,
        "stage_metadata": {
            "success": True,
            "total_items": len(valid_item_ids),
            "iterations": iteration + 1,
        },
    }
