"""Conversation Agent for handling general fashion questions.

This agent handles the "general" intent path:
- Fashion advice and tips
- Latest trends discussion
- Style guidance
- Color theory explanations
"""
from typing import Any, Dict, List, Optional

from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langgraph.prebuilt import create_react_agent

from app.workflows.state import ConversationState
from app.services.llm_service import get_llm_service
from app.services.tracing.langfuse_service import get_tracing_service
from app.mcp import get_mcp_tools
from app.core.logger import get_logger

logger = get_logger(__name__)


CONVERSATION_AGENT_PROMPT = """You are AesthetIQ, an expert AI fashion assistant with deep knowledge of:
- Fashion trends and style advice
- Color theory and seasonal color analysis
- Personal styling and wardrobe curation
- Fashion history and designer knowledge
- Body types and flattering styles

You help users with general fashion questions, provide style advice, and discuss trends.

Guidelines:
1. Be friendly, knowledgeable, and helpful
2. Provide specific, actionable advice
3. Consider the user's personal style when relevant
4. Reference current trends when appropriate
5. If you have access to the user's style profile, personalize your advice

You have access to tools that can:
- Search the web for fashion trends and articles
- Get the user's style DNA (color season, style archetype)

Use these tools when they would help provide better, more personalized answers.

Keep responses concise but informative. Aim for 2-3 paragraphs maximum unless more detail is requested.
"""


# Tools relevant for general conversation
CONVERSATION_TOOLS = [
    "web_search",
    "search_trends", 
    "search_blogs",
    "get_style_dna",
    "get_color_season",
    "get_style_archetype",
    "get_recommended_colors",
]


async def conversation_agent_node(state: ConversationState) -> Dict[str, Any]:
    """
    Conversation agent node - handles general fashion questions.
    
    Reads:
        - state["message"]: The user's current message
        - state["conversation_history"]: Previous messages for context
        - state["user_id"]: For fetching style DNA if needed
        
    Writes:
        - state["final_response"]: The agent's response
        - state["metadata"]: Updated with agent info and tools used
    """
    message = state.get("message", "")
    conversation_history = state.get("conversation_history", [])
    user_id = state.get("user_id", "")
    trace_id = state.get("langfuse_trace_id")
    
    logger.info(f"Conversation agent processing: {message[:50]}...")
    
    # Get services
    llm_service = get_llm_service()
    tracing_service = get_tracing_service()
    
    # Log agent start
    if trace_id:
        tracing_service.log_agent_transition(
            trace_id=trace_id,
            from_agent="intent_classifier",
            to_agent="conversation_agent",
            reason="General intent detected",
        )
    
    try:
        # Get MCP tools and filter to conversation-relevant ones
        all_tools = await get_mcp_tools()
        tools = [t for t in all_tools if t.name in CONVERSATION_TOOLS]
        
        tools_used = []
        
        if tools:
            logger.info(f"Conversation agent has {len(tools)} tools available")
            
            # Create react agent with tools
            agent = create_react_agent(
                llm_service.llm,
                tools,
                prompt=CONVERSATION_AGENT_PROMPT,
            )
            
            # Build messages with history
            messages = []
            if conversation_history:
                for msg in conversation_history[-5:]:  # Last 5 messages
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    if role == "user":
                        messages.append(HumanMessage(content=content))
                    elif role == "assistant":
                        messages.append(AIMessage(content=content))
            
            # Add context about user if available
            user_context = f"\n\n[User ID: {user_id}]" if user_id else ""
            messages.append(HumanMessage(content=message + user_context))
            
            # Invoke agent
            result = await agent.ainvoke({"messages": messages})
            
            # Extract response and tools used
            final_message = result["messages"][-1]
            response = final_message.content
            
            # Track which tools were called
            for msg in result["messages"]:
                if hasattr(msg, "tool_calls") and msg.tool_calls:
                    for tool_call in msg.tool_calls:
                        tools_used.append(tool_call.get("name", "unknown"))
                        
                        # Log tool call to Langfuse
                        if trace_id:
                            tracing_service.log_tool_call(
                                trace_id=trace_id,
                                tool_name=tool_call.get("name", "unknown"),
                                input_params=tool_call.get("args", {}),
                                output="[see agent response]",
                            )
            
        else:
            logger.warning("No tools available, using direct LLM response")
            
            # Fallback to direct LLM response without tools
            response = await llm_service.chat_with_history(
                system_prompt=CONVERSATION_AGENT_PROMPT,
                user_message=message,
                conversation_history=conversation_history[-5:],
            )
        
        # Log LLM call to Langfuse
        if trace_id:
            tracing_service.log_llm_call(
                trace_id=trace_id,
                agent_name="conversation_agent",
                input_text=message,
                output_text=response[:500],
                metadata={"tools_used": tools_used},
            )
        
        logger.info(f"Conversation agent generated response ({len(response)} chars)")
        
        # Update metadata
        metadata = state.get("metadata", {})
        metadata["agent_used"] = "conversation_agent"
        metadata["tools_called"] = tools_used
        
        return {
            "final_response": response,
            "metadata": metadata,
        }
        
    except Exception as e:
        logger.error(f"Conversation agent failed: {e}")
        
        # Log error
        if trace_id:
            tracing_service.log_error(trace_id=trace_id, error=e)
        
        # Fallback response
        fallback_response = (
            "I'd be happy to help with your fashion question! "
            "However, I'm experiencing a temporary issue. "
            "Could you please try rephrasing your question or ask me again in a moment?"
        )
        
        metadata = state.get("metadata", {})
        metadata["agent_used"] = "conversation_agent"
        metadata["error"] = str(e)
        
        return {
            "final_response": fallback_response,
            "metadata": metadata,
        }
