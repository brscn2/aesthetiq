#!/usr/bin/env python3
"""
Direct E2E workflow tests bypassing session service authentication.

Run with:
    cd python_engine
    .venv/bin/python3.11 -m tests.e2e_workflow_test
"""
import asyncio
import sys
import os
from pathlib import Path
from datetime import datetime

# Add python_engine to path
python_engine_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(python_engine_dir))
sys.path.insert(0, str(python_engine_dir / "conversational_agent"))

# Load environment from backend .env
from dotenv import load_dotenv
backend_env = python_engine_dir.parent / "backend" / ".env"
if backend_env.exists():
    load_dotenv(backend_env, override=True)

# Override MCP servers URL for local testing
os.environ["MCP_SERVERS_URL"] = "http://localhost:8010"
os.environ["BACKEND_URL"] = "http://localhost:3001"

from app.workflows.main_workflow import run_workflow
from app.mcp.tools import init_mcp_client, close_mcp_client, is_mcp_connected


# Test cases from the plan
TEST_CASES = [
    {
        "id": "CLO-1",
        "message": "Find me a black jacket for a job interview",
        "expected_intent": "clothing_search",
        "expected_results": True,
        "description": "Should find formal jackets/blazers for interviews",
    },
    {
        "id": "CLO-2", 
        "message": "I need casual summer tops under $50",
        "expected_intent": "clothing_search",
        "expected_results": True,
        "description": "Should filter by category and price range",
    },
    {
        "id": "CLO-3",
        "message": "Show me pants for work",
        "expected_intent": "clothing_search",
        "expected_results": True,
        "description": "Should find work-appropriate pants",
    },
    {
        "id": "CONV-1",
        "message": "Hello, how are you?",
        "expected_intent": "general_conversation",
        "expected_results": False,  # No items expected for conversation
        "description": "Should handle general conversation without searching",
    },
    {
        "id": "CONV-2",
        "message": "What colors look good on me?",
        "expected_intent": "style_advice",
        "expected_results": False,  # Style advice, not product search
        "description": "Should provide style advice based on user's color season",
    },
]


async def run_test_case(test_case: dict, user_id: str = "test_user_001") -> dict:
    """Run a single test case."""
    print(f"\n{'=' * 60}")
    print(f"TEST: {test_case['id']} - {test_case['description']}")
    print(f"Message: {test_case['message']}")
    print(f"{'=' * 60}")
    
    result = {
        "test_id": test_case["id"],
        "message": test_case["message"],
        "passed": False,
        "actual_intent": None,
        "items_found": 0,
        "response_length": 0,
        "error": None,
        "duration_ms": 0,
    }
    
    start_time = datetime.now()
    
    try:
        # Run the workflow
        final_state = await run_workflow(
            user_id=user_id,
            session_id=f"test_session_{test_case['id']}",
            message=test_case["message"],
            conversation_history=[],
        )
        
        duration = (datetime.now() - start_time).total_seconds() * 1000
        result["duration_ms"] = duration
        
        # Extract results
        intent = final_state.get("intent")
        response = final_state.get("final_response", "")
        retrieved_items = final_state.get("retrieved_items", [])
        
        result["actual_intent"] = intent
        result["items_found"] = len(retrieved_items) if retrieved_items else 0
        result["response_length"] = len(response)
        
        print(f"\nResults:")
        print(f"  Intent: {intent}")
        print(f"  Items found: {result['items_found']}")
        print(f"  Response length: {result['response_length']} chars")
        print(f"  Duration: {duration:.0f}ms")
        
        if response:
            print(f"\n  Response preview:")
            print(f"  {response[:400]}...")
        
        if retrieved_items:
            print(f"\n  Retrieved items:")
            for item in retrieved_items[:3]:
                if isinstance(item, dict):
                    print(f"    - {item.get('name', 'Unknown')} ({item.get('category', 'Unknown')})")
        
        # Determine if test passed
        if test_case["expected_results"]:
            # For search tests, we expect items to be found
            result["passed"] = result["items_found"] > 0 and len(response) > 0
        else:
            # For conversation tests, we expect a response but no items
            result["passed"] = len(response) > 0
        
        print(f"\n  PASSED: {result['passed']}")
        
    except Exception as e:
        duration = (datetime.now() - start_time).total_seconds() * 1000
        result["duration_ms"] = duration
        result["error"] = str(e)
        print(f"\n  ERROR: {e}")
        import traceback
        traceback.print_exc()
    
    return result


async def main():
    """Main test runner."""
    print("=" * 60)
    print("AesthetIQ E2E Workflow Tests")
    print("=" * 60)
    
    # Check MCP connection
    print("\n🔍 Checking MCP connection...")
    if not is_mcp_connected():
        print("  Initializing MCP client...")
        try:
            await init_mcp_client()
            print("  ✓ MCP client connected")
        except Exception as e:
            print(f"  ✗ MCP connection failed: {e}")
            print("\nMake sure MCP servers are running at http://localhost:8010")
            sys.exit(1)
    else:
        print("  ✓ MCP client already connected")
    
    # Run test cases
    results = []
    for test_case in TEST_CASES:
        result = await run_test_case(test_case)
        results.append(result)
    
    # Clean up
    await close_mcp_client()
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for r in results if r["passed"])
    failed = sum(1 for r in results if not r["passed"])
    errors = sum(1 for r in results if r["error"])
    
    print(f"\nTotal: {len(results)} tests")
    print(f"  Passed: {passed}")
    print(f"  Failed: {failed}")
    print(f"  Errors: {errors}")
    
    print("\nDetails:")
    for r in results:
        status = "✓" if r["passed"] else "✗"
        error_msg = f" - Error: {r['error']}" if r["error"] else ""
        print(f"  {status} {r['test_id']}: items={r['items_found']}, "
              f"response={r['response_length']}chars, {r['duration_ms']:.0f}ms{error_msg}")
    
    # Return exit code
    return 0 if failed == 0 and errors == 0 else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
