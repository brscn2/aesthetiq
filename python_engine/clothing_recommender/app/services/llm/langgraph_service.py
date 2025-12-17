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
from app.prompts import get_prompt_manager

logger = get_logger(__name__)
prompt_manager = get_prompt_manager()


class StreamEventType(str, Enum):
    """Types of streaming events."""
    STATUS = "status"
    CHUNK = "chunk"
    CLOTHING_ITEM = "clothing_item"
    METADATA = "metadata"
    DONE = "done"


@dataclass
class StreamEvent:
    """A streaming event from the workflow."""
    type: StreamEventType
    content: Any
    node: Optional[str] = None
    
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
    route: str
    response: str
    clothing_data: Optional[Dict[str, Any]]
    metadata: Dict[str, Any]
    trace_context: Optional[Dict[str, Any]]


class LangGraphService:
    """Service for managing LangGraph workflows and agent orchestration."""
    
    def __init__(self, llm_service: LangChainService):
        """Initialize LangGraph service."""
        self.llm_service = llm_service
        self.fashion_expert = FashionExpert()
        self.langfuse = LangfuseService()
        # Compile workflow once.
        # Reasoning: compiling the graph on every request is unnecessary overhead.
        # The graph is deterministic given the code, so it is safe to reuse.
        self.workflow = self.create_conversation_workflow()
        logger.info("LangGraphService initialized")
    
    async def _classify_intent(self, state: ConversationState) -> ConversationState:
        """Classify user intent: fashion-related or general conversation."""
        message = state["message"]
        trace_context = state.get("trace_context")
        
        logger.info(f"Classifying intent for message: {message[:50]}...")
        
        try:
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
                logger.warning(f"Invalid classification result: {route}, defaulting to general")
                if "clothing" in route:
                    route = "clothing"
                else:
                    route = "general"
            
            logger.info(f"Intent classified as: {route}")
            state["route"] = route
            state["metadata"]["intent_classification"] = route
            state["metadata"]["classification_confidence"] = "llm_based"
            
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
        """Handle clothing recommendation queries using FashionExpert."""
        logger.info("Handling clothing query with FashionExpert")
        trace_context = state.get("trace_context")
        
        self.langfuse.log_event(
            name="clothing_expert_start",
            input_data={"query": state["message"]},
            trace_context=trace_context
        )
        
        clothing_data = await self.fashion_expert.get_clothing_recommendation(
            query=state["message"],
            user_context=state.get("context", {})
        )
        
        response = await self._format_clothing_response(clothing_data)
        
        state["response"] = response
        state["clothing_data"] = clothing_data
        state["metadata"]["agent_used"] = "ClothingExpert"
        
        self.langfuse.log_event(
            name="clothing_expert_complete",
            input_data={"query": state["message"]},
            output_data={"recommendations_count": len(clothing_data.get("recommendations", []))},
            trace_context=trace_context
        )
        
        return state
    
    async def _handle_general_conversation(self, state: ConversationState) -> ConversationState:
        """Handle general conversation using LLM."""
        logger.info("Handling general conversation")
        trace_context = state.get("trace_context")
        
        self.langfuse.log_event(
            name="general_conversation_start",
            input_data={"message": state["message"]},
            trace_context=trace_context
        )
        
        system_prompt = prompt_manager.get_template("general_conversation")
        
        response = await self.llm_service.generate_response(
            message=state["message"],
            system_prompt=system_prompt,
            context=state.get("context", {})
        )
        
        state["response"] = response
        state["clothing_data"] = None
        state["metadata"]["agent_used"] = "GeneralConversation"
        
        self.langfuse.log_event(
            name="general_conversation_complete",
            input_data={"message": state["message"]},
            output_data={"response_length": len(response)},
            trace_context=trace_context
        )
        
        return state
    
    async def _format_clothing_response(self, clothing_data: Dict[str, Any]) -> str:
        """Format clothing recommendation data into natural language."""
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
        """Determine which path to take based on classification."""
        route = state.get("route", "general")
        logger.info(f"Routing to: {route}")
        return route
    
    def create_conversation_workflow(self) -> StateGraph:
        """Create the conversation workflow graph with routing."""
        logger.info("Creating conversation workflow with routing")
        
        workflow = StateGraph(ConversationState)
        
        workflow.add_node("classify", self._classify_intent)
        workflow.add_node("clothing", self._handle_clothing_query)
        workflow.add_node("general", self._handle_general_conversation)
        
        workflow.set_entry_point("classify")
        
        workflow.add_conditional_edges(
            "classify",
            self._route_decision,
            {
                "clothing": "clothing",
                "general": "general"
            }
        )
        
        workflow.add_edge("clothing", END)
        workflow.add_edge("general", END)
        
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
        """Process a message through the workflow."""
        workflow = self.workflow
        
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
        """Stream a message through the workflow with progress updates."""
        logger.info(f"Streaming workflow for message: {message[:50]}...")
        
        yield StreamEvent(
            type=StreamEventType.STATUS,
            content="Analyzing your request...",
            node="classify"
        )
        
        state: ConversationState = {
            "message": message,
            "user_id": user_id,
            "session_id": session_id,
            "context": context or {},
            "route": "",
            "response": "",
            "clothing_data": None,
            "metadata": {},
            "trace_context": trace_context
        }
        
        state = await self._classify_intent(state)
        route = state["route"]
        
        yield StreamEvent(
            type=StreamEventType.METADATA,
            content={"route": route, "session_id": session_id},
            node="classify"
        )
        
        if route == "clothing":
            full_message = ""
            async for event, msg_part in self._stream_clothing_query(message, context, trace_context):
                if msg_part:
                    full_message += msg_part
                yield event
        else:
            full_message = ""
            async for event, msg_part in self._stream_general_conversation(message, context, trace_context):
                if msg_part:
                    full_message += msg_part
                yield event
        
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
        """Stream clothing recommendations with progress updates."""
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
        
        clothing_data = await self.fashion_expert.get_clothing_recommendation(
            query=message,
            user_context=context or {}
        )
        
        recommendations = clothing_data.get("recommendations", [])
        styling_tips = clothing_data.get("styling_tips", [])
        
        yield StreamEvent(
            type=StreamEventType.STATUS,
            content=f"Found {len(recommendations)} recommendations",
            node="clothing"
        ), None
        
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
        
        full_message = await self._format_clothing_response(clothing_data)
        
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
        """Stream general conversation response from LLM."""
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
        
        system_prompt = prompt_manager.get_template("general_conversation")
        
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
        
        yield StreamEvent(
            type=StreamEventType.METADATA,
            content={"message_complete": True},
            node="general"
        ), None
