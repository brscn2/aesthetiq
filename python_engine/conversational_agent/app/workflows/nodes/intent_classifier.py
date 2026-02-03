"""Intent classifier node for the conversational workflow.

This node analyzes the user's message to determine their intent:
- "general": General fashion questions, trends, advice
- "clothing": Specific clothing recommendations, search requests
"""

from typing import Any, Dict, Literal

from pydantic import BaseModel, Field

from app.workflows.state import ConversationState
from app.services.llm_service import get_llm_service
from app.services.tracing.langfuse_service import get_tracing_service
from app.core.logger import get_logger

logger = get_logger(__name__)


class IntentClassification(BaseModel):
    """Structured output for intent classification."""

    intent: Literal["general", "clothing"] = Field(
        description="The classified intent: 'general' for fashion questions/advice, 'clothing' for specific item recommendations"
    )
    confidence: float = Field(
        description="Confidence score between 0 and 1",
        ge=0.0,
        le=1.0,
    )
    reasoning: str = Field(
        description="Brief explanation of why this intent was chosen"
    )


INTENT_CLASSIFIER_PROMPT = """You are an intent classifier for AesthetIQ, a fashion AI assistant.

Your task is to classify the user's message into one of two intents:

1. **general** - Use this for:
   - General fashion questions (e.g., "What are the latest trends?")
   - Style advice and tips (e.g., "What colors suit warm skin tones?")
   - Fashion knowledge questions (e.g., "What is capsule wardrobe?")
   - Greetings and casual conversation about fashion

2. **clothing** - Use this for:
   - Specific clothing item requests (e.g., "Find me a jacket")
   - Shopping requests (e.g., "I want to buy a new dress")
   - Wardrobe queries (e.g., "What can I wear from my closet?")
   - Outfit recommendations (e.g., "What should I wear to a job interview?")
    - Outfit-specific edits or swaps (e.g., "Swap the top in this outfit")
    - Requests referencing attached outfits (e.g., "Find a top for that outfit")
   - Combining wardrobe items with new purchases

Analyze the user's message carefully and provide your classification.
"""


async def intent_classifier_node(state: ConversationState) -> Dict[str, Any]:
    """
    Intent classifier node - classifies user intent using LLM.

    Reads:
        - state["message"]: The user's current message
        - state["conversation_history"]: Previous messages for context

    Writes:
        - state["intent"]: "general" or "clothing"
        - state["metadata"]["intent_classification"]: Full classification details
    """
    message = state.get("message", "")
    conversation_history = state.get("conversation_history", [])
    trace_id = state.get("langfuse_trace_id")

    logger.info(f"Classifying intent for message: {message[:50]}...")

    # Get services
    llm_service = get_llm_service()
    tracing_service = get_tracing_service()

    try:
        # Build context from recent history (last 3 messages)
        context = ""
        if conversation_history:
            recent_history = conversation_history[-3:]
            context = "\n\nRecent conversation:\n"
            for msg in recent_history:
                role = msg.get("role", "user")
                content = msg.get("content", "")[:1000]
                context += f"- {role}: {content}\n"

        # Classify intent using structured output
        user_prompt = f"User message: {message}{context}"

        classification = await llm_service.structured_chat(
            system_prompt=INTENT_CLASSIFIER_PROMPT,
            user_message=user_prompt,
            output_schema=IntentClassification,
        )

        intent = classification.intent

        # Log to Langfuse
        if trace_id:
            tracing_service.log_llm_call(
                trace_id=trace_id,
                agent_name="intent_classifier",
                input_text=user_prompt,
                output_text=f"intent={intent}, confidence={classification.confidence}, reasoning={classification.reasoning}",
                metadata={"classification": classification.model_dump()},
            )

        logger.info(
            f"Intent classified as '{intent}' with confidence {classification.confidence:.2f}"
        )

        # Update metadata
        metadata = state.get("metadata", {})
        metadata["intent_classification"] = classification.model_dump()

        return {
            "intent": intent,
            "metadata": metadata,
        }

    except Exception as e:
        logger.error(f"Intent classification failed: {e}")

        # Minimal fallback - default to clothing (more specific intent)
        intent = "clothing"
        logger.warning(f"Fallback intent: {intent}")

        metadata = state.get("metadata", {})
        metadata["intent_classification"] = {
            "intent": intent,
            "confidence": 0.5,
            "error": str(e),
        }

        return {"intent": intent, "metadata": metadata}
