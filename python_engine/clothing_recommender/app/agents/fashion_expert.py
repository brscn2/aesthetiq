"""Fashion Expert agent for clothing-related queries."""
from typing import Dict, Any, Optional
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from app.core.logger import get_logger
from app.tools.commerce_search import create_commerce_search_tool
from app.prompts.prompt_manager import PromptManager

logger = get_logger(__name__)


class FashionExpert:
    """
    Expert agent for fashion and clothing recommendations.
    
    Handles queries about:
    - Clothing recommendations (using commerce search tool)
    - Outfit suggestions
    - Style advice
    - Product discovery
    
    This agent has exclusive access to the commerce_clothing_search tool.
    """
    
    def __init__(self, llm_service=None):
        """Initialize the fashion expert agent with tools.
        
        Args:
            llm_service: LangChainService instance for LLM access
        """
        self.llm_service = llm_service
        self.prompt_manager = PromptManager()
        
        # Initialize tools (exclusive to FashionExpert)
        self.tools = [
            create_commerce_search_tool(),
        ]
        logger.info(f"FashionExpert initialized with {len(self.tools)} tools")
    
    async def get_clothing_recommendation(
        self,
        query: str,
        user_context: Dict[str, Any] = None
    ) -> str:
        """
        Get clothing recommendations based on user query.
        
        This method uses LangChain agent with commerce search tool to:
        1. Search available products in the database
        2. Provide personalized recommendations
        3. Include actual product links and details
        
        Args:
            query: User's clothing-related question
            user_context: Optional user context (color_season, face_shape, etc.)
            
        Returns:
            Natural language response with recommendations
        """
        logger.info(f"FashionExpert processing query with tools: {query[:50]}...")
        
        # If no LLM service, return error
        if not self.llm_service:
            logger.error("FashionExpert has no LLM service - cannot process query")
            return "I apologize, but I'm currently unable to process fashion queries. Please try again later."
        
        try:
            # Step 1: Use commerce search tool to find products
            commerce_tool = self.tools[0]  # commerce_clothing_search
            
            # Extract search query from user input
            # For simple queries like "I want yellow jacket", extract "yellow jacket"
            search_query = query.lower()
            for prefix in ["i want ", "i need ", "find me ", "show me ", "looking for "]:
                if search_query.startswith(prefix):
                    search_query = search_query[len(prefix):]
                    break
            
            logger.info(f"Searching products with query: {search_query}")
            
            # Call the tool using ainvoke (LangChain BaseTool method)
            tool_input = {"query": search_query, "limit": 5}
            tool_result = await commerce_tool.ainvoke(tool_input)
            
            logger.info(f"Tool result: {tool_result[:200]}...")
            
            # Step 2: Use LLM to format the response nicely
            system_prompt = self.prompt_manager.get_template(
                "fashion_expert_search",
                query=query,
                tool_result=tool_result
            )
            
            # Use LLM directly from service
            llm = self.llm_service.llm
            if not llm:
                return "I apologize, but I'm currently unable to process your request. LLM service is not configured."
            
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=query)
            ]
            
            response = await llm.ainvoke(messages)
            
            logger.info("FashionExpert completed with tool-based recommendation")
            return response.content
            
        except Exception as e:
            logger.error(f"Error in FashionExpert tool-enabled agent: {e}")
            return self._get_fallback_recommendation(query)
    
    def _get_fallback_recommendation(self, query: str) -> str:
        """Fallback recommendation when tools fail."""
        logger.warning("Using fallback recommendation (no tools)")
        return self.prompt_manager.get_template("fashion_expert_fallback", query=query)

