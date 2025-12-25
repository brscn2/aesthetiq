"""Conversational agent implementation using LangGraph and LangChain."""
from typing import Optional, Dict, Any, List, AsyncIterator
from datetime import datetime, timezone

from app.core.logger import get_logger
from app.core.config import get_settings
from app.services.llm.langchain_service import LangChainService
from app.services.llm.langgraph_service import LangGraphService, StreamEvent
from app.services.llm.langfuse_service import LangfuseService

logger = get_logger(__name__)
settings = get_settings()


class ConversationalAgent:
    """
    Main conversational agent for handling user interactions.
    
    Uses LangGraph for workflow orchestration with intelligent routing:
    - Fashion queries → FashionExpert agent (clothing recommendations)
    - General queries → Standard LLM conversation
    """
    
    def __init__(
        self,
        llm_service: Optional[LangChainService] = None,
        langgraph_service: Optional[LangGraphService] = None,
        observability: Optional[LangfuseService] = None,
    ):
        """Initialize the conversational agent.

        Reasoning:
        - In production we want a single, long-lived instance per process.
          That avoids duplicate LLM clients and repeated workflow compilation.
        - For tests, injecting mocks keeps unit tests fast and deterministic.
        """
        self.llm_service = llm_service or LangChainService(
            provider=settings.LLM_PROVIDER,
            model=settings.LLM_MODEL,
        )
        self.langgraph_service = langgraph_service or LangGraphService(self.llm_service)
        self.observability = observability or LangfuseService()
        
        logger.info("ConversationalAgent initialized with LangGraph workflow")
    
    def _start_execution(self, name: str, user_id: str, session_id: str, message: str, **kwargs):
        """Helper to start execution tracing and logging."""
        logger.info(
            f"Starting {name} for user {user_id}",
            extra={"session_id": session_id}
        )
        
        return self.observability.start_trace(
            name=name,
            user_id=user_id,
            session_id=session_id,
            metadata={"message_length": len(message), **kwargs}
        )

    async def process_message(
        self,
        message: str,
        user_id: str,
        session_id: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process a user message and generate a response.
        
        Args:
            message: User's input message
            user_id: Unique user identifier
            session_id: Session/conversation identifier
            context: Optional additional context
            
        Returns:
            Dictionary containing response and metadata
        """
        try:
            if not session_id:
                raise ValueError("session_id is required")

            trace_context = self._start_execution(
                name="conversation",
                user_id=user_id,
                session_id=session_id,
                message=message
            )
            
            result = await self.langgraph_service.process_message(
                message=message,
                user_id=user_id,
                session_id=session_id,
                context=context or {},
                trace_context=trace_context
            )
            
            self.observability.end_trace(
                trace_context=trace_context,
                output=result["message"],
                metadata={"route": result["metadata"].get("intent_classification")}
            )
            
            logger.info(f"Message processed successfully via {result['metadata'].get('agent_used', 'unknown')}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}", exc_info=True)
            raise
    
    async def stream_message(
        self,
        message: str,
        user_id: str,
        session_id: str,
        context: Optional[Dict[str, Any]] = None
    ) -> AsyncIterator[StreamEvent]:
        """
        Stream a response to a user message with progress updates.
        
        Args:
            message: User's input message
            user_id: Unique user identifier
            session_id: Session identifier
            context: Optional additional context
            
        Yields:
            StreamEvent objects with type, content, and node info
        """
        try:
            if not session_id:
                raise ValueError("session_id is required")

            trace_context = self._start_execution(
                name="conversation_stream",
                user_id=user_id,
                session_id=session_id,
                message=message,
                streaming=True
            )
            
            async for event in self.langgraph_service.stream_message(
                message=message,
                user_id=user_id,
                session_id=session_id,
                context=context or {},
                trace_context=trace_context
            ):
                yield event
            
            self.observability.end_trace(
                trace_context=trace_context,
                output="streaming_complete"
            )
            
            logger.info("Streaming completed successfully")
            
        except Exception as e:
            logger.error(f"Error streaming message: {str(e)}", exc_info=True)
            raise
