"""Main LangGraph workflow for the conversational agent."""
from typing import Dict, Any, Literal, Optional, AsyncGenerator
from langgraph.graph import StateGraph, END
from pydantic import BaseModel, Field
from datetime import datetime

from app.workflows.state import (
    ConversationState, 
    create_initial_state,
    create_clarification_context,
    merge_clarification_into_filters,
    StreamEvent,
)
from app.workflows.nodes.intent_classifier import intent_classifier_node
from app.workflows.nodes.query_analyzer import query_analyzer_node
from app.workflows.nodes.response_formatter import response_formatter_node
from app.agents.conversation_agent import conversation_agent_node
from app.agents.clothing_recommender_agent import clothing_recommender_node
from app.agents.clothing_analyzer_agent import clothing_analyzer_node
from app.core.config import get_settings
from app.core.logger import get_logger

logger = get_logger(__name__)


# =============================================================================
# Pydantic Schemas for LLM-based Extraction
# =============================================================================

class ClarificationExtraction(BaseModel):
    """Extracted filter values from user's clarification response."""
    occasion: Optional[str] = Field(None, description="Event type: interview, business, casual, party, wedding, date, formal")
    budget: Optional[str] = Field(None, description="Budget level: budget, mid-range, luxury")
    max_price: Optional[int] = Field(None, description="Maximum price in dollars if mentioned")
    color: Optional[str] = Field(None, description="Color preference mentioned")
    style: Optional[str] = Field(None, description="Style preference: classic, modern, minimalist, bold, elegant, casual, sporty")
    size: Optional[str] = Field(None, description="Size if mentioned: XS, S, M, L, XL, XXL")
    category: Optional[str] = Field(None, description="Clothing category: TOP, BOTTOM, SHOE, ACCESSORY")
    sub_category: Optional[str] = Field(None, description="Specific type like Jacket, Dress, Sneakers, etc.")
    season: Optional[str] = Field(None, description="Season: spring, summer, fall, winter")
    additional_context: Optional[str] = Field(None, description="Any other relevant details from the response")


# =============================================================================
# Routing Functions
# =============================================================================

def route_after_input_guardrails(state: ConversationState) -> Literal["safe", "unsafe"]:
    """Route after input guardrails check."""
    is_safe = state.get("metadata", {}).get("input_safe", True)
    logger.debug(f"Input guardrails result: {'safe' if is_safe else 'unsafe'}")
    return "safe" if is_safe else "unsafe"


def route_after_intent(state: ConversationState) -> Literal["general", "clothing"]:
    """Route based on intent classification."""
    intent = state.get("intent", "general")
    logger.debug(f"Routing based on intent: {intent}")
    return intent


def route_after_analysis(state: ConversationState) -> Literal["approve", "refine", "clarify", "error"]:
    """Route based on analyzer decision."""
    iteration = state.get("iteration", 0)
    max_iterations = get_settings().MAX_REFINEMENT_ITERATIONS
    
    analysis = state.get("analysis_result")
    if not analysis:
        logger.warning("No analysis result, defaulting to approve")
        return "approve"
    
    decision = analysis.get("decision", "approve")
    
    # If analyzer approved, respect that decision
    if decision == "approve":
        logger.debug(f"Analyzer approved (iteration {iteration})")
        return "approve"
    
    # For non-approve decisions, check if we've hit max iterations
    if iteration >= max_iterations:
        logger.warning(f"Max iterations ({max_iterations}) reached, routing to approve anyway")
        return "approve"
    
    logger.debug(f"Analyzer decision: {decision} (iteration {iteration})")
    return decision


def route_after_output_guardrails(state: ConversationState) -> Literal["safe", "unsafe"]:
    """Route after output guardrails check."""
    is_safe = state.get("metadata", {}).get("output_safe", True)
    logger.debug(f"Output guardrails result: {'safe' if is_safe else 'unsafe'}")
    return "safe" if is_safe else "unsafe"


def route_after_clarification_check(state: ConversationState) -> Literal["resume", "fresh"]:
    """Route based on whether this is a clarification response."""
    is_clarification = state.get("is_clarification_response", False)
    has_pending = state.get("pending_clarification_context") is not None
    
    if is_clarification and has_pending:
        logger.info("Routing to resume from clarification")
        return "resume"
    else:
        logger.debug("Routing to fresh workflow")
        return "fresh"


# =============================================================================
# Placeholder Node Functions (to be implemented in Issue 3)
# =============================================================================

async def input_guardrails_node(state: ConversationState) -> Dict[str, Any]:
    """
    Input guardrails node - validates and sanitizes user input.
    
    Uses configured guardrail providers to check user input for safety issues.
    """
    from app.guardrails import get_safety_guardrails
    
    message = state.get("message", "")
    logger.debug(f"Running input guardrails on message (length: {len(message)})")
    
    # Get safety guardrails instance
    guardrails = get_safety_guardrails()
    
    # Check input
    result = guardrails.check_input(message)
    
    # Update metadata
    metadata = state.get("metadata", {})
    metadata["input_safe"] = result.is_safe
    metadata["input_guardrail_provider"] = result.provider
    metadata["input_risk_score"] = result.risk_score
    if result.warnings:
        metadata["input_guardrail_warnings"] = result.warnings
    
    # Log result
    if result.is_safe:
        logger.info(f"Input guardrails passed (provider: {result.provider}, risk: {result.risk_score:.2f})")
        if result.warnings:
            logger.warning(f"Input guardrail warnings: {result.warnings}")
    else:
        logger.warning(f"Input guardrails blocked (provider: {result.provider}, risk: {result.risk_score:.2f}, warnings: {result.warnings})")
    
    # Return updated state with sanitized message if it was modified
    return {
        "message": result.sanitized_content if result.sanitized_content != message else message,
        "metadata": metadata,
    }


# intent_classifier_node is imported from app.workflows.nodes.intent_classifier
# query_analyzer_node is imported from app.workflows.nodes.query_analyzer
# response_formatter_node is imported from app.workflows.nodes.response_formatter
# conversation_agent_node is imported from app.agents.conversation_agent
# clothing_recommender_node is imported from app.agents.clothing_recommender_agent
# clothing_analyzer_node is imported from app.agents.clothing_analyzer_agent


# =============================================================================
# Clarification Handling Nodes
# =============================================================================

async def check_clarification_node(state: ConversationState) -> Dict[str, Any]:
    """
    Check if this is a clarification response and route accordingly.
    
    This node is the entry point that determines if we should:
    1. Resume from a pending clarification
    2. Start a fresh workflow
    """
    is_clarification = state.get("is_clarification_response", False)
    pending_context = state.get("pending_clarification_context")
    
    if is_clarification and pending_context:
        logger.info("Detected clarification response, will merge context")
        return {
            "metadata": {
                **state.get("metadata", {}),
                "is_clarification_flow": True,
                "original_query": pending_context.get("original_message", ""),
            }
        }
    else:
        logger.debug("Fresh workflow, no pending clarification")
        return {
            "metadata": {
                **state.get("metadata", {}),
                "is_clarification_flow": False,
            }
        }


async def merge_clarification_context_node(state: ConversationState) -> Dict[str, Any]:
    """
    Merge the user's clarification response into the existing workflow context.
    
    This node:
    1. Takes the user's clarification response
    2. Uses LLM to extract structured filters (with keyword fallback)
    3. Merges with previously extracted filters
    4. Prepares the state to resume recommendation
    """
    pending_context = state.get("pending_clarification_context", {})
    clarification_response = state.get("message", "")
    clarification_question = pending_context.get("clarification_question", "")
    existing_filters = pending_context.get("extracted_filters", {})
    
    logger.info(f"Merging clarification response: '{clarification_response[:50]}...'")
    
    updated_filters = existing_filters.copy() if existing_filters else {}
    llm_extraction_used = False
    
    # Try LLM-based extraction first
    try:
        from app.services.llm_service import get_llm_service
        llm_service = get_llm_service()
        
        extraction_prompt = f"""Extract clothing preferences from the user's response to a clarification question.

Question asked: "{clarification_question}"
User's response: "{clarification_response}"

Extract any mentioned:
- Occasion/event type (interview, business, casual, party, wedding, date, formal)
- Budget (budget, mid-range, luxury) or specific price
- Color preferences
- Style preferences (classic, modern, minimalist, bold, elegant, casual, sporty)
- Size
- Clothing category (TOP, BOTTOM, SHOE, ACCESSORY)
- Specific clothing type (Jacket, Dress, Jeans, Sneakers, etc.)
- Season

Only extract values that are clearly stated or strongly implied."""

        extraction = await llm_service.structured_chat(
            system_prompt="You are a fashion assistant that extracts clothing preferences from user responses.",
            user_message=extraction_prompt,
            output_schema=ClarificationExtraction,
        )
        
        if extraction:
            llm_extraction_used = True
            # Merge LLM extraction into filters
            if extraction.occasion:
                updated_filters["occasion"] = extraction.occasion
            if extraction.budget:
                updated_filters["price_range"] = extraction.budget
            if extraction.max_price:
                updated_filters["max_price"] = extraction.max_price
            if extraction.color:
                updated_filters["color"] = extraction.color
            if extraction.style:
                updated_filters["style"] = extraction.style
            if extraction.size:
                updated_filters["size"] = extraction.size
            if extraction.category:
                updated_filters["category"] = extraction.category
            if extraction.sub_category:
                updated_filters["sub_category"] = extraction.sub_category
            if extraction.season:
                updated_filters["season"] = extraction.season
            if extraction.additional_context:
                updated_filters["additional_context"] = extraction.additional_context
            
            logger.info(f"LLM extracted filters: {extraction.model_dump(exclude_none=True)}")
    
    except Exception as e:
        logger.warning(f"LLM-based clarification extraction failed, using keyword fallback: {e}")
        # Fall back to keyword-based extraction
        updated_filters = merge_clarification_into_filters(
            existing_filters,
            clarification_response,
            clarification_question,
        )
    
    logger.info(f"Updated filters after clarification (LLM={llm_extraction_used}): {updated_filters}")
    
    # Restore and update state from pending context
    return {
        "intent": "clothing",  # Clarification is always in clothing context
        "search_scope": pending_context.get("search_scope", "commerce"),
        "extracted_filters": updated_filters,
        "retrieved_items": [],  # Clear items to search with new context
        "style_dna": pending_context.get("style_dna"),
        "user_profile": pending_context.get("user_profile"),
        "iteration": pending_context.get("iteration", 0),
        "needs_clarification": False,
        "clarification_question": None,
        "pending_clarification_context": None,  # Clear pending context
        "metadata": {
            **state.get("metadata", {}),
            "clarification_merged": True,
            "merged_filters": updated_filters,
            "llm_extraction_used": llm_extraction_used,
        },
    }


async def save_clarification_context_node(state: ConversationState) -> Dict[str, Any]:
    """
    Save workflow context when clarification is needed.
    
    This node creates a checkpoint that will be used to resume
    the workflow when the user provides their clarification.
    """
    logger.info("Saving clarification context for resumption")
    
    # Create the context to save
    context = create_clarification_context(state)
    
    return {
        "workflow_status": "awaiting_clarification",
        "pending_clarification_context": context,
        "metadata": {
            **state.get("metadata", {}),
            "workflow_paused_for_clarification": True,
        },
    }


async def output_guardrails_node(state: ConversationState) -> Dict[str, Any]:
    """
    Output guardrails node - validates LLM responses.
    
    Note: Currently not used in the workflow per requirements, but implementation
    is available for future use.
    """
    from app.guardrails import get_safety_guardrails
    
    # Get the response to check (could be from conversation_agent or clothing_analyzer)
    response = state.get("final_response", "")
    prompt = state.get("message", "")
    
    logger.debug(f"Running output guardrails on response (length: {len(response)})")
    
    # Get safety guardrails instance
    guardrails = get_safety_guardrails()
    
    # Check output
    result = guardrails.check_output(prompt, response)
    
    # Update metadata
    metadata = state.get("metadata", {})
    metadata["output_safe"] = result.is_safe
    metadata["output_guardrail_provider"] = result.provider
    metadata["output_risk_score"] = result.risk_score
    if result.warnings:
        metadata["output_guardrail_warnings"] = result.warnings
    
    # Log result
    if result.is_safe:
        logger.info(f"Output guardrails passed (provider: {result.provider}, risk: {result.risk_score:.2f})")
        if result.warnings:
            logger.warning(f"Output guardrail warnings: {result.warnings}")
    else:
        logger.warning(f"Output guardrails blocked (provider: {result.provider}, risk: {result.risk_score:.2f}, warnings: {result.warnings})")
    
    # Note: Per requirements, we don't actually block output even if guardrails fail
    # The implementation is here for future use, but we always mark as safe for now
    metadata["output_safe"] = True  # Override to always allow output
    
    # Return updated state with filtered response if it was modified
    return {
        "final_response": result.sanitized_content if result.sanitized_content != response else response,
        "metadata": metadata,
    }


async def error_response_node(state: ConversationState) -> Dict[str, Any]:
    """
    Error response node - handles errors gracefully.
    """
    logger.debug("Error response node")
    
    # Check what type of error occurred
    metadata = state.get("metadata", {})
    error_info = metadata.get("error")
    error_type = metadata.get("error_type", "unknown")
    
    # Generate specific error messages based on error type
    if not metadata.get("input_safe", True):
        response = "I'm sorry, but I can't process that request. Please try rephrasing your question."
    elif not metadata.get("output_safe", True):
        response = "I apologize, but I encountered an issue generating a response. Please try again."
    elif state.get("iteration", 0) >= get_settings().MAX_REFINEMENT_ITERATIONS:
        response = "I'm having trouble finding exactly what you're looking for. " \
                   "Could you please provide more details about what you need?"
    elif error_info:
        # Use error information from metadata if available
        error_str = str(error_info) if error_info else "unknown error"
        if "timeout" in error_str.lower() or "time" in error_str.lower():
            response = "I apologize, but the request took too long to process. Please try again with a simpler question."
        elif "network" in error_str.lower() or "connection" in error_str.lower():
            response = "I apologize, but I'm having trouble connecting to my services. Please try again in a moment."
        elif "rate limit" in error_str.lower() or "quota" in error_str.lower():
            response = "I apologize, but I'm currently experiencing high demand. Please try again in a moment."
        else:
            response = "I apologize, but I encountered an issue processing your request. Please try again or rephrase your question."
    else:
        response = "I'm sorry, something went wrong. Please try again."
    
    # Always set workflow_status to completed so message gets saved
    return {
        "final_response": response,
        "workflow_status": "completed",
        "metadata": {
            **metadata,
            "error_handled": True,
            "error_type": error_type,
        },
    }


# =============================================================================
# Workflow Creation
# =============================================================================

def create_workflow() -> StateGraph:
    """
    Create the main conversational agent workflow.
    
    The workflow supports multi-turn conversations with clarification handling:
    
    1. Entry: check_clarification - determines if resuming from clarification
    2. If resuming: merge_clarification -> clothing_recommender
    3. If fresh: input_guardrails -> intent_classifier -> ...
    4. If clarify needed: save_clarification -> response_formatter -> END
    
    Returns:
        Compiled LangGraph StateGraph
    """
    logger.info("Creating conversational agent workflow")
    
    # Create the state graph
    workflow = StateGraph(ConversationState)
    
    # Add all nodes
    # Entry and clarification handling
    workflow.add_node("check_clarification", check_clarification_node)
    workflow.add_node("merge_clarification", merge_clarification_context_node)
    workflow.add_node("save_clarification", save_clarification_context_node)
    
    # Core workflow nodes
    workflow.add_node("input_guardrails", input_guardrails_node)
    workflow.add_node("intent_classifier", intent_classifier_node)
    workflow.add_node("query_analyzer", query_analyzer_node)
    workflow.add_node("conversation_agent", conversation_agent_node)
    workflow.add_node("clothing_recommender", clothing_recommender_node)
    workflow.add_node("clothing_analyzer", clothing_analyzer_node)
    workflow.add_node("output_guardrails", output_guardrails_node)
    workflow.add_node("response_formatter", response_formatter_node)
    workflow.add_node("error_response", error_response_node)
    
    # Set entry point - always check for pending clarification first
    workflow.set_entry_point("check_clarification")
    
    # Route after clarification check
    workflow.add_conditional_edges(
        "check_clarification",
        route_after_clarification_check,
        {
            "resume": "merge_clarification",  # Resume from clarification
            "fresh": "input_guardrails",      # Start fresh workflow
        }
    )
    
    # Merge clarification leads directly to recommender (skip intent/query analysis)
    workflow.add_edge("merge_clarification", "clothing_recommender")
    
    # Add conditional edges from input guardrails
    workflow.add_conditional_edges(
        "input_guardrails",
        route_after_input_guardrails,
        {
            "safe": "intent_classifier",
            "unsafe": "error_response",
        }
    )
    
    # Add conditional edges from intent classifier
    workflow.add_conditional_edges(
        "intent_classifier",
        route_after_intent,
        {
            "general": "conversation_agent",
            "clothing": "query_analyzer",
        }
    )
    
    # Query analyzer leads to clothing recommender
    workflow.add_edge("query_analyzer", "clothing_recommender")
    
    # Clothing recommender leads to clothing analyzer
    workflow.add_edge("clothing_recommender", "clothing_analyzer")
    
    # Add conditional edges from clothing analyzer
    workflow.add_conditional_edges(
        "clothing_analyzer",
        route_after_analysis,
        {
            "approve": "output_guardrails",
            "refine": "clothing_recommender",  # Loop back for refinement
            "clarify": "save_clarification",   # Save context before sending question
            "error": "error_response",
        }
    )
    
    # Save clarification context then send the question to user
    workflow.add_edge("save_clarification", "output_guardrails")
    
    # Conversation agent leads to output guardrails
    workflow.add_edge("conversation_agent", "output_guardrails")
    
    # Add conditional edges from output guardrails
    workflow.add_conditional_edges(
        "output_guardrails",
        route_after_output_guardrails,
        {
            "safe": "response_formatter",
            "unsafe": "error_response",
        }
    )
    
    # Response formatter and error response lead to END
    workflow.add_edge("response_formatter", END)
    workflow.add_edge("error_response", END)
    
    logger.info("Workflow created successfully")
    
    return workflow.compile()


# Global compiled workflow instance
_workflow: Optional[StateGraph] = None


def get_workflow() -> StateGraph:
    """
    Get the compiled workflow instance.
    
    Returns:
        Compiled LangGraph workflow
    """
    global _workflow
    
    if _workflow is None:
        _workflow = create_workflow()
    
    return _workflow


async def run_workflow(
    user_id: str,
    session_id: str,
    message: str,
    conversation_history: Optional[list] = None,
    pending_context: Optional[Dict[str, Any]] = None,
) -> ConversationState:
    """
    Run the workflow with the given input.
    
    Supports multi-turn conversations with clarification:
    - If pending_context is provided, this is treated as a response to a clarification
    - The workflow will resume from where it left off instead of starting fresh
    
    Args:
        user_id: The user's identifier
        session_id: The session identifier
        message: The user's message
        conversation_history: Previous conversation messages
        pending_context: Saved context from a previous clarification request
        
    Returns:
        Final workflow state (check workflow_status for "awaiting_clarification")
    """
    from app.services.tracing.langfuse_service import get_tracing_service
    
    workflow = get_workflow()
    tracing_service = get_tracing_service()
    
    # Determine if this is a clarification response
    is_clarification = pending_context is not None
    
    # Start Langfuse trace
    trace_id = tracing_service.start_trace(
        user_id=user_id,
        session_id=session_id,
        name="conversation_workflow",
        metadata={
            "message_preview": message[:100],
            "is_clarification_response": is_clarification,
        },
    )
    
    initial_state = create_initial_state(
        user_id=user_id,
        session_id=session_id,
        message=message,
        conversation_history=conversation_history,
        pending_context=pending_context,
    )
    
    # Add trace_id to state
    initial_state["langfuse_trace_id"] = trace_id
    
    log_msg = f"Running workflow for user {user_id}, session {session_id}, trace {trace_id}"
    if is_clarification:
        log_msg += " (clarification response)"
    logger.info(log_msg)
    
    try:
        # Run the workflow
        final_state = await workflow.ainvoke(initial_state)
        
        # Check if workflow is awaiting clarification
        workflow_status = final_state.get("workflow_status", "completed")
        needs_clarification = final_state.get("needs_clarification", False)
        
        # End trace with appropriate metadata
        trace_metadata = {
            "intent": final_state.get("intent"),
            "items_retrieved": len(final_state.get("retrieved_items") or []),
            "workflow_status": workflow_status,
            "needs_clarification": needs_clarification,
        }
        
        if needs_clarification:
            trace_metadata["clarification_question"] = final_state.get("clarification_question", "")
        
        tracing_service.end_trace(
            trace_id=trace_id,
            output=final_state.get("final_response", "")[:500],
            metadata=trace_metadata,
        )
        
        response_len = len(final_state.get('final_response', ''))
        if workflow_status == "awaiting_clarification":
            logger.info(f"Workflow paused for clarification, question sent ({response_len} chars)")
        else:
            logger.info(f"Workflow completed with response length: {response_len}")
        
        return final_state
        
    except Exception as e:
        # Log error details
        logger.error(f"Workflow error: {e}", exc_info=True)
        tracing_service.log_error(trace_id=trace_id, error=e)
        
        # Generate user-friendly error response
        error_message = str(e).lower()
        if "timeout" in error_message or "time" in error_message:
            user_response = "I apologize, but the request took too long to process. Please try again with a simpler question."
        elif "network" in error_message or "connection" in error_message:
            user_response = "I apologize, but I'm having trouble connecting to my services. Please try again in a moment."
        elif "rate limit" in error_message or "quota" in error_message:
            user_response = "I apologize, but I'm currently experiencing high demand. Please try again in a moment."
        else:
            user_response = "I apologize, but I encountered an issue processing your request. Please try again or rephrase your question."
        
        # Return error state instead of raising
        error_state = {
            "final_response": user_response,
            "workflow_status": "completed",
            "metadata": {
                "error": str(e),
                "error_type": type(e).__name__,
                "error_handled": True,
            },
        }
        
        tracing_service.end_trace(
            trace_id=trace_id,
            output=user_response[:500],
            metadata={"error": str(e), "error_type": type(e).__name__},
        )
        tracing_service.flush()
        
        return error_state
    finally:
        # Ensure traces are flushed
        tracing_service.flush()


# Human-readable node name mapping
NODE_DISPLAY_NAMES = {
    "check_clarification": "Checking conversation context",
    "merge_clarification": "Processing your clarification",
    "input_guardrails": "Validating input",
    "intent_classifier": "Understanding your request",
    "query_analyzer": "Analyzing what you're looking for",
    "conversation_agent": "Preparing response",
    "clothing_recommender": "Searching for items",
    "clothing_analyzer": "Evaluating recommendations",
    "save_clarification": "Preparing follow-up question",
    "output_guardrails": "Validating response",
    "response_formatter": "Formatting your response",
    "error_response": "Handling error",
}


async def run_workflow_streaming(
    user_id: str,
    session_id: str,
    message: str,
    conversation_history: Optional[list] = None,
    pending_context: Optional[Dict[str, Any]] = None,
) -> AsyncGenerator[StreamEvent, None]:
    """
    Run the workflow with streaming intermediate results.
    
    Yields StreamEvent objects as each node executes, providing real-time
    progress updates to the client.
    
    Args:
        user_id: The user's identifier
        session_id: The session identifier
        message: The user's message
        conversation_history: Previous conversation messages
        pending_context: Saved context from a previous clarification request
        
    Yields:
        StreamEvent objects with progress updates
    """
    from app.services.tracing.langfuse_service import get_tracing_service
    
    workflow = get_workflow()
    tracing_service = get_tracing_service()
    
    # Determine if this is a clarification response
    is_clarification = pending_context is not None
    
    # Start Langfuse trace
    trace_id = tracing_service.start_trace(
        user_id=user_id,
        session_id=session_id,
        name="conversation_workflow_streaming",
        metadata={
            "message_preview": message[:100],
            "is_clarification_response": is_clarification,
            "streaming": True,
        },
    )
    
    initial_state = create_initial_state(
        user_id=user_id,
        session_id=session_id,
        message=message,
        conversation_history=conversation_history,
        pending_context=pending_context,
    )
    
    # Add trace_id to state
    initial_state["langfuse_trace_id"] = trace_id
    
    log_msg = f"Running streaming workflow for user {user_id}, session {session_id}, trace {trace_id}"
    if is_clarification:
        log_msg += " (clarification response)"
    logger.info(log_msg)
    
    # Yield initial metadata event
    yield StreamEvent(
        type="metadata",
        content={
            "session_id": session_id,
            "user_id": user_id,
            "trace_id": trace_id,
        },
        timestamp=datetime.utcnow().isoformat(),
    )
    
    final_state = None
    current_node = None
    
    try:
        # Use LangGraph's native streaming with astream_events
        async for event in workflow.astream_events(initial_state, version="v2"):
            event_type = event.get("event")
            event_name = event.get("name", "")
            
            # Handle node start events
            if event_type == "on_chain_start":
                # Filter for our workflow nodes (not internal LangGraph chains)
                if event_name in NODE_DISPLAY_NAMES:
                    current_node = event_name
                    display_name = NODE_DISPLAY_NAMES.get(event_name, event_name)
                    
                    yield StreamEvent(
                        type="node_start",
                        content={"node": event_name, "display_name": display_name},
                        timestamp=datetime.utcnow().isoformat(),
                    )
                    
                    # Yield human-readable status
                    yield StreamEvent(
                        type="status",
                        content={"message": f"{display_name}..."},
                        timestamp=datetime.utcnow().isoformat(),
                    )
            
            # Handle node end events
            elif event_type == "on_chain_end":
                if event_name in NODE_DISPLAY_NAMES:
                    # Extract output data for specific nodes
                    output = event.get("data", {}).get("output", {})
                    
                    # Emit specific events based on which node completed
                    if event_name == "intent_classifier" and output:
                        intent = output.get("intent")
                        if intent:
                            yield StreamEvent(
                                type="intent",
                                content={"intent": intent},
                                timestamp=datetime.utcnow().isoformat(),
                            )
                    
                    elif event_name == "query_analyzer" and output:
                        filters = output.get("extracted_filters")
                        scope = output.get("search_scope")
                        if filters or scope:
                            yield StreamEvent(
                                type="filters",
                                content={"filters": filters, "scope": scope},
                                timestamp=datetime.utcnow().isoformat(),
                            )
                    
                    elif event_name == "clothing_recommender" and output:
                        items = output.get("retrieved_items", [])
                        sources = output.get("search_sources_used", [])
                        if items:
                            yield StreamEvent(
                                type="items_found",
                                content={
                                    "count": len(items),
                                    "sources": sources,
                                },
                                timestamp=datetime.utcnow().isoformat(),
                            )
                    
                    elif event_name == "clothing_analyzer" and output:
                        analysis = output.get("analysis_result")
                        if analysis:
                            yield StreamEvent(
                                type="analysis",
                                content={
                                    "decision": analysis.get("decision"),
                                    "confidence": analysis.get("confidence"),
                                },
                                timestamp=datetime.utcnow().isoformat(),
                            )
                    
                    yield StreamEvent(
                        type="node_end",
                        content={"node": event_name},
                        timestamp=datetime.utcnow().isoformat(),
                    )
            
            # Handle tool calls from agents
            elif event_type == "on_tool_start":
                tool_name = event_name
                tool_input = event.get("data", {}).get("input", {})
                
                yield StreamEvent(
                    type="tool_call",
                    content={
                        "tool": tool_name,
                        "input": str(tool_input)[:200],  # Truncate for safety
                    },
                    timestamp=datetime.utcnow().isoformat(),
                )
            
            # Handle LLM streaming tokens (for response_formatter)
            elif event_type == "on_chat_model_stream":
                chunk = event.get("data", {}).get("chunk")
                if chunk and hasattr(chunk, "content") and chunk.content:
                    # Only stream content tokens during response formatting
                    if current_node == "response_formatter":
                        yield StreamEvent(
                            type="chunk",
                            content={"content": chunk.content},
                            timestamp=datetime.utcnow().isoformat(),
                        )
            
            # Capture final state from last chain end
            # Accumulate state across all events to ensure we capture the final state
            if event_type == "on_chain_end" and event.get("data", {}).get("output"):
                output = event.get("data", {}).get("output")
                # Check if this looks like a final state (has final_response)
                if isinstance(output, dict):
                    # Merge with existing final_state to accumulate all state
                    if final_state is None:
                        final_state = {}
                    # Update final_state with any new fields from output
                    for key, value in output.items():
                        if value is not None:  # Only update non-None values
                            final_state[key] = value
                    # If this output has final_response, it's likely the final node
                    if "final_response" in output:
                        logger.debug(f"Captured final state with response from node: {event_name}")
        
        # If we didn't capture final state, run workflow synchronously to get it
        if final_state is None or not final_state.get("final_response"):
            logger.warning("Final state not captured from streaming or missing final_response, running sync fallback")
            try:
                fallback_state = await workflow.ainvoke(initial_state)
                # Merge fallback state with any state we did capture
                if final_state:
                    final_state = {**final_state, **fallback_state}
                else:
                    final_state = fallback_state
            except Exception as fallback_error:
                logger.error(f"Fallback workflow invocation also failed: {fallback_error}")
                # Generate minimal error state
                final_state = {
                    "final_response": "I apologize, but I encountered an issue processing your request. Please try again.",
                    "workflow_status": "completed",
                    "intent": None,
                    "retrieved_items": [],
                }
        
        # Ensure final_state has final_response
        if not final_state or not final_state.get("final_response"):
            logger.warning("Final state missing final_response, generating fallback")
            final_state = final_state or {}
            final_state["final_response"] = "I apologize, but I encountered an issue generating a response. Please try again."
            final_state["workflow_status"] = "completed"
        
        # Check workflow status
        workflow_status = final_state.get("workflow_status", "completed")
        needs_clarification = final_state.get("needs_clarification", False)
        final_response = final_state.get("final_response", "")
        
        # End trace
        trace_metadata = {
            "intent": final_state.get("intent"),
            "items_retrieved": len(final_state.get("retrieved_items") or []),
            "workflow_status": workflow_status,
            "needs_clarification": needs_clarification,
            "streaming": True,
        }
        
        if needs_clarification:
            trace_metadata["clarification_question"] = final_state.get("clarification_question", "")
        
        tracing_service.end_trace(
            trace_id=trace_id,
            output=final_response[:500] if final_response else "[empty response]",
            metadata=trace_metadata,
        )
        
        # Yield final done event - always yield even if response is empty
        yield StreamEvent(
            type="done",
            content={
                "response": final_response,
                "intent": final_state.get("intent"),
                "items": final_state.get("retrieved_items", []),
                "workflow_status": workflow_status,
                "needs_clarification": needs_clarification,
                "clarification_question": final_state.get("clarification_question"),
                "session_id": session_id,
            },
            timestamp=datetime.utcnow().isoformat(),
        )
        
        response_len = len(final_state.get('final_response', ''))
        if workflow_status == "awaiting_clarification":
            logger.info(f"Streaming workflow paused for clarification ({response_len} chars)")
        else:
            logger.info(f"Streaming workflow completed with response length: {response_len}")
        
    except Exception as e:
        logger.error(f"Streaming workflow error: {e}", exc_info=True)
        tracing_service.log_error(trace_id=trace_id, error=e)
        
        # Generate user-friendly error response
        error_message = str(e).lower()
        if "timeout" in error_message or "time" in error_message:
            user_response = "I apologize, but the request took too long to process. Please try again with a simpler question."
        elif "network" in error_message or "connection" in error_message:
            user_response = "I apologize, but I'm having trouble connecting to my services. Please try again in a moment."
        elif "rate limit" in error_message or "quota" in error_message:
            user_response = "I apologize, but I'm currently experiencing high demand. Please try again in a moment."
        else:
            user_response = "I apologize, but I encountered an issue processing your request. Please try again or rephrase your question."
        
        # Always yield done event even on errors (so response gets saved)
        yield StreamEvent(
            type="done",
            content={
                "response": user_response,
                "intent": None,
                "items": [],
                "workflow_status": "completed",
                "needs_clarification": False,
                "clarification_question": None,
                "session_id": session_id,
                "error": True,
            },
            timestamp=datetime.utcnow().isoformat(),
        )
        
        # Also yield error event for UI
        yield StreamEvent(
            type="error",
            content={"message": user_response},
            timestamp=datetime.utcnow().isoformat(),
        )
        
        tracing_service.end_trace(
            trace_id=trace_id,
            output=user_response[:500],
            metadata={"error": str(e), "error_type": type(e).__name__},
        )
    finally:
        tracing_service.flush()


def is_awaiting_clarification(state: ConversationState) -> bool:
    """Check if the workflow is awaiting a clarification response."""
    return state.get("workflow_status") == "awaiting_clarification"


def get_clarification_context(state: ConversationState) -> Optional[Dict[str, Any]]:
    """Get the pending clarification context from state."""
    if is_awaiting_clarification(state):
        return state.get("pending_clarification_context")
    return None
