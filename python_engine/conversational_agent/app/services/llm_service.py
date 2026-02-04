"""LLM service for agent interactions.

This module provides a reusable LLM service that all agents use for:
- Chat completions with OpenAI models
- Structured output with Pydantic models
- Langfuse tracing integration
"""
from typing import Any, Dict, List, Optional, Type, TypeVar
from pydantic import BaseModel

from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser

from app.core.config import get_settings
from app.core.logger import get_logger

logger = get_logger(__name__)

# Type variable for structured output
T = TypeVar("T", bound=BaseModel)


class LLMService:
    """
    Service for LLM interactions with OpenAI.
    
    Provides methods for:
    - Simple chat completions
    - Structured output with Pydantic models
    - Conversation with history
    """
    
    def __init__(
        self,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
    ):
        """
        Initialize the LLM service.
        
        Args:
            model: OpenAI model name (defaults to settings)
            temperature: Sampling temperature (defaults to settings)
        """
        self.settings = get_settings()
        self.model = model or self.settings.OPENAI_MODEL
        self.temperature = temperature if temperature is not None else self.settings.OPENAI_TEMPERATURE

        self._llm: Optional[ChatOpenAI] = None
        self._vision_llm: Optional[ChatOpenAI] = None
        self._init_llm()
        self._init_vision_llm()
    
    def _init_llm(self) -> None:
        """Initialize the ChatOpenAI instance."""
        if not self.settings.OPENAI_API_KEY:
            logger.warning("OPENAI_API_KEY not configured. LLM service will not work.")
            return
        
        try:
            self._llm = ChatOpenAI(
                model=self.model,
                temperature=self.temperature,
                api_key=self.settings.OPENAI_API_KEY,
            )
            logger.info(f"LLM service initialized with model: {self.model}")
        except Exception as e:
            logger.error(f"Failed to initialize LLM: {e}")
            raise

    def _init_vision_llm(self) -> None:
        """Initialize the vision-capable LLM (for messages with images)."""
        if not self.settings.OPENAI_API_KEY:
            return
        try:
            vision_model = getattr(
                self.settings, "OPENAI_VISION_MODEL", "gpt-4o-mini"
            )
            self._vision_llm = ChatOpenAI(
                model=vision_model,
                temperature=self.temperature,
                api_key=self.settings.OPENAI_API_KEY,
            )
            logger.info(f"Vision LLM initialized with model: {vision_model}")
        except Exception as e:
            logger.warning(f"Failed to initialize vision LLM: {e}")
            self._vision_llm = None
    
    @property
    def llm(self) -> ChatOpenAI:
        """Get the ChatOpenAI instance."""
        if self._llm is None:
            raise RuntimeError("LLM not initialized. Check OPENAI_API_KEY.")
        return self._llm

    @property
    def vision_llm(self) -> ChatOpenAI:
        """Get the vision-capable LLM (for image inputs). Falls back to llm if not set."""
        if self._vision_llm is not None:
            return self._vision_llm
        return self.llm
    
    async def chat(
        self,
        messages: List[BaseMessage],
    ) -> str:
        """
        Send a chat completion request.
        
        Args:
            messages: List of messages (SystemMessage, HumanMessage, AIMessage)
            
        Returns:
            The assistant's response text
        """
        response = await self.llm.ainvoke(messages)
        return response.content
    
    async def chat_with_history(
        self,
        system_prompt: str,
        user_message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        """
        Send a chat completion with conversation history.
        
        Args:
            system_prompt: The system prompt
            user_message: The current user message
            conversation_history: Previous messages [{"role": "user"|"assistant", "content": "..."}]
            
        Returns:
            The assistant's response text
        """
        messages: List[BaseMessage] = [SystemMessage(content=system_prompt)]
        
        # Add conversation history
        if conversation_history:
            for msg in conversation_history:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if role == "user":
                    messages.append(HumanMessage(content=content))
                elif role == "assistant":
                    messages.append(AIMessage(content=content))
        
        # Add current user message
        messages.append(HumanMessage(content=user_message))
        
        return await self.chat(messages)
    
    async def structured_output(
        self,
        messages: List[BaseMessage],
        output_schema: Type[T],
    ) -> T:
        """
        Get structured output from the LLM.
        
        Args:
            messages: List of messages
            output_schema: Pydantic model class for the output
            
        Returns:
            Parsed output as the specified Pydantic model
        """
        # Use with_structured_output for cleaner structured responses
        structured_llm = self.llm.with_structured_output(output_schema)
        result = await structured_llm.ainvoke(messages)
        return result
    
    async def structured_chat(
        self,
        system_prompt: str,
        user_message: str,
        output_schema: Type[T],
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> T:
        """
        Get structured output with conversation history.
        
        Args:
            system_prompt: The system prompt
            user_message: The current user message
            output_schema: Pydantic model class for the output
            conversation_history: Previous messages
            
        Returns:
            Parsed output as the specified Pydantic model
        """
        messages: List[BaseMessage] = [SystemMessage(content=system_prompt)]
        
        # Add conversation history
        if conversation_history:
            for msg in conversation_history:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if role == "user":
                    messages.append(HumanMessage(content=content))
                elif role == "assistant":
                    messages.append(AIMessage(content=content))
        
        # Add current user message
        messages.append(HumanMessage(content=user_message))
        
        return await self.structured_output(messages, output_schema)


# Global LLM service instance
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """Get the global LLM service instance."""
    global _llm_service
    
    if _llm_service is None:
        _llm_service = LLMService()
    
    return _llm_service
