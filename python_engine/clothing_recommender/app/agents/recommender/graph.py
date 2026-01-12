"""Clothing Recommender LangGraph workflow.

This module defines the main recommender graph with verification loop.
"""
from typing import Optional, Any, AsyncIterator
from dataclasses import dataclass
from enum import Enum
from functools import partial

from langgraph.graph import StateGraph, END

from app.core.logger import get_logger
from app.core.config import get_settings
from app.agents.recommender.state import RecommenderState, RecommenderStage
from app.agents.recommender.nodes.query_analyzer import query_analyzer_node
from app.agents.recommender.nodes.profile_fetcher import profile_fetcher_node
from app.agents.recommender.nodes.clothing_search import clothing_search_node
from app.agents.recommender.nodes.verifier import verifier_node
from app.agents.recommender.nodes.response import response_node
from app.services.llm.langchain_service import LangChainService
from app.services.embedding_client import EmbeddingClient, get_embedding_client
from app.services.mongodb.wardrobe_repo import WardrobeRepository
from app.services.mongodb.profile_repo import ProfileRepository

logger = get_logger(__name__)
settings = get_settings()


class NodeName(str, Enum):
    """Node identifiers for the recommender graph."""
    ANALYZE = "analyze"
    FETCH_PROFILE = "fetch_profile"
    SEARCH = "search"
    VERIFY = "verify"
    RESPOND = "respond"


class StreamEventType(str, Enum):
    """Types of streaming events."""
    STAGE = "stage"
    RESULT = "result"
    DONE = "done"
    ERROR = "error"


@dataclass
class StreamEvent:
    """A streaming event from the recommender workflow."""
    type: StreamEventType
    data: dict[str, Any]
    
    def to_sse(self) -> str:
        """Format as Server-Sent Event."""
        import json
        return f"event: {self.type.value}\ndata: {json.dumps(self.data)}\n\n"


class RecommenderGraph:
    """
    LangGraph-based clothing recommender with verification loop.
    
    The graph follows this flow:
    1. ANALYZE: Extract filters and semantic query
    2. FETCH_PROFILE: (Optional) Get user style profile
    3. SEARCH: Vector search for clothing
    4. VERIFY: Validate results against query
    5. Loop back to ANALYZE if insufficient (max 3 iterations)
    6. RESPOND: Format final response
    """
    
    def __init__(
        self,
        llm_service: LangChainService,
        embedding_client: Optional[EmbeddingClient] = None,
        wardrobe_repo: Optional[WardrobeRepository] = None,
        profile_repo: Optional[ProfileRepository] = None,
    ):
        """
        Initialize recommender graph.
        
        Args:
            llm_service: LangChain service for LLM calls
            embedding_client: Client for embedding service
            wardrobe_repo: Repository for wardrobe queries
            profile_repo: Repository for profile queries
        """
        self.llm_service = llm_service
        self.embedding_client = embedding_client or get_embedding_client()
        self.wardrobe_repo = wardrobe_repo or WardrobeRepository()
        self.profile_repo = profile_repo or ProfileRepository()
        
        # Compile graph once
        self.graph = self._build_graph()
        logger.info("RecommenderGraph initialized")
    
    def _build_graph(self) -> StateGraph:
        """Build and compile the LangGraph workflow."""
        workflow = StateGraph(RecommenderState)
        
        # Add nodes with dependencies injected
        workflow.add_node(
            NodeName.ANALYZE.value,
            partial(query_analyzer_node, llm_service=self.llm_service)
        )
        
        workflow.add_node(
            NodeName.FETCH_PROFILE.value,
            partial(profile_fetcher_node, profile_repo=self.profile_repo)
        )
        
        workflow.add_node(
            NodeName.SEARCH.value,
            partial(
                clothing_search_node,
                embedding_client=self.embedding_client,
                wardrobe_repo=self.wardrobe_repo,
            )
        )
        
        workflow.add_node(
            NodeName.VERIFY.value,
            partial(verifier_node, llm_service=self.llm_service)
        )
        
        workflow.add_node(
            NodeName.RESPOND.value,
            response_node
        )
        
        # Set entry point
        workflow.set_entry_point(NodeName.ANALYZE.value)
        
        # Add edges
        # ANALYZE -> FETCH_PROFILE or SEARCH (conditional)
        workflow.add_conditional_edges(
            NodeName.ANALYZE.value,
            self._route_after_analyze,
            {
                NodeName.FETCH_PROFILE.value: NodeName.FETCH_PROFILE.value,
                NodeName.SEARCH.value: NodeName.SEARCH.value,
            }
        )
        
        # FETCH_PROFILE -> SEARCH
        workflow.add_edge(NodeName.FETCH_PROFILE.value, NodeName.SEARCH.value)
        
        # SEARCH -> VERIFY
        workflow.add_edge(NodeName.SEARCH.value, NodeName.VERIFY.value)
        
        # VERIFY -> RESPOND or ANALYZE (conditional loop)
        workflow.add_conditional_edges(
            NodeName.VERIFY.value,
            self._route_after_verify,
            {
                NodeName.RESPOND.value: NodeName.RESPOND.value,
                NodeName.ANALYZE.value: NodeName.ANALYZE.value,
            }
        )
        
        # RESPOND -> END
        workflow.add_edge(NodeName.RESPOND.value, END)
        
        compiled = workflow.compile()
        logger.info("Recommender graph compiled successfully")
        
        return compiled
    
    def _route_after_analyze(self, state: RecommenderState) -> str:
        """Route after query analysis: fetch profile or go to search."""
        needs_profile = state.get("needs_profile", False)
        user_profile = state.get("user_profile")
        
        # Only fetch profile on first iteration if needed
        if needs_profile and user_profile is None and state.get("iteration", 0) == 0:
            return NodeName.FETCH_PROFILE.value
        
        return NodeName.SEARCH.value
    
    def _route_after_verify(self, state: RecommenderState) -> str:
        """Route after verification: respond or retry search."""
        is_sufficient = state.get("is_sufficient", False)
        iteration = state.get("iteration", 0)
        max_iterations = settings.RECOMMENDER_MAX_ITERATIONS
        
        # Check if we should stop
        if is_sufficient:
            logger.info("Sufficient results found, proceeding to response")
            return NodeName.RESPOND.value
        
        if iteration >= max_iterations - 1:
            logger.info(f"Max iterations ({max_iterations}) reached, proceeding to response")
            return NodeName.RESPOND.value
        
        # Retry with incremented iteration
        logger.info(f"Insufficient results, retrying (iteration {iteration + 1})")
        return NodeName.ANALYZE.value
    
    def _create_initial_state(
        self,
        user_query: str,
        user_id: str,
        session_id: str,
    ) -> RecommenderState:
        """Create initial state for workflow execution."""
        return RecommenderState(
            user_id=user_id,
            user_query=user_query,
            session_id=session_id,
            filters={},
            semantic_query="",
            needs_profile=False,
            user_profile=None,
            search_results=[],
            valid_item_ids=[],
            is_sufficient=False,
            refinement_suggestions=None,
            iteration=0,
            current_stage=RecommenderStage.ANALYZING,
            stage_metadata={},
            error=None,
            response_item_ids=[],
            response_message=None,
        )
    
    async def recommend(
        self,
        user_query: str,
        user_id: str,
        session_id: str,
    ) -> dict[str, Any]:
        """
        Execute recommendation workflow (non-streaming).
        
        Args:
            user_query: User's clothing request
            user_id: User identifier
            session_id: Session identifier
            
        Returns:
            Dict with item_ids, message, iterations, metadata
        """
        initial_state = self._create_initial_state(user_query, user_id, session_id)
        
        logger.info(f"Starting recommendation: query='{user_query[:50]}...', user={user_id}")
        
        try:
            # Execute graph
            final_state = await self.graph.ainvoke(initial_state)
            
            return {
                "item_ids": final_state.get("response_item_ids", []),
                "message": final_state.get("response_message"),
                "session_id": session_id,
                "iterations": final_state.get("iteration", 0) + 1,
                "metadata": final_state.get("stage_metadata", {}),
            }
            
        except Exception as e:
            logger.error(f"Recommendation failed: {e}", exc_info=True)
            return {
                "item_ids": [],
                "message": f"Recommendation failed: {str(e)}",
                "session_id": session_id,
                "iterations": 0,
                "metadata": {"error": str(e)},
            }
    
    async def recommend_stream(
        self,
        user_query: str,
        user_id: str,
        session_id: str,
    ) -> AsyncIterator[StreamEvent]:
        """
        Execute recommendation workflow with streaming progress.
        
        Yields SSE events for each stage of the workflow.
        
        Args:
            user_query: User's clothing request
            user_id: User identifier
            session_id: Session identifier
            
        Yields:
            StreamEvent objects for SSE
        """
        initial_state = self._create_initial_state(user_query, user_id, session_id)
        
        logger.info(f"Starting streaming recommendation: query='{user_query[:50]}...'")
        
        try:
            # Track state through streaming
            current_iteration = 0
            
            async for event in self.graph.astream(initial_state):
                # event is a dict with node name as key
                for node_name, node_output in event.items():
                    if isinstance(node_output, dict):
                        stage = node_output.get("current_stage")
                        metadata = node_output.get("stage_metadata", {})
                        
                        # Track iteration
                        if "iteration" in metadata:
                            current_iteration = metadata["iteration"]
                        
                        # Emit stage event
                        if stage:
                            yield StreamEvent(
                                type=StreamEventType.STAGE,
                                data={
                                    "stage": stage.value if hasattr(stage, "value") else str(stage),
                                    "node": node_name,
                                    "iteration": current_iteration + 1,
                                    **metadata,
                                }
                            )
                        
                        # Check for final response
                        if node_name == NodeName.RESPOND.value:
                            item_ids = node_output.get("response_item_ids", [])
                            message = node_output.get("response_message")
                            
                            yield StreamEvent(
                                type=StreamEventType.RESULT,
                                data={
                                    "item_ids": item_ids,
                                    "message": message,
                                    "count": len(item_ids),
                                }
                            )
            
            # Final done event
            yield StreamEvent(
                type=StreamEventType.DONE,
                data={
                    "success": True,
                    "session_id": session_id,
                    "total_iterations": current_iteration + 1,
                }
            )
            
        except Exception as e:
            logger.error(f"Streaming recommendation failed: {e}", exc_info=True)
            yield StreamEvent(
                type=StreamEventType.ERROR,
                data={
                    "error": str(e),
                    "session_id": session_id,
                }
            )
