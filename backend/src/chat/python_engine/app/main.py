import os, sys

# Ensure python_engine is on sys.path when running this file directly
CURRENT_FILE = os.path.abspath(__file__)
PY_ENGINE_ROOT = os.path.abspath(os.path.join(os.path.dirname(CURRENT_FILE), '..'))
if PY_ENGINE_ROOT not in sys.path:
    sys.path.insert(0, PY_ENGINE_ROOT)

from app.graph import build_graph

def main():
    app = build_graph()
    state = {
        "messages": []  # preserve history: [{"role": "user"/"agent", "content": "..."}]
    }

    print("Chat started. Type 'exit' to quit.")

    while True:
        user_input = input("\nUSER: ").strip()
        if not user_input:
            continue
        if user_input.lower() in {"exit", "quit"}:
            break

        # add user message to history
        state["messages"].append({"role": "user", "content": user_input})
        state["user_message"] = user_input

        # run the graph on every turn: classify -> relevant agent -> end
        prev_messages = state.get("messages", []).copy()
        new_state = app.invoke(state)

        # Some nodes might recreate the entire state; preserve history
        if isinstance(new_state, dict):
            if "messages" not in new_state:
                new_state["messages"] = prev_messages
            state = new_state
        else:
            # If an unexpected type is returned, show the response and continue
            state = {"messages": prev_messages, "response": str(new_state)}

        # add agent response to history and print to screen
        agent_name = state.get("active_agent", "unknown")
        response = state.get("response") or ""
        print(f"AGENT[{agent_name}]: {response}")

        state["messages"].append({"role": "agent", "content": response})

if __name__ == "__main__":
    main()