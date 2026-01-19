"""Main LangGraph workflow for the conversational agent."""
from typing import Dict, Any, Literal, Optional
from langgraph.graph import StateGraph, END

from app.workflows.state import ConversationState, create_initial_state
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
    
    Returns:
        Compiled LangGraph StateGraph
    """
    logger.info("Creating conversational agent workflow")
    
    # Create the state graph
    workflow = StateGraph(ConversationState)
    
    # Add nodes
    workflow.add_node("input_guardrails", input_guardrails_node)
    workflow.add_node("intent_classifier", intent_classifier_node)
    workflow.add_node("query_analyzer", query_analyzer_node)
    workflow.add_node("conversation_agent", conversation_agent_node)
    workflow.add_node("clothing_recommender", clothing_recommender_node)
    workflow.add_node("clothing_analyzer", clothing_analyzer_node)
    workflow.add_node("output_guardrails", output_guardrails_node)
    workflow.add_node("response_formatter", response_formatter_node)
    workflow.add_node("error_response", error_response_node)
    
    # Set entry point
    workflow.set_entry_point("input_guardrails")
    
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
            "clarify": "query_analyzer",  # Loop back for clarification
            "error": "error_response",
        }
    )
    
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
) -> ConversationState:
    """
    Run the workflow with the given input.
    
    Args:
        user_id: The user's identifier
        session_id: The session identifier
        message: The user's message
        conversation_history: Previous conversation messages
        
    Returns:
        Final workflow state
    """
    from app.services.tracing.langfuse_service import get_tracing_service
    
    workflow = get_workflow()
    tracing_service = get_tracing_service()
    
    # Start Langfuse trace
    trace_id = tracing_service.start_trace(
        user_id=user_id,
        session_id=session_id,
        name="conversation_workflow",
        metadata={"message_preview": message[:100]},
    )
    
    initial_state = create_initial_state(
        user_id=user_id,
        session_id=session_id,
        message=message,
        conversation_history=conversation_history,
    )
    
    # Add trace_id to state
    initial_state["langfuse_trace_id"] = trace_id
    
    logger.info(f"Running workflow for user {user_id}, session {session_id}, trace {trace_id}")
    
    try:
        # Run the workflow
        final_state = await workflow.ainvoke(initial_state)
        
        # End trace with success
        tracing_service.end_trace(
            trace_id=trace_id,
            output=final_state.get("final_response", "")[:500],
            metadata={
                "intent": final_state.get("intent"),
                "items_retrieved": len(final_state.get("retrieved_items", [])),
            },
        )
        
        logger.info(f"Workflow completed with response length: {len(final_state.get('final_response', ''))}")
        
        return final_state
        
    except Exception as e:
        # Log error and end trace
        tracing_service.log_error(trace_id=trace_id, error=e)
        tracing_service.end_trace(trace_id=trace_id, output=f"Error: {str(e)}")
        raise
    finally:
        # Ensure traces are flushed
        tracing_service.flush()
