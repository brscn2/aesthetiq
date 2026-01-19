"""Main LangGraph workflow for the conversational agent."""
from typing import Dict, Any, Literal, Optional
from langgraph.graph import StateGraph, END

from app.workflows.state import (
    ConversationState, 
    create_initial_state,
    create_clarification_context,
    merge_clarification_into_filters,
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
    
    TODO: Implement in Issue 4 (Safety Guardrails)
    """
    logger.debug("Input guardrails node (placeholder)")
    
    # Placeholder: mark as safe
    metadata = state.get("metadata", {})
    metadata["input_safe"] = True
    
    return {"metadata": metadata}


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
    2. Merges it with the previously extracted filters
    3. Prepares the state to resume recommendation
    """
    pending_context = state.get("pending_clarification_context", {})
    clarification_response = state.get("message", "")
    clarification_question = pending_context.get("clarification_question", "")
    existing_filters = pending_context.get("extracted_filters", {})
    
    logger.info(f"Merging clarification response: '{clarification_response[:50]}...'")
    
    # Merge the clarification into existing filters
    updated_filters = merge_clarification_into_filters(
        existing_filters,
        clarification_response,
        clarification_question,
    )
    
    logger.info(f"Updated filters after clarification: {updated_filters}")
    
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
    
    TODO: Implement in Issue 4 (Safety Guardrails)
    """
    logger.debug("Output guardrails node (placeholder)")
    
    # Placeholder: mark as safe
    metadata = state.get("metadata", {})
    metadata["output_safe"] = True
    
    return {"metadata": metadata}


async def error_response_node(state: ConversationState) -> Dict[str, Any]:
    """
    Error response node - handles errors gracefully.
    """
    logger.debug("Error response node")
    
    # Check what type of error occurred
    metadata = state.get("metadata", {})
    
    if not metadata.get("input_safe", True):
        response = "I'm sorry, but I can't process that request. Please try rephrasing your question."
    elif not metadata.get("output_safe", True):
        response = "I apologize, but I encountered an issue generating a response. Please try again."
    elif state.get("iteration", 0) >= get_settings().MAX_REFINEMENT_ITERATIONS:
        response = "I'm having trouble finding exactly what you're looking for. " \
                   "Could you please provide more details about what you need?"
    else:
        response = "I'm sorry, something went wrong. Please try again."
    
    return {"final_response": response}


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
            "items_retrieved": len(final_state.get("retrieved_items", [])),
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
        # Log error and end trace
        tracing_service.log_error(trace_id=trace_id, error=e)
        tracing_service.end_trace(trace_id=trace_id, output=f"Error: {str(e)}")
        raise
    finally:
        # Ensure traces are flushed
        tracing_service.flush()


def is_awaiting_clarification(state: ConversationState) -> bool:
    """Check if the workflow is awaiting a clarification response."""
    return state.get("workflow_status") == "awaiting_clarification"


def get_clarification_context(state: ConversationState) -> Optional[Dict[str, Any]]:
    """Get the pending clarification context from state."""
    if is_awaiting_clarification(state):
        return state.get("pending_clarification_context")
    return None
