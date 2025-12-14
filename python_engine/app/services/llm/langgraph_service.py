"""LangGraph service for workflow orchestration."""
from typing import Optional, Dict, Any, List, TypedDict, Literal, AsyncIterator
from datetime import datetime
from dataclasses import dataclass
from enum import Enum
from langgraph.graph import StateGraph, END

from app.core.logger import get_logger
from app.services.llm.langchain_service import LangChainService
from app.services.llm.langfuse_service import LangfuseService
from app.agents.fashion_expert import FashionExpert
from app.prompts import PromptManager

logger = get_logger(__name__)
prompt_manager = PromptManager()


class StreamEventType(str, Enum):
    """Types of streaming events."""
    STATUS = "status"           # Workflow status updates (e.g., "Classifying intent...")
    CHUNK = "chunk"             # Text content chunk
    CLOTHING_ITEM = "clothing_item"  # Individual clothing recommendation
    METADATA = "metadata"       # Metadata updates
    DONE = "done"               # Stream complete


@dataclass
class StreamEvent:
    """A streaming event from the workflow."""
    type: StreamEventType
    content: Any
    node: Optional[str] = None  # Current workflow node
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type.value,
            "content": self.content,
            "node": self.node
        }


class ConversationState(TypedDict):
    """State for conversation workflow."""
    message: str
    user_id: str
    session_id: str
    context: Dict[str, Any]
    route: str  # "clothing" or "general"
    response: str
    clothing_data: Optional[Dict[str, Any]]  # Data from ClothingExpert
    metadata: Dict[str, Any]
    trace_context: Optional[Dict[str, Any]]  # Langfuse trace context from start_trace()


class LangGraphService:
    """
    Service for managing LangGraph workflows and agent orchestration.
    
    Implements routing between:
    - FashionExpert: For clothing/fashion queries
    - General conversation: For other topics
    """
    
    def __init__(self, llm_service: LangChainService):
        """
        Initialize LangGraph service.
        
        Args:
            llm_service: LangChain service for LLM interactions
        """
        self.llm_service = llm_service
        self.fashion_expert = FashionExpert()
        self.langfuse = LangfuseService()
        logger.info("LangGraphService initialized")
    
    async def _classify_intent(self, state: ConversationState) -> ConversationState:
        """
        Classify user intent using LLM: fashion-related or general conversation.
        
        Args:
            state: Current conversation state
            
        Returns:
            Updated state with route decision
        """
        message = state["message"]
        trace_context = state.get("trace_context")
        
        logger.info(f"Classifying intent for message: {message[:50]}...")
        
        try:
            # Get classification prompt
            classification_prompt = prompt_manager.get_template(
                "intent_classifier",
                message=message
            )
            
            # Use LLM to classify
            classification_result = await self.llm_service.generate_response(
                message="",  # Message is in system prompt
                system_prompt=classification_prompt
            )
            
            # Parse result (should be "clothing" or "general")
            route = classification_result.strip().lower()
            
            # Validate the response
            if route not in ["clothing", "general"]:
                logger.warning(f"Invalid classification result: {route}, defaulting to general")
                # Try to extract from response if LLM gave extra text
                if "clothing" in route:
                    route = "clothing"
                else:
                    route = "general"
            
            logger.info(f"Intent classified as: {route}")
            state["route"] = route
            state["metadata"]["intent_classification"] = route
            state["metadata"]["classification_confidence"] = "llm_based"
            
            # Log classification to Langfuse
            self.langfuse.log_event(
                name="intent_classification",
                input_data={"message": message},
                output_data={"intent": route},
                trace_context=trace_context
            )
            
        except Exception as e:
            logger.error(f"Error in intent classification: {e}, defaulting to general")
            state["route"] = "general"
            state["metadata"]["intent_classification"] = "general"
            state["metadata"]["classification_error"] = str(e)
        
        return state
    
    async def _handle_clothing_query(self, state: ConversationState) -> ConversationState:
        """
        Handle clothing recommendation queries using FashionExpert.
        
        Args:
            state: Current conversation state
            
        Returns:
            Updated state with clothing recommendations
        """
        logger.info("Handling clothing query with FashionExpert")
        trace_context = state.get("trace_context")
        
        # Log clothing agent start
        self.langfuse.log_event(
            name="clothing_expert_start",
            input_data={"query": state["message"]},
            trace_context=trace_context
        )
        
        # Get recommendations from fashion expert
        clothing_data = await self.fashion_expert.get_clothing_recommendation(
            query=state["message"],
            user_context=state.get("context", {})
        )
        
        # Generate natural language response from the data
        response = await self._format_clothing_response(clothing_data)
        
        state["response"] = response
        state["clothing_data"] = clothing_data
        state["metadata"]["agent_used"] = "ClothingExpert"
        
        # Log clothing agent completion
        self.langfuse.log_event(
            name="clothing_expert_complete",
            input_data={"query": state["message"]},
            output_data={"recommendations_count": len(clothing_data.get("recommendations", []))},
            trace_context=trace_context
        )
        
        return state
    
    async def _handle_general_conversation(self, state: ConversationState) -> ConversationState:
        """
        Handle general conversation using LLM.
        
        Args:
            state: Current conversation state
            
        Returns:
            Updated state with general response
        """
        logger.info("Handling general conversation")
        trace_context = state.get("trace_context")
        
        # Log general conversation start
        self.langfuse.log_event(
            name="general_conversation_start",
            input_data={"message": state["message"]},
            trace_context=trace_context
        )
        
        # Get general conversation prompt
        system_prompt = prompt_manager.get_template("general_conversation")
        
        # Use regular LLM for general conversation
        response = await self.llm_service.generate_response(
            message=state["message"],
            system_prompt=system_prompt,
            context=state.get("context", {})
        )
        
        state["response"] = response
        state["clothing_data"] = None
        state["metadata"]["agent_used"] = "GeneralConversation"
        
        # Log general conversation completion
        self.langfuse.log_event(
            name="general_conversation_complete",
            input_data={"message": state["message"]},
            output_data={"response_length": len(response)},
            trace_context=trace_context
        )
        
        return state
    
    async def _format_clothing_response(self, clothing_data: Dict[str, Any]) -> str:
        """
        Format clothing recommendation data into natural language.
        
        Args:
            clothing_data: Clothing recommendation data
            
        Returns:
            Natural language response
        """
        recommendations = clothing_data.get("recommendations", [])
        styling_tips = clothing_data.get("styling_tips", [])
        
        response_parts = [
            "Based on your style profile, here are my recommendations:\n"
        ]
        
        for i, rec in enumerate(recommendations, 1):
            response_parts.append(
                f"\n{i}. **{rec['item']}** in {rec['color']}\n"
                f"   - Style: {rec['style']}\n"
                f"   - Why: {rec['reason']}\n"
                f"   - Price: {rec['price_range']}\n"
                f"   - Where: {', '.join(rec['where_to_buy'])}"
            )
        
        if styling_tips:
            response_parts.append("\n\n**Styling Tips:**")
            for tip in styling_tips:
                response_parts.append(f"- {tip}")
        
        return "\n".join(response_parts)
    
    def _route_decision(self, state: ConversationState) -> Literal["clothing", "general"]:
        """
        Determine which path to take based on classification.
        
        Args:
            state: Current conversation state
            
        Returns:
            Next node name
        """
        route = state.get("route", "general")
        logger.info(f"Routing to: {route}")
        return route
    
    def create_conversation_workflow(self) -> StateGraph:
        """
        Create the conversation workflow graph with routing.
        
        Returns:
            Compiled StateGraph workflow
        """
        logger.info("Creating conversation workflow with routing")
        
        # Create the graph
        workflow = StateGraph(ConversationState)
        
        # Add nodes
        workflow.add_node("classify", self._classify_intent)
        workflow.add_node("clothing", self._handle_clothing_query)
        workflow.add_node("general", self._handle_general_conversation)
        
        # Set entry point
        workflow.set_entry_point("classify")
        
        # Add conditional routing after classification
        workflow.add_conditional_edges(
            "classify",
            self._route_decision,
            {
                "clothing": "clothing",
                "general": "general"
            }
        )
        
        # Both paths end after processing
        workflow.add_edge("clothing", END)
        workflow.add_edge("general", END)
        
        # Compile the workflow
        compiled = workflow.compile()
        logger.info("Conversation workflow compiled successfully")
        
        return compiled
    
    async def process_message(
        self,
        message: str,
        user_id: str,
        session_id: str,
        context: Optional[Dict[str, Any]] = None,
        trace_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process a message through the workflow.
        
        Args:
            message: User message
            user_id: User identifier
            session_id: Session identifier
            context: Optional context
            trace_context: Optional Langfuse trace context from start_trace()
            
        Returns:
            Workflow result with response and metadata
        """
        workflow = self.create_conversation_workflow()
        
        # Initialize state
        initial_state: ConversationState = {
            "message": message,
            "user_id": user_id,
            "session_id": session_id,
            "context": context or {},
            "route": "",
            "response": "",
            "clothing_data": None,
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "workflow_version": "1.0"
            },
            "trace_context": trace_context
        }
        
        # Execute workflow
        logger.info(f"Executing workflow for message: {message[:50]}...")
        result = await workflow.ainvoke(initial_state)
        
        logger.info(f"Workflow completed. Route: {result['route']}")
        
        return {
            "message": result["response"],
            "session_id": session_id,
            "metadata": result["metadata"],
            "clothing_data": result.get("clothing_data")
        }
    
    async def stream_message(
        self,
        message: str,
        user_id: str,
        session_id: str,
        context: Optional[Dict[str, Any]] = None,
        trace_context: Optional[Dict[str, Any]] = None
    ) -> AsyncIterator[StreamEvent]:
        """
        Stream a message through the workflow with progress updates.
        
        Yields StreamEvents for:
        - Status updates (workflow progress)
        - Content chunks (LLM streaming for general conversation)
        - Clothing items (individual recommendations)
        - Final done event
        
        Args:
            message: User message
            user_id: User identifier
            session_id: Session identifier
            context: Optional context
            trace_context: Optional Langfuse trace context from start_trace()
            
        Yields:
            StreamEvent objects with type and content
        """
        logger.info(f"Streaming workflow for message: {message[:50]}...")
        
        # Status: Starting classification
        yield StreamEvent(
            type=StreamEventType.STATUS,
            content="Analyzing your request...",
            node="classify"
        )
        
        # Classify intent
        classification_prompt = prompt_manager.get_template(
            "intent_classifier",
            message=message
        )
        
        classification_result = await self.llm_service.generate_response(
            message="",
            system_prompt=classification_prompt
        )
        
        route = classification_result.strip().lower()
        if route not in ["clothing", "general"]:
            route = "clothing" if "clothing" in route else "general"
        
        # Log to Langfuse
        self.langfuse.log_event(
            name="intent_classification",
            input_data={"message": message},
            output_data={"intent": route},
            trace_context=trace_context
        )
        
        # Yield metadata with route decision
        yield StreamEvent(
            type=StreamEventType.METADATA,
            content={"route": route, "session_id": session_id},
            node="classify"
        )
        
        if route == "clothing":
            # Handle clothing recommendations with streaming
            full_message = ""
            async for event, msg_part in self._stream_clothing_query(message, context, trace_context):
                if msg_part:
                    full_message += msg_part
                yield event
        else:
            # Handle general conversation with LLM streaming
            full_message = ""
            async for event, msg_part in self._stream_general_conversation(message, context, trace_context):
                if msg_part:
                    full_message += msg_part
                yield event
        
        # Final done event with complete message (same format as non-streaming)
        yield StreamEvent(
            type=StreamEventType.DONE,
            content={
                "route": route,
                "session_id": session_id,
                "message": full_message
            },
            node="end"
        )
    
    async def _stream_clothing_query(
        self,
        message: str,
        context: Optional[Dict[str, Any]],
        trace_context: Optional[Dict[str, Any]]
    ) -> AsyncIterator[tuple[StreamEvent, Optional[str]]]:
        """
        Stream clothing recommendations with progress updates.
        
        Sends status updates during processing, then returns complete
        recommendations as a single package (no per-item streaming).
        
        Yields tuples of (StreamEvent, message_part) where message_part 
        contributes to the final formatted message.
        """
        # Status: Searching for clothing
        yield StreamEvent(
            type=StreamEventType.STATUS,
            content="Searching clothing database...",
            node="clothing"
        ), None
        
        self.langfuse.log_event(
            name="clothing_expert_start",
            input_data={"query": message},
            trace_context=trace_context
        )
        
        # Get recommendations (all at once)
        clothing_data = await self.fashion_expert.get_clothing_recommendation(
            query=message,
            user_context=context or {}
        )
        
        recommendations = clothing_data.get("recommendations", [])
        styling_tips = clothing_data.get("styling_tips", [])
        
        # Status: Processing complete
        yield StreamEvent(
            type=StreamEventType.STATUS,
            content=f"Found {len(recommendations)} recommendations",
            node="clothing"
        ), None
        
        # Send all recommendations as a single package
        yield StreamEvent(
            type=StreamEventType.CLOTHING_ITEM,
            content={
                "recommendations": [
                    {
                        "index": i,
                        "item": rec["item"],
                        "color": rec["color"],
                        "style": rec["style"],
                        "reason": rec["reason"],
                        "price_range": rec["price_range"],
                        "where_to_buy": rec["where_to_buy"],
                        "hex_color": rec.get("hex_color")
                    }
                    for i, rec in enumerate(recommendations, 1)
                ],
                "styling_tips": styling_tips
            },
            node="clothing"
        ), None
        
        # Build formatted message for final output
        message_parts = ["Based on your style profile, here are my recommendations:\n"]
        
        for i, rec in enumerate(recommendations, 1):
            message_parts.append(
                f"\n{i}. **{rec['item']}** in {rec['color']}\n"
                f"   - Style: {rec['style']}\n"
                f"   - Why: {rec['reason']}\n"
                f"   - Price: {rec['price_range']}\n"
                f"   - Where: {', '.join(rec['where_to_buy'])}"
            )
        
        if styling_tips:
            message_parts.append("\n\n**Styling Tips:**")
            for tip in styling_tips:
                message_parts.append(f"- {tip}")
        
        # Log to Langfuse
        self.langfuse.log_event(
            name="clothing_expert_complete",
            input_data={"query": message},
            output_data={
                "recommendations_count": len(recommendations),
                "recommendations": [
                    {
                        "item": rec["item"],
                        "color": rec["color"],
                        "style": rec["style"],
                        "reason": rec["reason"],
                        "price_range": rec["price_range"],
                        "where_to_buy": rec["where_to_buy"],
                        "hex_color": rec.get("hex_color")
                    }
                    for rec in recommendations
                ],
                "styling_tips": styling_tips
            },
            trace_context=trace_context
        )
        
        # Yield final message part
        full_message = "\n".join(message_parts)
        yield StreamEvent(
            type=StreamEventType.METADATA,
            content={"message_complete": True},
            node="clothing"
        ), full_message
    
    async def _stream_general_conversation(
        self,
        message: str,
        context: Optional[Dict[str, Any]],
        trace_context: Optional[Dict[str, Any]]
    ) -> AsyncIterator[tuple[StreamEvent, Optional[str]]]:
        """
        Stream general conversation response from LLM.
        
        Yields tuples of (StreamEvent, message_part) for building final message.
        """
        # Status: Generating response
        yield StreamEvent(
            type=StreamEventType.STATUS,
            content="Generating response...",
            node="general"
        ), None
        
        self.langfuse.log_event(
            name="general_conversation_start",
            input_data={"message": message},
            trace_context=trace_context
        )
        
        # Get system prompt
        system_prompt = prompt_manager.get_template("general_conversation")
        
        # Stream LLM response
        full_response = ""
        async for chunk in self.llm_service.stream_response(
            message=message,
            context=context,
            system_prompt=system_prompt
        ):
            if chunk:
                full_response += chunk
                yield StreamEvent(
                    type=StreamEventType.CHUNK,
                    content=chunk,
                    node="general"
                ), chunk
        
        self.langfuse.log_event(
            name="general_conversation_complete",
            input_data={"message": message},
            output_data={"response_length": len(full_response)},
            trace_context=trace_context
        )
        
        # Signal completion (message already built from chunks)
        yield StreamEvent(
            type=StreamEventType.METADATA,
            content={"message_complete": True},
            node="general"
        ), None
