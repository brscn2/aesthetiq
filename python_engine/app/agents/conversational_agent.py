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
    
    Features:
        - Multi-turn conversations with memory
        - Context-aware responses
        - Intelligent intent classification
        - Fashion expert integration
        - Conversation history tracking
        - Observable with Langfuse
    """
    
    def __init__(self):
        """Initialize the conversational agent."""
        self.llm_service = LangChainService(
            provider=settings.LLM_PROVIDER,
            model=settings.LLM_MODEL
        )
        self.langgraph_service = LangGraphService(self.llm_service)
        self.observability = LangfuseService()
        
        logger.info("ConversationalAgent initialized with LangGraph workflow")
    
    async def process_message(
        self,
        message: str,
        user_id: str,
        session_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process a user message and generate a response.
        
        Args:
            message: User's input message
            user_id: Unique user identifier
            session_id: Optional session/conversation identifier
            context: Optional additional context (user preferences, history, etc.)
            
        Returns:
            Dictionary containing:
                - message: Agent's response
                - session_id: Session identifier
                - metadata: Additional metadata (tokens used, latency, etc.)
        """
        try:
            # Generate or use existing session ID
            if not session_id:
                session_id = f"{user_id}_{datetime.now(timezone.utc).timestamp()}"
            
            logger.info(
                f"Processing message for user {user_id}",
                extra={"session_id": session_id}
            )
            
            # Start Langfuse trace
            trace_context = self.observability.start_trace(
                name="conversation",
                user_id=user_id,
                session_id=session_id,
                metadata={"message_length": len(message)}
            )
            
            # Process through LangGraph workflow (intelligent routing)
            result = await self.langgraph_service.process_message(
                message=message,
                user_id=user_id,
                session_id=session_id,
                context=context or {},
                trace_context=trace_context
            )
            
            # End trace
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
        session_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> AsyncIterator[StreamEvent]:
        """
        Stream a response to a user message with progress updates.
        
        Yields StreamEvents for real-time updates including:
        - Status updates (workflow progress)
        - Text chunks (streaming LLM responses)
        - Clothing items (individual recommendations)
        - Done event (completion)
        
        Args:
            message: User's input message
            user_id: Unique user identifier
            session_id: Optional session identifier
            context: Optional additional context
            
        Yields:
            StreamEvent objects with type, content, and node info
        """
        try:
            # Generate session ID if not provided
            if not session_id:
                session_id = f"{user_id}_{datetime.now(timezone.utc).timestamp()}"
            
            logger.info(
                f"Streaming message for user {user_id}",
                extra={"session_id": session_id}
            )
            
            # Start Langfuse trace
            trace_context = self.observability.start_trace(
                name="conversation_stream",
                user_id=user_id,
                session_id=session_id,
                metadata={"message_length": len(message), "streaming": True}
            )
            
            # Stream through LangGraph workflow
            async for event in self.langgraph_service.stream_message(
                message=message,
                user_id=user_id,
                session_id=session_id,
                context=context or {},
                trace_context=trace_context
            ):
                yield event
            
            # End trace
            self.observability.end_trace(
                trace_context=trace_context,
                output="streaming_complete"
            )
            
            logger.info("Streaming completed successfully")
            
        except Exception as e:
            logger.error(f"Error streaming message: {str(e)}", exc_info=True)
            raise
