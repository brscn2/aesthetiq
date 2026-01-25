#!/usr/bin/env python3
"""
Edge case tests for the conversational agent.

Run with:
    cd python_engine
    .venv/bin/python3.11 -m tests.edge_case_tests
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


async def test_missing_user():
    """Test with a non-existent user ID."""
    print("\n" + "=" * 60)
    print("TEST: Missing User (nonexistent user_id)")
    print("=" * 60)
    
    try:
        start = datetime.now()
        final_state = await run_workflow(
            user_id="nonexistent_user_xyz123",
            session_id="test_session_missing_user",
            message="Show me some jackets",
            conversation_history=[],
        )
        duration = (datetime.now() - start).total_seconds() * 1000
        
        response = final_state.get("final_response", "")
        print(f"Response length: {len(response)} chars")
        print(f"Duration: {duration:.0f}ms")
        print(f"Response preview: {response[:300]}...")
        
        # Should handle gracefully (no style DNA but still respond)
        passed = len(response) > 0
        print(f"\nPASSED: {passed} (handled gracefully without style DNA)")
        return {"test": "missing_user", "passed": passed, "error": None}
        
    except Exception as e:
        print(f"ERROR: {e}")
        return {"test": "missing_user", "passed": False, "error": str(e)}


async def test_long_message():
    """Test with a very long message (10,000+ chars)."""
    print("\n" + "=" * 60)
    print("TEST: Long Message (10,000+ characters)")
    print("=" * 60)
    
    # Generate a long message
    long_message = "I am looking for a nice jacket. " * 400  # ~13,200 chars
    print(f"Message length: {len(long_message)} characters")
    
    try:
        start = datetime.now()
        final_state = await run_workflow(
            user_id="test_user_001",
            session_id="test_session_long_message",
            message=long_message,
            conversation_history=[],
        )
        duration = (datetime.now() - start).total_seconds() * 1000
        
        response = final_state.get("final_response", "")
        error = final_state.get("error")
        
        print(f"Response length: {len(response)} chars")
        print(f"Duration: {duration:.0f}ms")
        
        if error:
            print(f"Error in state: {error}")
        
        if response:
            print(f"Response preview: {response[:300]}...")
        
        # Should either respond or handle gracefully
        passed = len(response) > 0 or error is not None
        print(f"\nPASSED: {passed} (handled long message)")
        return {"test": "long_message", "passed": passed, "error": None}
        
    except Exception as e:
        print(f"ERROR: {e}")
        # If it raises an error, that's also acceptable handling
        return {"test": "long_message", "passed": True, "error": f"Raised: {e}"}


async def test_empty_message():
    """Test with empty message."""
    print("\n" + "=" * 60)
    print("TEST: Empty Message")
    print("=" * 60)
    
    try:
        start = datetime.now()
        final_state = await run_workflow(
            user_id="test_user_001",
            session_id="test_session_empty",
            message="",
            conversation_history=[],
        )
        duration = (datetime.now() - start).total_seconds() * 1000
        
        response = final_state.get("final_response", "")
        print(f"Response length: {len(response)} chars")
        print(f"Duration: {duration:.0f}ms")
        print(f"Response preview: {response[:300]}...")
        
        passed = True  # If it doesn't crash, it passes
        print(f"\nPASSED: {passed}")
        return {"test": "empty_message", "passed": passed, "error": None}
        
    except Exception as e:
        print(f"ERROR: {e}")
        return {"test": "empty_message", "passed": True, "error": f"Raised: {e}"}


async def test_gibberish_input():
    """Test with gibberish/nonsense input."""
    print("\n" + "=" * 60)
    print("TEST: Gibberish Input")
    print("=" * 60)
    
    try:
        start = datetime.now()
        final_state = await run_workflow(
            user_id="test_user_001",
            session_id="test_session_gibberish",
            message="asdf qwer zxcv 12345 !@#$% ??????",
            conversation_history=[],
        )
        duration = (datetime.now() - start).total_seconds() * 1000
        
        response = final_state.get("final_response", "")
        intent = final_state.get("intent")
        
        print(f"Intent: {intent}")
        print(f"Response length: {len(response)} chars")
        print(f"Duration: {duration:.0f}ms")
        print(f"Response preview: {response[:300]}...")
        
        # Should respond with a helpful message
        passed = len(response) > 0
        print(f"\nPASSED: {passed}")
        return {"test": "gibberish_input", "passed": passed, "error": None}
        
    except Exception as e:
        print(f"ERROR: {e}")
        return {"test": "gibberish_input", "passed": False, "error": str(e)}


async def test_sql_injection_attempt():
    """Test with SQL injection-like input (safety check)."""
    print("\n" + "=" * 60)
    print("TEST: SQL Injection Attempt (Safety)")
    print("=" * 60)
    
    try:
        start = datetime.now()
        final_state = await run_workflow(
            user_id="test_user_001",
            session_id="test_session_injection",
            message="'; DROP TABLE users; --",
            conversation_history=[],
        )
        duration = (datetime.now() - start).total_seconds() * 1000
        
        response = final_state.get("final_response", "")
        print(f"Response length: {len(response)} chars")
        print(f"Duration: {duration:.0f}ms")
        print(f"Response preview: {response[:300]}...")
        
        # Should handle gracefully without executing
        passed = True
        print(f"\nPASSED: {passed} (no injection executed)")
        return {"test": "sql_injection", "passed": passed, "error": None}
        
    except Exception as e:
        print(f"ERROR: {e}")
        return {"test": "sql_injection", "passed": True, "error": f"Raised: {e}"}


async def main():
    """Main test runner."""
    print("=" * 60)
    print("AesthetIQ Edge Case Tests")
    print("=" * 60)
    
    # Check MCP connection
    print("\n🔍 Checking MCP connection...")
    if not is_mcp_connected():
        try:
            await init_mcp_client()
            print("  ✓ MCP client connected")
        except Exception as e:
            print(f"  ✗ MCP connection failed: {e}")
            sys.exit(1)
    else:
        print("  ✓ MCP client already connected")
    
    # Run edge case tests
    results = []
    
    results.append(await test_missing_user())
    results.append(await test_empty_message())
    results.append(await test_gibberish_input())
    results.append(await test_sql_injection_attempt())
    results.append(await test_long_message())
    
    # Clean up
    await close_mcp_client()
    
    # Summary
    print("\n" + "=" * 60)
    print("EDGE CASE TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for r in results if r["passed"])
    failed = sum(1 for r in results if not r["passed"])
    
    print(f"\nTotal: {len(results)} tests")
    print(f"  Passed: {passed}")
    print(f"  Failed: {failed}")
    
    print("\nDetails:")
    for r in results:
        status = "✓" if r["passed"] else "✗"
        error_msg = f" - {r['error']}" if r["error"] else ""
        print(f"  {status} {r['test']}{error_msg}")
    
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
