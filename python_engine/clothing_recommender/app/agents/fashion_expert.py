"""Fashion Expert agent for clothing-related queries."""
from typing import Dict, Any, Optional
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder

from app.core.logger import get_logger
from app.tools.commerce_search import create_commerce_search_tool

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
            # Create agent prompt that guides tool usage
            system_message = """You are a fashion expert assistant helping users find clothing products.

You have access to a commerce clothing search tool that searches available products for sale.
Use this tool when users ask about:
- Finding specific clothing items ("where can I find a yellow jacket?")
- Shopping recommendations ("what jeans should I buy?")
- Product discovery ("show me casual summer tops")
- Outfit suggestions with actual products

When making recommendations:
1. ALWAYS use the commerce_clothing_search tool to find actual products
2. Reference real items from the search results with their details (brand, color, image)
3. Provide specific, actionable shopping advice
4. If no products are found, suggest alternative search terms or categories
5. Be conversational, friendly, and fashion-forward

User context (if available): {context}"""
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", system_message),
                ("human", "{input}"),
                MessagesPlaceholder(variable_name="agent_scratchpad"),
            ])
            
            # Create agent with tools
            llm = self.llm_service.get_chat_model()
            agent = create_openai_functions_agent(llm, self.tools, prompt)
            agent_executor = AgentExecutor(
                agent=agent,
                tools=self.tools,
                verbose=True,
                max_iterations=3,
                handle_parsing_errors=True
            )
            
            # Execute agent
            result = await agent_executor.ainvoke({
                "input": query,
                "context": str(user_context) if user_context else "No additional context"
            })
            
            logger.info("FashionExpert completed with tool-based recommendation")
            return result["output"]
            
        except Exception as e:
            logger.error(f"Error in FashionExpert tool-enabled agent: {e}")
            # Fallback to dummy response
            return self._get_fallback_recommendation(query)
    
    def _get_fallback_recommendation(self, query: str) -> str:
        """Fallback recommendation when tools fail."""
        logger.warning("Using fallback recommendation (no tools)")
        return f"""I'd love to help you with '{query}'! 

However, I'm currently experiencing technical difficulties accessing our product catalog. 
Please try again in a moment, or rephrase your question to be more specific about what you're looking for.

For example:
- "Show me blue jeans"
- "Find casual summer tops"
- "What yellow jackets are available?"
"""

