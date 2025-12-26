"""Test script for commerce clothing search tool.

This script tests the commerce search functionality without running the full agent.
Useful for debugging and validation.

Usage:
    python scripts/test_commerce_search.py
"""
import os
import sys
import asyncio
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.tools.commerce_search import CommerceClothingSearchTool
from dotenv import load_dotenv
import aiohttp

load_dotenv()


async def test_search():
    """Test the commerce clothing search tool."""
    print("=" * 60)
    print("Testing Commerce Clothing Search Tool")
    print("=" * 60)
    
    # Check embedding service health
    embedding_url = os.getenv("EMBEDDING_SERVICE_URL", "http://localhost:8004")
    print(f"Embedding service URL: {embedding_url}")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{embedding_url}/health") as response:
                if response.status == 200:
                    health = await response.json()
                    print(f"✅ Embedding service is healthy")
                    print(f"   Device: {health.get('device')}")
                    print(f"   CUDA: {health.get('cuda_available')}")
                else:
                    print(f"❌ Embedding service not healthy")
                    return
    except Exception as e:
        print(f"❌ Cannot connect to embedding service: {e}")
        print(f"   Make sure service is running: docker-compose up embedding_service")
        return
    
    print()
    
    # Initialize the commerce search tool
    tool = CommerceClothingSearchTool()
    
    # Test queries
    test_queries = [
        {"query": "blue jeans", "category": None, "limit": 3},
        {"query": "white sneakers", "category": None, "limit": 2},
        {"query": "sunglasses", "category": None, "limit": 2},
        {"query": "something yellow to wear for winter", "category": None, "limit": 2},
        {"query": "yellow jacket", "category": None, "limit": 2},
    ]
    
    for i, test in enumerate(test_queries, 1):
        print(f"\n{'─' * 60}")
        print(f"Test {i}: Query = '{test['query']}'")
        if test['category']:
            print(f"       Category filter = {test['category']}")
        print(f"{'─' * 60}")
        
        try:
            result = await tool._arun(**test)
            print(result)
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "=" * 60)
    print("Test completed!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_search())
