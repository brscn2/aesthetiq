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
        "message": message,
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


async def simple_response_node(state: ConversationState) -> Dict[str, Any]:
    """
    Simple response node for guardrail testing - no LLM or tool calls.
    
    Just echoes back a confirmation that the input passed guardrails.
    """
    message = state.get("message", "")
    logger.info(f"Simple response node - input passed guardrails: {message[:50]}...")
    
    return {
        "final_response": f"Input passed guardrails successfully.\n\nYour message: {message}",
        "metadata": {
            **state.get("metadata", {}),
            "node_used": "simple_response",
        },
    }


async def error_response_node(state: ConversationState) -> Dict[str, Any]:
    """
    Error response node - handles errors gracefully with detailed guardrail information.
    """
    logger.debug("Error response node")
    
    # Check what type of error occurred
    metadata = state.get("metadata", {})
    
    if not metadata.get("input_safe", True):
        # Build detailed error message for guardrail violations
        warnings = metadata.get("input_guardrail_warnings", [])
        risk_score = metadata.get("input_risk_score", 0.0)
        provider = metadata.get("input_guardrail_provider", "unknown")
        
        # Determine what was detected
        detection_type = "safety violation"
        if warnings:
            warning_text = " ".join(warnings).lower()
            if "prompt injection" in warning_text or "jailbreak" in warning_text:
                detection_type = "prompt injection attempt (jailbreak)"
            elif "toxic" in warning_text or "harmful" in warning_text:
                detection_type = "toxic or harmful content"
            elif "inappropriate" in warning_text:
                detection_type = "inappropriate content"
        
        # Build informative error message
        response_parts = [
            "I'm sorry, but I can't process that request.",
            "",
            f"Guardrails detected: {detection_type}",
            f"Risk Score: {risk_score:.2f}",
            f"Provider: {provider}",
        ]
        
        if warnings:
            response_parts.append("Details:")
            for warning in warnings:
                response_parts.append(f"  - {warning}")
        
        response_parts.append("")
        response_parts.append("Please try rephrasing your question.")
        
        response = "\n".join(response_parts)
        
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
    Create a simplified workflow for guardrail testing.
    
    The workflow tests input guardrails with a simple response node (no LLM/tools):
    
    1. Entry: input_guardrails - validates user input
    2. If safe: simple_response -> END (echoes back the message)
    3. If unsafe: error_response -> END (with detailed guardrail info)
    
    Returns:
        Compiled LangGraph StateGraph
    """
    logger.info("Creating simplified guardrail testing workflow")
    
    # Create the state graph
    workflow = StateGraph(ConversationState)
    
    # Add only the nodes we need for guardrail testing (no LLM or tool calls)
    workflow.add_node("input_guardrails", input_guardrails_node)
    workflow.add_node("simple_response", simple_response_node)
    workflow.add_node("error_response", error_response_node)
    
    # Set entry point to input guardrails
    workflow.set_entry_point("input_guardrails")
    
    # Add conditional edges from input guardrails
    workflow.add_conditional_edges(
        "input_guardrails",
        route_after_input_guardrails,
        {
            "safe": "simple_response",
            "unsafe": "error_response",
        }
    )
    
    # Both nodes lead to END
    workflow.add_edge("simple_response", END)
    workflow.add_edge("error_response", END)
    
    logger.info("Simplified workflow created successfully")
    
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


# Human-readable node name mapping
NODE_DISPLAY_NAMES = {
    "input_guardrails": "Validating input",
    "simple_response": "Processing response",
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
                    # (Simplified workflow only has basic nodes, no special events needed)
                    
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
            if event_type == "on_chain_end" and event.get("data", {}).get("output"):
                output = event.get("data", {}).get("output")
                # Check if this looks like a final state (has final_response)
                if isinstance(output, dict) and "final_response" in output:
                    final_state = output
        
        # If we didn't capture final state, run workflow synchronously to get it
        if final_state is None:
            logger.warning("Final state not captured from streaming, running sync fallback")
            final_state = await workflow.ainvoke(initial_state)
        
        # Check workflow status
        workflow_status = final_state.get("workflow_status", "completed")
        needs_clarification = final_state.get("needs_clarification", False)
        
        # End trace
        trace_metadata = {
            "intent": final_state.get("intent"),
            "items_retrieved": len(final_state.get("retrieved_items", [])),
            "workflow_status": workflow_status,
            "needs_clarification": needs_clarification,
            "streaming": True,
        }
        
        if needs_clarification:
            trace_metadata["clarification_question"] = final_state.get("clarification_question", "")
        
        tracing_service.end_trace(
            trace_id=trace_id,
            output=final_state.get("final_response", "")[:500],
            metadata=trace_metadata,
        )
        
        # Yield final done event
        yield StreamEvent(
            type="done",
            content={
                "response": final_state.get("final_response", ""),
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
        logger.error(f"Streaming workflow error: {e}")
        tracing_service.log_error(trace_id=trace_id, error=e)
        tracing_service.end_trace(trace_id=trace_id, output=f"Error: {str(e)}")
        
        yield StreamEvent(
            type="error",
            content={"message": str(e)},
            timestamp=datetime.utcnow().isoformat(),
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
