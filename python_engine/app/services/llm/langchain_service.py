"""LangChain service for LLM interactions."""
from typing import Optional, Dict, Any, AsyncIterator
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

from app.core.config import get_settings
from app.core.logger import get_logger
from app.prompts import get_prompt_manager
from app.utils.helpers import format_conversation_history

logger = get_logger(__name__)
settings = get_settings()


class LangChainService:
    """
    Service for managing LangChain LLM interactions.
    
    Supports multiple LLM providers:
        - OpenAI (GPT-4, GPT-3.5)
        - Azure OpenAI
    """
    
    def __init__(self, provider: str = "openai", model: str = "gpt-4.1"):
        """
        Initialize LangChain service with specified provider.
        
        Args:
            provider: LLM provider ("openai", "azure")
            model: Model name to use
        """
        self.provider = provider
        self.model = model
        self.llm = self._initialize_llm()
        
        logger.info(f"LangChainService initialized with {provider}/{model}")
    
    def _initialize_llm(self):
        """
        Initialize the LLM based on provider configuration.
        
        Returns:
            LangChain chat model instance
        """
        if self.provider == "openai":
            if not settings.OPENAI_API_KEY:
                logger.warning("OPENAI_API_KEY not set, using mock responses")
                return None
            
            return ChatOpenAI(
                model=self.model,
                api_key=settings.OPENAI_API_KEY,
                temperature=0.7,
            )

        elif self.provider == "azure":
            if not settings.AZURE_OPENAI_API_KEY:
                logger.warning("AZURE_OPENAI_API_KEY not set, using mock responses")
                return None
            
            # TODO: Configure Azure OpenAI
            # from langchain_openai import AzureChatOpenAI
            # return AzureChatOpenAI(...)
            raise NotImplementedError("Azure OpenAI not yet configured")
        
        else:
            raise ValueError(f"Unknown provider: {self.provider}")
    
    async def generate_response(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        system_prompt: Optional[str] = None,
        template_name: Optional[str] = None,
        template_vars: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate a response to a user message.
        
        Args:
            message: User message
            context: Optional context dictionary (history, preferences, etc.)
            system_prompt: Optional custom system prompt (overrides template)
            template_name: Name of prompt template to use (e.g., "style_advisor")
            template_vars: Variables to substitute in template
            
        Returns:
            Generated response text
        """
        if not self.llm:
            # Return mock response if LLM not configured
            logger.warning("LLM not configured, returning mock response")
            return "This is a mock response. Please configure your LLM API keys."
        
        try:
            # Build messages
            messages = []
            
            # Add system prompt (priority: custom > template > default)
            prompt_manager = get_prompt_manager()
            if system_prompt:
                messages.append(SystemMessage(content=system_prompt))
            elif template_name:
                try:
                    prompt = prompt_manager.get_template(template_name, **(template_vars or {}))
                    messages.append(SystemMessage(content=prompt))
                except (FileNotFoundError, ValueError) as e:
                    logger.warning(f"Failed to load template {template_name}: {e}, using default")
                    messages.append(SystemMessage(content=prompt_manager.get_template("system_default")))
            else:
                # Use default system prompt
                messages.append(SystemMessage(content=prompt_manager.get_template("system_default")))
            
            # Add conversation history from context if available (formatted and limited)
            if context and "history" in context:
                formatted_history = format_conversation_history(context["history"])
                for hist_msg in formatted_history:
                    if hist_msg["role"] == "user":
                        messages.append(HumanMessage(content=hist_msg["content"]))
                    elif hist_msg["role"] == "assistant":
                        messages.append(AIMessage(content=hist_msg["content"]))
            
            # Add current message
            messages.append(HumanMessage(content=message))
            
            # Generate response
            response = await self.llm.ainvoke(messages)
            
            return response.content
            
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}", exc_info=True)
            raise
    
    async def stream_response(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        system_prompt: Optional[str] = None
    ) -> AsyncIterator[str]:
        """
        Stream a response to a user message.
        
        Args:
            message: User message
            context: Optional context dictionary (history, preferences, etc.)
            system_prompt: Optional custom system prompt
            
        Yields:
            Response chunks as they are generated
        """
        if not self.llm:
            yield "Mock streaming response. Configure LLM API keys."
            return
        
        try:
            # Build messages (same as generate_response)
            prompt_manager = get_prompt_manager()
            messages = []
            
            if system_prompt:
                messages.append(SystemMessage(content=system_prompt))
            else:
                messages.append(SystemMessage(
                    content=prompt_manager.get_template("system_default")
                ))
            
            # Add conversation history from context if available (formatted and limited)
            if context and "history" in context:
                formatted_history = format_conversation_history(context["history"])
                for hist_msg in formatted_history:
                    if hist_msg["role"] == "user":
                        messages.append(HumanMessage(content=hist_msg["content"]))
                    elif hist_msg["role"] == "assistant":
                        messages.append(AIMessage(content=hist_msg["content"]))
            
            # Add current message
            messages.append(HumanMessage(content=message))
            
            # Stream response
            async for chunk in self.llm.astream(messages):
                yield chunk.content
                
        except Exception as e:
            logger.error(f"Error streaming response: {str(e)}", exc_info=True)
            raise
