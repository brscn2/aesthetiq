#!/usr/bin/env python3
"""Test script for streaming workflow."""
import asyncio
import sys
import os

# Add the conversational_agent directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'conversational_agent'))

from app.workflows.main_workflow import run_workflow_streaming
from app.workflows.state import StreamEvent


async def test_streaming():
    """Test the streaming workflow."""
    print("=" * 60)
    print("Testing Streaming Workflow")
    print("=" * 60)
    print()
    
    test_cases = [
        {
            "name": "CLO-1: Black jacket search",
            "message": "Find me a black jacket for a job interview",
            "user_id": "test_user_001",
        },
        {
            "name": "CONV-1: General greeting",
            "message": "Hello, how are you?",
            "user_id": "test_user_001",
        },
    ]
    
    for test in test_cases:
        print(f"\n{'='*60}")
        print(f"TEST: {test['name']}")
        print(f"Message: {test['message']}")
        print("=" * 60)
        
        event_count = 0
        events_by_type = {}
        
        try:
            async for event in run_workflow_streaming(
                user_id=test["user_id"],
                session_id=f"test_session_{test['name'].split(':')[0]}",
                message=test["message"],
            ):
                event_count += 1
                event_type = event.type
                
                # Track event counts by type
                events_by_type[event_type] = events_by_type.get(event_type, 0) + 1
                
                # Print events as they arrive
                if event_type == "metadata":
                    print(f"  [metadata] session={event.content.get('session_id')}")
                elif event_type == "status":
                    print(f"  [status] {event.content.get('message')}")
                elif event_type == "node_start":
                    print(f"  [node_start] {event.content.get('display_name')}")
                elif event_type == "node_end":
                    print(f"  [node_end] {event.content.get('node')}")
                elif event_type == "intent":
                    print(f"  [intent] {event.content.get('intent')}")
                elif event_type == "filters":
                    print(f"  [filters] scope={event.content.get('scope')}, filters={event.content.get('filters')}")
                elif event_type == "tool_call":
                    print(f"  [tool_call] {event.content.get('tool')}")
                elif event_type == "items_found":
                    print(f"  [items_found] count={event.content.get('count')}, sources={event.content.get('sources')}")
                elif event_type == "analysis":
                    print(f"  [analysis] decision={event.content.get('decision')}, confidence={event.content.get('confidence')}")
                elif event_type == "chunk":
                    # Don't print each chunk, just count them
                    pass
                elif event_type == "done":
                    response = event.content.get('response', '')
                    print(f"  [done] response_length={len(response)}, intent={event.content.get('intent')}")
                    print(f"         items={len(event.content.get('items', []))}")
                elif event_type == "error":
                    print(f"  [error] {event.content.get('message')}")
            
            print(f"\n  Summary:")
            print(f"    Total events: {event_count}")
            print(f"    Events by type: {events_by_type}")
            
            # Check we got expected events
            has_metadata = events_by_type.get("metadata", 0) > 0
            has_status = events_by_type.get("status", 0) > 0
            has_node_events = events_by_type.get("node_start", 0) > 0
            has_done = events_by_type.get("done", 0) > 0
            
            if has_metadata and has_status and has_node_events and has_done:
                print(f"  PASSED: Got all expected event types")
            else:
                print(f"  FAILED: Missing expected events")
                
        except Exception as e:
            print(f"  ERROR: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_streaming())
