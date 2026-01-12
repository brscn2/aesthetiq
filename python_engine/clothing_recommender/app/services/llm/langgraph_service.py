"""LangGraph service for workflow orchestration."""
from typing import Optional, Dict, Any, List, TypedDict, AsyncIterator
from datetime import datetime
from dataclasses import dataclass
from enum import Enum
from langgraph.graph import StateGraph, END

from app.core.logger import get_logger
from app.services.llm.langchain_service import LangChainService
from app.services.llm.langfuse_service import LangfuseService
from app.agents.recommender import RecommenderGraph, RecommenderStage
from app.agents.recommender.graph import StreamEventType as RecommenderEventType
from app.prompts import get_prompt_manager

logger = get_logger(__name__)
prompt_manager = get_prompt_manager()


class StreamEventType(str, Enum):
    """Types of streaming events."""
    STATUS = "status"
    CHUNK = "chunk"
    CLOTHING_ITEM = "clothing_item"
    CLOTHING_RESULT = "clothing_result"  # Final clothing recommendations
    RECOMMENDER_STAGE = "recommender_stage"  # Recommender progress updates
    METADATA = "metadata"
    DONE = "done"
    ERROR = "error"


# Route constants to avoid magic strings
class Route(str, Enum):
    """Workflow route identifiers."""
    CLOTHING = "clothing"
    GENERAL = "general"


# Node name constants
class NodeName(str, Enum):
    """Workflow node identifiers."""
    CLASSIFY = "classify"
    CLOTHING = "clothing"
    GENERAL = "general"
    END = "end"


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
    messages: List[Dict[str, Any]]  # Chat history for DB persistence
    message: str  # Current user message (helper field)
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
    
    WORKFLOW_VERSION = "1.0"
    
    def __init__(self, llm_service: LangChainService, recommender_graph: Optional[RecommenderGraph] = None):
        """Initialize LangGraph service.
        
        Args:
            llm_service: LangChain service for LLM calls
            recommender_graph: Optional pre-initialized RecommenderGraph.
                              If not provided, one will be created.
        """
        self.llm_service = llm_service
        # Initialize RecommenderGraph for clothing queries
        self.recommender_graph = recommender_graph or RecommenderGraph(llm_service=llm_service)
        self.langfuse = LangfuseService()
        
        # Compile workflow once.
        # Reasoning: compiling the graph on every request is unnecessary overhead.
        # The graph is deterministic given the code, so it is safe to reuse.
        self.workflow = self.create_conversation_workflow()
        logger.info("LangGraphService initialized with RecommenderGraph")
    
    def _create_initial_state(
        self,
        message: str,
        user_id: str,
        session_id: str,
        context: Optional[Dict[str, Any]] = None,
        trace_context: Optional[Dict[str, Any]] = None
    ) -> ConversationState:
        """
        Create initial state for workflow execution.
        
        NOTE: messages history is NOT passed in request body.
        It will be loaded from database (e.g., Postgres) via a Checkpointer.
        """
        return {
            "messages": [],  # Loaded from DB, not request
            "message": message,
            "user_id": user_id,
            "session_id": session_id,
            "context": context or {},
            "route": "",
            "response": "",
            "clothing_data": None,
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "workflow_version": self.WORKFLOW_VERSION
            },
            "trace_context": trace_context
        }
    
    async def _classify_intent(self, state: ConversationState) -> ConversationState:
        """Classify user intent: fashion-related or general conversation."""
        message = state["message"]
        trace_context = state.get("trace_context")
        
        logger.info(f"Classifying intent for message: {message[:50]}...")
        
        try:
            # Use LLM for classification (pattern matching removed to avoid false positives)
            # Example: "what kind of party clothing is trending" should be "general", not "clothing"
            # Optimizations: max_tokens=5 and temperature=0.3 already provide fast classification
            classification_prompt = prompt_manager.get_template(
                "intent_classifier",
                message=message
            )
            
            # Optimize: Use max_tokens limit for faster classification
            # Classification only needs "clothing" or "general" - very short response
            classification_result = await self.llm_service.generate_response(
                message="",
                system_prompt=classification_prompt,
                max_tokens=5  # Limit to speed up - only need "clothing" or "general"
            )
            
            route = classification_result.strip().lower()
            
            if route not in [Route.CLOTHING.value, Route.GENERAL.value]:
                logger.warning(f"Invalid classification result: {route}, defaulting to general")
                if Route.CLOTHING.value in route:
                    route = Route.CLOTHING.value
                else:
                    route = Route.GENERAL.value
            
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
            state["route"] = Route.GENERAL.value
            state["metadata"]["intent_classification"] = Route.GENERAL.value
            state["metadata"]["classification_error"] = str(e)
        
        return state
    
    async def _handle_clothing_query(self, state: ConversationState) -> ConversationState:
        """Handle clothing recommendation queries using RecommenderGraph.
        
        This triggers the full recommender pipeline:
        1. Query analysis (extract filters + semantic query)
        2. Optional profile fetch
        3. Vector search
        4. Result verification (with retry loop)
        5. Final response
        """
        logger.info("Routing to RecommenderGraph for clothing recommendations")
        trace_context = state.get("trace_context")
        
        self.langfuse.log_event(
            name="recommender_start",
            input_data={"query": state["message"]},
            trace_context=trace_context
        )
        
        try:
            # Run the recommender graph
            result = await self.recommender_graph.recommend(
                user_query=state["message"],
                user_id=state["user_id"],
                session_id=state["session_id"],
            )
            
            item_ids = result.get("item_ids", [])
            iterations = result.get("iterations", 1)
            fallback_message = result.get("message")
            
            # Format response based on results
            if item_ids:
                # Build response with item IDs
                response = self._format_clothing_response(item_ids, state["message"])
                state["clothing_data"] = {
                    "item_ids": item_ids,
                    "count": len(item_ids),
                    "iterations": iterations,
                }
            else:
                # No results - use fallback message
                response = fallback_message or "I couldn't find any matching items. Try a different search."
                state["clothing_data"] = {
                    "item_ids": [],
                    "count": 0,
                    "iterations": iterations,
                    "fallback": True,
                }
            
            state["response"] = response
            state["metadata"]["agent_used"] = "RecommenderGraph"
            state["metadata"]["recommender_iterations"] = iterations
            state["metadata"]["items_found"] = len(item_ids)
            
            self.langfuse.log_event(
                name="recommender_complete",
                input_data={"query": state["message"]},
                output_data={
                    "items_found": len(item_ids),
                    "iterations": iterations,
                },
                trace_context=trace_context
            )
            
        except Exception as e:
            logger.error(f"RecommenderGraph error: {e}", exc_info=True)
            state["response"] = "I had trouble searching for clothing. Please try again."
            state["clothing_data"] = {"error": str(e)}
            state["metadata"]["agent_used"] = "RecommenderGraph"
            state["metadata"]["error"] = str(e)
        
        return state
    
    def _format_clothing_response(self, item_ids: List[str], query: str) -> str:
        """Format a natural language response with clothing recommendations.
        
        Optimized for speed: Simple, direct responses without LLM calls.
        
        Args:
            item_ids: List of recommended item IDs
            query: Original user query
            
        Returns:
            Formatted response string
        """
        count = len(item_ids)
        # Optimize: Use shorter, faster responses
        if count == 1:
            return f"Found 1 item for you!"
        elif count <= 5:
            return f"Found {count} items!"
        else:
            return f"Found {count} items!"
    
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
    
    def _route_decision(self, state: ConversationState) -> str:
        """Determine which path to take based on classification."""
        route = state.get("route", Route.GENERAL.value)
        # Validate route is a known value
        if route not in [Route.CLOTHING.value, Route.GENERAL.value]:
            logger.warning(f"Unknown route '{route}', defaulting to general")
            route = Route.GENERAL.value
        logger.info(f"Routing to: {route}")
        return route
    
    def create_conversation_workflow(self) -> StateGraph:
        """Create the conversation workflow graph with routing."""
        logger.info("Creating conversation workflow with routing")
        
        workflow = StateGraph(ConversationState)
        
        workflow.add_node(NodeName.CLASSIFY.value, self._classify_intent)
        workflow.add_node(NodeName.CLOTHING.value, self._handle_clothing_query)
        workflow.add_node(NodeName.GENERAL.value, self._handle_general_conversation)
        
        workflow.set_entry_point(NodeName.CLASSIFY.value)
        
        workflow.add_conditional_edges(
            NodeName.CLASSIFY.value,
            self._route_decision,
            {
                Route.CLOTHING.value: NodeName.CLOTHING.value,
                Route.GENERAL.value: NodeName.GENERAL.value
            }
        )
        
        workflow.add_edge(NodeName.CLOTHING.value, END)
        workflow.add_edge(NodeName.GENERAL.value, END)
        
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
        initial_state = self._create_initial_state(
            message=message,
            user_id=user_id,
            session_id=session_id,
            context=context,
            trace_context=trace_context
        )
        
        logger.info(f"Executing workflow for message: {message[:50]}...")
        result = await self.workflow.ainvoke(initial_state)
        
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
        """Stream a message through the workflow with token-by-token streaming.
        
        NOTE: LangGraph's astream() streams node completions, not tokens.
        For true token streaming, we:
        1. Run classification through the graph
        2. Stream tokens directly from the LLM based on the route
        """
        logger.info(f"Streaming workflow for message: {message[:50]}...")
        
        initial_state = self._create_initial_state(
            message=message,
            user_id=user_id,
            session_id=session_id,
            context=context,
            trace_context=trace_context
        )

        # Track full response for final DONE event (fallback if frontend streaming fails)
        full_response = ""
        final_route = ""

        try:
            # Step 1: Run classification only
            # Send status immediately for better UX
            yield StreamEvent(
                type=StreamEventType.STATUS,
                content="Understanding your request...",
                node=NodeName.CLASSIFY.value
            )
            
            # Classify intent (this is the bottleneck - LLM call)
            # Optimize: Use faster classification or cache common patterns
            state = await self._classify_intent(initial_state)
            final_route = state["route"]
            
            yield StreamEvent(
                type=StreamEventType.METADATA,
                content={"route": final_route, "session_id": session_id},
                node=NodeName.CLASSIFY.value
            )
            
            # Step 2: Stream based on route
            if final_route == Route.CLOTHING.value:
                # Use RecommenderGraph with streaming stages
                yield StreamEvent(
                    type=StreamEventType.STATUS,
                    content="Starting clothing recommendation search...",
                    node=NodeName.CLOTHING.value
                )
                
                # Stream recommender stages
                item_ids = []
                iterations = 0
                fallback_message = None
                
                async for rec_event in self.recommender_graph.recommend_stream(
                    user_query=message,
                    user_id=user_id,
                    session_id=session_id,
                ):
                    # Map recommender events to langgraph_service StreamEvents
                    if rec_event.type == RecommenderEventType.STAGE:
                        # Emit stage progress
                        yield StreamEvent(
                            type=StreamEventType.RECOMMENDER_STAGE,
                            content={
                                "stage": rec_event.data.get("stage"),
                                "node": rec_event.data.get("node"),
                                "iteration": rec_event.data.get("iteration"),
                            },
                            node=NodeName.CLOTHING.value
                        )
                    
                    elif rec_event.type == RecommenderEventType.RESULT:
                        # Capture final results
                        item_ids = rec_event.data.get("item_ids", [])
                        fallback_message = rec_event.data.get("message")
                    
                    elif rec_event.type == RecommenderEventType.DONE:
                        iterations = rec_event.data.get("total_iterations", 1)
                    
                    elif rec_event.type == RecommenderEventType.ERROR:
                        logger.error(f"Recommender error: {rec_event.data.get('error')}")
                        fallback_message = "I had trouble searching. Please try again."
                
                # Optimize: Format and emit response immediately (no delay)
                if item_ids:
                    full_response = self._format_clothing_response(item_ids, message)
                    # Emit result and chunk together for faster response
                    yield StreamEvent(
                        type=StreamEventType.CLOTHING_RESULT,
                        content={
                            "item_ids": item_ids,
                            "count": len(item_ids),
                            "iterations": iterations,
                        },
                        node=NodeName.CLOTHING.value
                    )
                    # Send text response immediately
                    yield StreamEvent(
                        type=StreamEventType.CHUNK,
                        content=full_response,
                        node=NodeName.CLOTHING.value
                    )
                else:
                    full_response = fallback_message or "I couldn't find matching items."
                    yield StreamEvent(
                        type=StreamEventType.CHUNK,
                        content=full_response,
                        node=NodeName.CLOTHING.value
                    )
                
            else:  # General conversation - stream token by token
                # Optimize: Start streaming immediately, don't wait for status
                system_prompt = prompt_manager.get_template("general_conversation")
                
                # Send status and start streaming in parallel
                yield StreamEvent(
                    type=StreamEventType.STATUS,
                    content="Generating response...",
                    node=NodeName.GENERAL.value
                )
                
                # Stream response chunks immediately
                async for chunk in self.llm_service.stream_response(
                    message=message,
                    context=context,
                    system_prompt=system_prompt
                ):
                    full_response += chunk
                    yield StreamEvent(
                        type=StreamEventType.CHUNK,
                        content=chunk,
                        node=NodeName.GENERAL.value
                    )
            
            # Log completion
            self.langfuse.log_event(
                name=f"{final_route}_stream_complete",
                input_data={"message": message},
                output_data={"response_length": len(full_response)},
                trace_context=trace_context
            )
            
            # DONE event contains full response as fallback for frontend streaming errors
            yield StreamEvent(
                type=StreamEventType.DONE,
                content={
                    "session_id": session_id,
                    "route": final_route,
                    "full_response": full_response
                },
                node=NodeName.END.value
            )
        
        except Exception as e:
            logger.error(f"Error during streaming workflow: {e}", exc_info=True)
            yield StreamEvent(
                type=StreamEventType.ERROR,
                content={
                    "error": str(e),
                    "session_id": session_id,
                    "partial_response": full_response
                },
                node=NodeName.END.value
            )
