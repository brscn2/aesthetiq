"""Test FashionExpert agent with commerce search tool."""
import os
import sys
import asyncio
from pathlib import Path

# Load .env from python_engine directory FIRST
env_path = Path(__file__).parent.parent.parent / ".env"
from dotenv import load_dotenv
load_dotenv(env_path)

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.agents.fashion_expert import FashionExpert
from app.services.llm.langchain_service import LangChainService


async def test_fashion_expert():
    """Test the FashionExpert agent with tool usage."""
    print("=" * 60)
    print("Testing FashionExpert Agent with Commerce Search Tool")
    print("=" * 60)
    
    # Initialize LLM service
    llm_service = LangChainService()
    
    # Initialize FashionExpert
    fashion_expert = FashionExpert(llm_service=llm_service)
    
    # Test queries
    test_queries = [
        "I want yellow jacket",
        "Find me blue jeans",
        "Show me casual tops",
    ]
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n{'=' * 60}")
        print(f"Test {i}: {query}")
        print("=" * 60)
        
        try:
            response = await fashion_expert.get_clothing_recommendation(
                query=query,
                user_context={}
            )
            print(f"\nResponse:\n{response}")
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "=" * 60)
    print("Test completed!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_fashion_expert())
