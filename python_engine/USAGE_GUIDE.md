# Basic Usage Guide

This guide explains how to use the aesthetiq Python backend for conversational style recommendations.

## Installation and Setup

### Prerequisites
- Python 3.10+
- API keys: OpenAI, Langfuse

### Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create `.env` file in project root:
```
OPENAI_API_KEY=your_openai_key
LANGFUSE_PUBLIC_KEY=your_langfuse_public_key
LANGFUSE_SECRET_KEY=your_langfuse_secret_key
```

3. Start the server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Server will run at http://localhost:8000

## Core Concepts

### Conversational Agent
The main interface for user interactions. It:
1. Receives a user message
2. Classifies intent (clothing recommendation vs general conversation)
3. Routes to appropriate handler
4. Returns response with metadata

### Intent Classification
Two categories:
- "clothing" - User wants specific clothing recommendations
- "general" - Other topics (colors, style advice, general questions)

Classification happens automatically via LLM.

### Streaming Events
For streaming responses, different event types indicate different data:
- status - Progress updates (e.g., "Searching database...")
- chunk - LLM response text tokens
- clothing_item - Clothing recommendations (batch)
- metadata - Route, session, and completion signals
- done - Final response with complete message

## API Endpoints

### Non-Streaming Chat
**Endpoint:** POST /api/v1/agent/chat

Returns complete response after processing.

Request:
```json
{
  "message": "I need pants for a wedding",
  "user_id": "user_123",
  "session_id": "optional_session_id",
  "context": {
    "history": [
      {"role": "user", "content": "Previous message"},
      {"role": "assistant", "content": "Previous response"}
    ]
  }
}
```

Response:
```json
{
  "message": "Here are my recommendations...",
  "session_id": "optional_session_id",
  "metadata": {
    "intent_classification": "clothing",
    "agent_used": "ClothingExpert"
  }
}
```

### Streaming Chat
**Endpoint:** POST /api/v1/agent/chat/stream

Returns Server-Sent Events stream with real-time progress.

Request format: Same as non-streaming

Response: Stream of SSE events
```
data: {"type": "status", "content": "Analyzing your request..."}
data: {"type": "metadata", "content": {"route": "clothing", "session_id": "..."}}
data: {"type": "clothing_item", "content": {"recommendations": [...]}}
data: {"type": "done", "content": {"route": "clothing", "message": "..."}}
```

## Usage Examples

### Example 1: Simple Clothing Recommendation

Curl command:
```bash
curl -X POST http://localhost:8000/api/v1/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I need a blue shirt",
    "user_id": "user_123"
  }'
```

Response:
```json
{
  "message": "Based on your style profile, here are my recommendations:\n\n1. **Blue Casual Shirt** in Royal Blue...",
  "session_id": "user_123_1702559200.123",
  "metadata": {
    "intent_classification": "clothing",
    "agent_used": "ClothingExpert"
  }
}
```

### Example 2: Streaming General Conversation

Curl command:
```bash
curl -N -X POST http://localhost:8000/api/v1/agent/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tell me about seasonal color palettes",
    "user_id": "user_456"
  }'
```

Response (stream of events):
```
data: {"type": "metadata", "session_id": "user_456_..."}
data: {"type": "status", "content": "Analyzing your request..."}
data: {"type": "status", "content": "Generating response..."}
data: {"type": "chunk", "content": "Seasonal"}
data: {"type": "chunk", "content": " color"}
data: {"type": "chunk", "content": " palettes"}
...
data: {"type": "done", "content": {"route": "general", "message": "Seasonal color palettes..."}}
```

### Example 3: Multi-Turn Conversation

First turn - User asks about their shirt:
```bash
curl -X POST http://localhost:8000/api/v1/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I have a blue shirt",
    "user_id": "user_789",
    "session_id": "session_abc"
  }'
```

Save the response. For second turn, include history:
```bash
curl -X POST http://localhost:8000/api/v1/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What colors go well with that?",
    "user_id": "user_789",
    "session_id": "session_abc",
    "context": {
      "history": [
        {"role": "user", "content": "I have a blue shirt"},
        {"role": "assistant", "content": "Blue is versatile..."}
      ]
    }
  }'
```

Now the LLM has full context and can give coherent responses about the blue shirt.

## Response Formats

### Clothing Recommendation Response

Contains structured data:
```json
{
  "type": "clothing_item",
  "content": {
    "recommendations": [
      {
        "index": 1,
        "item": "Blue Casual Shirt",
        "color": "Royal Blue",
        "style": "casual",
        "reason": "Complements your style",
        "price_range": "$20-50",
        "where_to_buy": ["H&M", "ASOS"],
        "hex_color": "#4169E1"
      }
    ],
    "styling_tips": ["Pair with dark jeans", "Layer with a blazer"]
  }
}
```

### General Conversation Response

Streams text chunks:
```json
{
  "type": "chunk",
  "content": "Text chunk here"
}
```

Then final done event with complete message:
```json
{
  "type": "done",
  "content": {
    "route": "general",
    "message": "Full response text..."
  }
}
```

## Context and History

The optional `context` field allows you to pass:
- Conversation history for multi-turn conversations
- User preferences
- Any application-specific data

Format:
```json
{
  "context": {
    "history": [
      {"role": "user", "content": "..."},
      {"role": "assistant", "content": "..."}
    ],
    "other_field": "value"
  }
}
```

The agent uses history to provide contextual responses.

## Session Management

Sessions are optional but recommended for tracking conversations:

1. First request - let agent generate session_id:
```json
{
  "message": "...",
  "user_id": "user_123"
}
```

Response includes `session_id` - save this.

2. Subsequent requests - provide session_id:
```json
{
  "message": "...",
  "user_id": "user_123",
  "session_id": "saved_session_id",
  "context": {
    "history": [...]
  }
}
```

Use the same session_id for related messages to group them.

## Observability

All conversations are automatically logged to Langfuse with:
- Trace ID for the conversation
- Intent classification result
- Agent used (ClothingExpert or GeneralConversation)
- Timing information
- Full clothing recommendation details

View traces at your Langfuse instance (default: https://cloud.langfuse.com)

Trace structure:
```
conversation (parent trace)
├── intent_classification
│   └─ input: user message
│   └─ output: "clothing" or "general"
└── clothing_expert_complete / general_conversation_complete
    └─ Full details of recommendations or LLM response
```

## Common Patterns

### Client-Side Streaming Handler

```python
import requests
import json

response = requests.post(
    'http://localhost:8000/api/v1/agent/chat/stream',
    json={
        'message': 'I need formal pants',
        'user_id': 'user123'
    },
    stream=True
)

for line in response.iter_lines():
    if line:
        data = json.loads(line.decode('utf-8').replace('data: ', ''))
        
        if data['type'] == 'status':
            print(f"Status: {data['content']}")
        elif data['type'] == 'chunk':
            print(data['content'], end='')
        elif data['type'] == 'clothing_item':
            for rec in data['content']['recommendations']:
                print(f"- {rec['item']} in {rec['color']}")
        elif data['type'] == 'done':
            print(f"\nFinal message: {data['content']['message']}")
```

### Building Multi-Turn Conversations

```python
def build_history(messages):
    """Convert list of messages to history format."""
    history = []
    for msg in messages:
        if msg['sender'] == 'user':
            history.append({
                'role': 'user',
                'content': msg['text']
            })
        else:
            history.append({
                'role': 'assistant',
                'content': msg['text']
            })
    return history

# Usage
conversation = [
    {'sender': 'user', 'text': 'I have a blue shirt'},
    {'sender': 'assistant', 'text': 'Blue is versatile...'},
]

response = requests.post(
    'http://localhost:8000/api/v1/agent/chat',
    json={
        'message': 'What colors go well with it?',
        'user_id': 'user123',
        'context': {'history': build_history(conversation)}
    }
)
```

## Troubleshooting

### No API key errors
Ensure environment variables are set:
```bash
echo $OPENAI_API_KEY
echo $LANGFUSE_PUBLIC_KEY
echo $LANGFUSE_SECRET_KEY
```

### Slow responses
- Intent classification: Requires LLM call (~500ms)
- General conversation: Faster if shorter, depends on token count
- Clothing recommendations: Dummy implementation (~200ms)

### Clothing always recommended
Check intent classifier is working:
```bash
curl -X POST http://localhost:8000/api/v1/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me about color theory", "user_id": "test"}'
```

Should route to "general", not "clothing".

### Context not working
Ensure history format is correct:
```json
{
  "history": [
    {"role": "user", "content": "Previous message"},
    {"role": "assistant", "content": "Previous response"}
  ]
}
```

Roles must be "user" or "assistant", not anything else.

## Next Steps

1. Test endpoints with curl commands above
2. Integrate client application to stream responses
3. Build conversation history tracking
4. Monitor Langfuse dashboard for insights
5. Implement actual clothing database backend
6. Add authentication and user management
7. Deploy to production server

## Documentation

For more detailed information:
- CHANGES_SUMMARY.md - High-level overview of all components
- app/api/v1/endpoints/conversational_agent.py - Endpoint docstrings
- app/agents/conversational_agent.py - Agent implementation details
- app/services/llm/ - LLM service documentation
