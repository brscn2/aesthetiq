"""Clothing Analyzer Agent for validating and refining results.

This agent evaluates the retrieved clothing items and decides:
- APPROVE: Items match the query and style DNA well
- APPROVE_WITH_FEEDBACK: Items are acceptable, but user wants to mark some as disliked before showing
- REFINE: Items don't match well, provide improvement suggestions
- CLARIFY: Query is too vague, ask clarifying question
"""
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from app.workflows.state import ConversationState, ItemFeedback, ItemFeedbackType, ItemFeedbackReason
from app.services.llm_service import get_llm_service
from app.services.tracing.langfuse_service import get_tracing_service
from app.mcp import get_mcp_tools
from app.core.config import get_settings
from app.core.logger import get_logger

logger = get_logger(__name__)


class ItemFeedbackRecord(BaseModel):
    """Item feedback to save."""
    item_id: str = Field(description="ID of the item")
    feedback: Literal["like", "dislike", "irrelevant"] = Field(description="Type of feedback")
    reason: Optional[str] = Field(None, description="Reason code: wrong_color, wrong_size, too_expensive, not_style, not_occasion, already_have, other")
    reason_text: Optional[str] = Field(None, description="Free-form reason text if reason is 'other'")


class RefinementFilters(BaseModel):
    """Structured filter updates for refinement."""
    category: Optional[str] = Field(None, description="Category to filter: TOP, BOTTOM, SHOE, ACCESSORY")
    sub_category: Optional[str] = Field(None, description="Specific type: Jacket, Shirt, Dress, Pants, etc.")
    occasion: Optional[str] = Field(None, description="Occasion: casual, formal, business, party, wedding, interview")
    style: Optional[str] = Field(None, description="Style: classic, modern, minimalist, bold, elegant")
    color: Optional[str] = Field(None, description="Color preference")
    price_range: Optional[str] = Field(None, description="Price range: budget, mid-range, luxury")
    brand: Optional[str] = Field(None, description="Brand preference")


class AnalysisDecision(BaseModel):
    """Structured output for analysis decision."""
    decision: Literal["approve", "approve_with_feedback", "refine", "clarify"] = Field(
        description="Decision: 'approve' if items are good, 'approve_with_feedback' if user wants to mark items before approval, 'refine' if need improvement, 'clarify' if query is vague"
    )
    confidence: float = Field(
        description="Confidence score between 0 and 1",
        ge=0.0,
        le=1.0,
    )
    reasoning: str = Field(
        description="Brief explanation of the decision"
    )
    filter_updates: Optional[RefinementFilters] = Field(
        None,
        description="Structured filter updates for refinement (only if decision is 'refine')"
    )
    clarification_question: Optional[str] = Field(
        None,
        description="Question to ask the user (if decision is 'clarify')"
    )
    item_feedback: Optional[List[ItemFeedbackRecord]] = Field(
        None,
        description="Items to mark as disliked before showing results (if decision is 'approve_with_feedback')"
    )


ANALYZER_PROMPT = """You are the Clothing Analyzer for AesthetIQ, a fashion AI assistant.

Your task is to evaluate the retrieved clothing items and decide what to do next.

**Your Decision Options:**

1. **APPROVE** - Use when:
   - Items match the user's query reasonably well
   - Items align with the user's style DNA
   - There are enough relevant results
   - Confidence is high (>0.7)
   - No items need to be marked as disliked

2. **APPROVE_WITH_FEEDBACK** - Use when:
   - Overall items are acceptable and match the query
   - BUT you notice 1-3 specific items that clearly DON'T match (wrong color, wrong occasion, too expensive)
   - Instead of refining the whole search, mark those items for the user to dislike them
   - This helps personalize future searches while still showing good options
   - Only use this if there are clearly wrong items mixed with good ones

3. **REFINE** - Use when:
   - Most items don't match the query well
   - Category is entirely wrong
   - There are too few results (<3 items)
   - Style DNA suggests very different options would be better
   - Provide structured filter_updates with specific values to improve search

4. **CLARIFY** - Use when:
   - The query is too vague
   - Essential information is missing (size, budget, specific style)
   - Provide a specific question to ask the user

**For APPROVE_WITH_FEEDBACK:**
  - item_id: The exact ID from the retrieved items
  - feedback: Always "dislike"
  - reason: Code like 'wrong_color', 'wrong_size', 'too_expensive', 'not_style', 'not_occasion', etc.
  - reason_text: Optional explanation

**For REFINE decisions, provide filter_updates with specific values:**

**Guidelines:**
"""


async def clothing_analyzer_node(state: ConversationState) -> Dict[str, Any]:
    """
    Clothing analyzer agent node - validates and refines results.
    
    Reads:
        - state["message"]: The user's original message
        - state["retrieved_items"]: Items from the recommender
        - state["style_dna"]: User's style preferences
        - state["user_profile"]: User profile data
        - state["extracted_filters"]: Extracted filters from query
        - state["iteration"]: Current iteration count
        
    Writes:
        - state["analysis_result"]: {"decision": ..., "confidence": ..., "notes": ...}
        - state["refinement_notes"]: Notes for refinement (if decision is "refine")
        - state["needs_clarification"]: Whether clarification is needed
        - state["clarification_question"]: Question to ask (if needs clarification)
        - state["iteration"]: Incremented iteration count
    """
    message = state.get("message", "")
    retrieved_items = state.get("retrieved_items") or []
    style_dna = state.get("style_dna")
    user_profile = state.get("user_profile")
    extracted_filters = state.get("extracted_filters", {})
    iteration = state.get("iteration", 0)
    
    # Verify state reading in refinement loops
    previous_analysis = state.get("analysis_result")
    previous_refinement_notes = state.get("refinement_notes") or []
    logger.info(
        f"[ANALYZER] State verification - iteration={iteration}, "
        f"items_count={len(retrieved_items) if isinstance(retrieved_items, list) else 0}, "
        f"has_previous_analysis={previous_analysis is not None}, "
        f"previous_refinement_notes_count={len(previous_refinement_notes)}"
    )
    trace_id = state.get("langfuse_trace_id")
    
    logger.info(f"Clothing analyzer evaluating {len(retrieved_items)} items (iteration {iteration})")
    
    # Get services
    llm_service = get_llm_service()
    tracing_service = get_tracing_service()
    
    # Log agent transition
    if trace_id:
        tracing_service.log_agent_transition(
            trace_id=trace_id,
            from_agent="clothing_recommender",
            to_agent="clothing_analyzer",
            reason=f"Analyzing {len(retrieved_items)} items, iteration {iteration}",
        )
    
    try:
        # Check max iterations
        max_iterations = get_settings().MAX_REFINEMENT_ITERATIONS
        if iteration >= max_iterations:
            logger.warning(f"Max iterations reached ({max_iterations}), forcing approval")
            return {
                "analysis_result": {
                    "decision": "approve",
                    "approved": True,
                    "confidence": 0.5,
                    "notes": ["Max iterations reached, proceeding with available items"],
                },
                "iteration": iteration + 1,
                "needs_clarification": False,
            }
        
        # Build analysis context - handle structured items from MCP tools
        items_summary = ""
        if retrieved_items:
            for i, item in enumerate(retrieved_items[:5], 1):  # Max 5 items
                if isinstance(item, dict):
                    # Check if this is a structured clothing item (from MCP tools)
                    if "name" in item:
                        name = item.get("name", "Unknown")
                        brand = item.get("brand", "")
                        price = item.get("price")
                        color = item.get("color") or item.get("raw", {}).get("color", "")
                        category = item.get("category", "")
                        sub_category = item.get("subCategory") or item.get("raw", {}).get("sub_category", "")
                        source = item.get("source", "unknown")
                        
                        # Build detailed item description for analysis
                        item_details = [f"Name: {name}"]
                        if brand:
                            item_details.append(f"Brand: {brand}")
                        if category:
                            item_details.append(f"Category: {category}")
                        if sub_category:
                            item_details.append(f"Type: {sub_category}")
                        if color:
                            item_details.append(f"Color: {color}")
                        if price:
                            item_details.append(f"Price: ${price}")
                        item_details.append(f"Source: {source}")
                        
                        items_summary += f"\nItem {i}: {' | '.join(item_details)}"
                    
                    # Handle agent response format (legacy)
                    elif "type" in item or "content" in item:
                        item_type = item.get("type", "unknown")
                        content = item.get("content", "")[:200]
                        items_summary += f"\nItem {i} ({item_type}): {content}"
                    
                    # Handle raw dict (fallback)
                    else:
                        items_summary += f"\nItem {i}: {str(item)[:200]}"
                else:
                    items_summary += f"\nItem {i}: {str(item)[:200]}"
        else:
            items_summary = "\nNo items were retrieved."
        
        style_summary = ""
        if style_dna:
            style_summary = f"\nUser's Style DNA: {style_dna}"
        if user_profile:
            style_summary += f"\nUser Profile: {user_profile}"
        
        filter_summary = ", ".join(f"{k}={v}" for k, v in extracted_filters.items()) if extracted_filters else "none"
        
        analysis_prompt = f"""
User's Request: {message}

Extracted Filters: {filter_summary}
{style_summary}

Retrieved Items:{items_summary}

Current Iteration: {iteration + 1} of {max_iterations}

Please analyze these results and decide whether to APPROVE, REFINE, or CLARIFY.
Consider that this is iteration {iteration + 1} - be more lenient with approval as iterations increase.
"""
        
        # Get structured analysis
        analysis = await llm_service.structured_chat(
            system_prompt=ANALYZER_PROMPT,
            user_message=analysis_prompt,
            output_schema=AnalysisDecision,
        )
        
        # Log to Langfuse
        if trace_id:
            tracing_service.log_llm_call(
                trace_id=trace_id,
                agent_name="clothing_analyzer",
                input_text=f"Analyzing {len(retrieved_items)} items",
                output_text=f"decision={analysis.decision}, confidence={analysis.confidence}",
                metadata={
                    "decision": analysis.decision,
                    "confidence": analysis.confidence,
                    "reasoning": analysis.reasoning,
                },
            )
        
        logger.info(f"Analyzer decision: {analysis.decision} (confidence: {analysis.confidence:.2f})")
        
        # Build result
        result = {
            "analysis_result": {
                "decision": analysis.decision,
                "approved": analysis.decision in ["approve", "approve_with_feedback"],
                "confidence": analysis.confidence,
                "notes": [analysis.reasoning],
            },
            "iteration": iteration + 1,
            "needs_clarification": analysis.decision == "clarify",
        }
        
        # Handle APPROVE_WITH_FEEDBACK - save item feedback before approving
        if analysis.decision == "approve_with_feedback" and analysis.item_feedback:
            user_id = state.get("user_id", "")
            session_id = state.get("session_id", "")
            
            # Save feedback for each item
            feedback_list = []
            for item_feedback in analysis.item_feedback:
                try:
                    # Get MCP tools to access wardrobe feedback save function
                    tools_dict = await get_mcp_tools()
                    
                    for tool in tools_dict:
                        if hasattr(tool, 'name') and tool.name == 'save_item_feedback':
                            # Save feedback
                            success = await tool.ainvoke({
                                "user_id": user_id,
                                "item_id": item_feedback.item_id,
                                "feedback": item_feedback.feedback,
                                "reason": item_feedback.reason,
                                "reason_text": item_feedback.reason_text,
                                "session_id": session_id,
                            })
                            
                            if success:
                                feedback_list.append({
                                    "item_id": item_feedback.item_id,
                                    "feedback": item_feedback.feedback,
                                    "reason": item_feedback.reason,
                                })
                                logger.info(f"Saved feedback for item {item_feedback.item_id}: {item_feedback.feedback}")
                            break
                except Exception as e:
                    logger.error(f"Error saving item feedback: {e}")
            
            # Store feedback in state for reference
            if feedback_list:
                result["item_feedback_pending"] = feedback_list
                result["analysis_result"]["notes"].append(f"Marked {len(feedback_list)} items as disliked")
        
        # Add structured filter updates if refining
        if analysis.decision == "refine" and analysis.filter_updates:
            # Convert Pydantic model to dict, excluding None values
            filter_updates = {k: v for k, v in analysis.filter_updates.model_dump().items() if v is not None}
            if filter_updates:
                # Merge with existing filters
                updated_filters = {**extracted_filters, **filter_updates}
                result["extracted_filters"] = updated_filters
                result["analysis_result"]["filter_updates"] = filter_updates
                logger.info(f"Refinement filter updates: {filter_updates}")
        
        # Add clarification question if needed
        if analysis.decision == "clarify" and analysis.clarification_question:
            result["clarification_question"] = analysis.clarification_question
        
        return result
        
    except Exception as e:
        logger.error(f"Clothing analyzer failed: {e}")
        
        # Log error
        if trace_id:
            tracing_service.log_error(trace_id=trace_id, error=e)
        
        # Fallback to approval
        return {
            "analysis_result": {
                "decision": "approve",
                "approved": True,
                "confidence": 0.5,
                "notes": ["Analyzer error, proceeding with available items"],
            },
            "iteration": iteration + 1,
            "needs_clarification": False,
            "metadata": {**state.get("metadata", {}), "analyzer_error": str(e)},
        }
