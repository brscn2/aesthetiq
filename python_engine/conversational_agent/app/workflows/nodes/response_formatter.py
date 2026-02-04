"""Response Formatter node for the conversational workflow.

This node formats the final response based on the workflow results:
- Formats approved clothing items nicely
- Handles clarification requests
- Generates fallback responses when needed
"""
from typing import Any, Dict, List, Optional

from app.workflows.state import ConversationState
from app.services.llm_service import get_llm_service
from app.services.tracing.langfuse_service import get_tracing_service
from app.core.logger import get_logger

logger = get_logger(__name__)


FORMATTER_PROMPT = """You are the Response Formatter for AesthetIQ, a fashion AI assistant.

Your task is to create a natural, helpful response based on the workflow results.

**CRITICAL: Use EXACT item information from the provided items list. Do NOT make up or hallucinate item names, descriptions, or details.**

**Formatting Guidelines:**

1. **For Clothing Recommendations:**
   - Use EXACT item names from the provided items list - do not invent or modify names
   - Use the exact productUrl provided for markdown links: [Item Name](productUrl)
   - Present items in an organized, easy-to-read format
   - Highlight key features (style, color, occasion suitability) using ONLY the information provided
   - Never use "blue", "#0000ff", or any color as a default when color is not in the items list—omit color or say "color not specified"
   - Include personalized notes if style DNA is available
   - Be enthusiastic but not overwhelming
   - Match descriptions exactly to the items in the provided list

2. **For Clarification Requests:**
   - Ask the clarification question naturally
   - Explain briefly why you need the information
   - Keep it conversational

3. **For No Results:**
   - Apologize briefly
   - Suggest alternatives or ask if the user wants to broaden the search
   - Be helpful and encouraging

4. **General Guidelines:**
   - Keep responses concise (2-3 paragraphs max)
   - Use natural, conversational language
   - Be helpful and friendly
   - Don't repeat the user's query back to them verbatim
   - NEVER invent item names or details - only use what's explicitly provided in the items list
"""


async def response_formatter_node(state: ConversationState) -> Dict[str, Any]:
    """
    Response formatter node - formats final response.
    
    Reads:
        - state["final_response"]: Pre-existing response (from conversation agent)
        - state["retrieved_items"]: Clothing items found
        - state["analysis_result"]: Analysis result
        - state["needs_clarification"]: Whether clarification is needed
        - state["clarification_question"]: Question to ask
        - state["message"]: Original user message
        - state["style_dna"]: User's style preferences
        
    Writes:
        - state["final_response"]: Formatted response string
    """
    message = state.get("message", "")
    retrieved_items = state.get("retrieved_items") or []
    response_item_ids = _get_response_item_ids(retrieved_items)
    
    # If we already have a final response (from conversation agent), just return
    existing_response = state.get("final_response")
    if existing_response:
        logger.info("Using existing final response from conversation agent")
        return {"response_item_ids": response_item_ids}
    analysis_result = state.get("analysis_result", {})
    needs_clarification = state.get("needs_clarification", False)
    clarification_question = state.get("clarification_question")
    style_dna = state.get("style_dna")
    search_sources_used = state.get("search_sources_used", [])
    fallback_used = state.get("fallback_used", False)
    trace_id = state.get("langfuse_trace_id")
    attached_outfits = state.get("attached_outfits") or []
    swap_intents = state.get("swap_intents") or []
    outfit_context = _build_outfit_context(attached_outfits, swap_intents)
    
    logger.info(f"Formatting response: {len(retrieved_items)} items, clarification={needs_clarification}")
    
    # Get services
    llm_service = get_llm_service()
    tracing_service = get_tracing_service()
    
    # Check for errors in metadata first
    metadata = state.get("metadata", {})
    if metadata.get("error"):
        error_type = metadata.get("error_type", "unknown")
        error_info = metadata.get("error", "")
        logger.warning(f"Response formatter detected error in metadata: {error_type}")
        
        # Generate error response based on error type
        error_str = str(error_info).lower() if error_info else ""
        if "timeout" in error_str or "time" in error_str:
            error_response = "I apologize, but the request took too long to process. Please try again with a simpler question."
        elif "network" in error_str or "connection" in error_str:
            error_response = "I apologize, but I'm having trouble connecting to my services. Please try again in a moment."
        else:
            error_response = "I apologize, but I encountered an issue processing your request. Please try again or rephrase your question."
        
        return {
            "final_response": error_response,
            "workflow_status": "completed",
            "metadata": {
                **metadata,
                "error_handled": True,
            },
        }
    
    try:
        # Handle clarification case - workflow will pause waiting for user response
        if needs_clarification and clarification_question:
            logger.info("Generating clarification response - workflow will await user input")
            response = await _format_clarification(
                llm_service, 
                message, 
                clarification_question,
                outfit_context,
            )
            
            # Log to Langfuse
            if trace_id:
                tracing_service.log_llm_call(
                    trace_id=trace_id,
                    agent_name="response_formatter",
                    input_text=f"Clarification needed: {clarification_question}",
                    output_text=response[:200],
                    metadata={
                        "type": "clarification",
                        "clarification_question": clarification_question,
                    },
                )
            
            return {
                "final_response": response,
                "workflow_status": "awaiting_clarification",
                "response_item_ids": [],
            }
        
        # Handle no items case
        elif not retrieved_items or len(retrieved_items) == 0:
            logger.info("Generating no-results response")
            response = await _format_no_results(llm_service, message, outfit_context)
            response_item_ids = []
        
        # Handle items found case
        else:
            logger.info(f"Generating items response for {len(retrieved_items)} items")
            response = await _format_items(
                llm_service,
                message,
                retrieved_items,
                style_dna,
                search_sources_used,
                fallback_used,
                outfit_context,
            )
            response_item_ids = _get_response_item_ids(retrieved_items)
        
        # Log to Langfuse
        if trace_id:
            tracing_service.log_llm_call(
                trace_id=trace_id,
                agent_name="response_formatter",
                input_text=f"Formatting {len(retrieved_items)} items",
                output_text=response[:200],
                metadata={
                    "items_count": len(retrieved_items),
                    "needs_clarification": needs_clarification,
                    "sources": search_sources_used,
                },
            )
        
        # Validate response is not empty
        if not response or not response.strip():
            logger.warning("Response formatter generated empty response, using fallback")
            if retrieved_items:
                response = (
                    "I found some options for you! Here's what I discovered:\n\n"
                    + _simple_format_items(retrieved_items)
                )
            else:
                response = "I apologize, but I'm having trouble generating a response. Please try rephrasing your question."

        # Match response item IDs to items explicitly mentioned in the response
        matched_response_ids = _extract_response_item_ids_from_text(response, retrieved_items)
        response_item_ids = matched_response_ids if matched_response_ids else []
        
        logger.info(f"Formatted response: {len(response)} chars")
        
        return {
            "final_response": response,
            "workflow_status": "completed",
            "response_item_ids": response_item_ids,
        }
        
    except Exception as e:
        logger.error(f"Response formatting failed: {e}", exc_info=True)
        
        # Log error
        if trace_id:
            tracing_service.log_error(trace_id=trace_id, error=e)
        
        # Fallback response - ensure it's never empty
        if retrieved_items:
            response = (
                "I found some options for you! Here's what I discovered:\n\n"
                + _simple_format_items(retrieved_items)
            )
        else:
            response = "I apologize, but I encountered an issue formatting the response. Please try again or rephrase your question."
        
        # Ensure response is never empty
        if not response or not response.strip():
            response = "I apologize, but I'm having trouble generating a response. Please try again or rephrase your question."
        
        return {
            "final_response": response,
            "workflow_status": "completed",
            "metadata": {
                **metadata,
                "error": str(e),
                "error_type": type(e).__name__,
                "error_handled": True,
            },
            "response_item_ids": response_item_ids if retrieved_items else [],
        }


def _get_response_item_ids(
    retrieved_items: List[Dict[str, Any]],
    max_items: int = 5,
) -> List[str]:
    """Extract a stable list of item IDs used in the response prompt."""
    response_ids: List[str] = []
    seen: set[str] = set()

    for item in retrieved_items[:max_items]:
        item_id = None
        if isinstance(item, dict):
            item_id = item.get("id") or item.get("_id")
            if not item_id:
                raw = item.get("raw") or {}
                if isinstance(raw, dict):
                    item_id = raw.get("id") or raw.get("_id")
        else:
            item_id = getattr(item, "id", None) or getattr(item, "_id", None)

        if item_id is None:
            continue

        item_id_str = str(item_id)
        if item_id_str and item_id_str not in seen:
            response_ids.append(item_id_str)
            seen.add(item_id_str)

    return response_ids


def _item_detail_str(label: str, item: Dict[str, Any]) -> str:
    """Format a single item with full details (type, colors, brand, notes)."""
    name_value = item.get("name") or item.get("category") or label
    parts = [f"- {label}: {name_value}"]
    if item.get("subCategory"):
        parts.append(f"  type: {item.get('subCategory')}")
    if item.get("colors"):
        c = item.get("colors")
        colors_str = ", ".join(c) if isinstance(c, list) else str(c)
        parts.append(f"  color(s): {colors_str}")
    if item.get("brand"):
        parts.append(f"  brand: {item.get('brand')}")
    if item.get("notes"):
        parts.append(f"  notes: {item.get('notes')}")
    return "\n".join(parts) if len(parts) > 1 else parts[0]


def _build_outfit_context(
    attached_outfits: List[Dict[str, Any]],
    swap_intents: List[Dict[str, Any]],
) -> str:
    if not attached_outfits and not swap_intents:
        return ""

    lines = ["\nAttached outfit context:"]

    for outfit in attached_outfits:
        if not isinstance(outfit, dict):
            continue
        name = outfit.get("name", "Outfit")
        items = outfit.get("items", {}) if isinstance(outfit.get("items"), dict) else {}

        lines.append(f"- {name}:")
        for label, key in (
            ("Top", "top"),
            ("Bottom", "bottom"),
            ("Outerwear", "outerwear"),
            ("Footwear", "footwear"),
            ("Dress", "dress"),
        ):
            item = items.get(key)
            if isinstance(item, dict):
                lines.append(f"  {_item_detail_str(label, item)}")

        accessories = items.get("accessories") or []
        if isinstance(accessories, list) and accessories:
            for acc in accessories:
                if isinstance(acc, dict):
                    lines.append(f"  {_item_detail_str('Accessory', acc)}")

    if swap_intents:
        swaps = []
        for intent in swap_intents:
            if not isinstance(intent, dict):
                continue
            category = intent.get("category")
            outfit_id = intent.get("outfitId")
            if category and outfit_id:
                swaps.append(f"{category} for outfit {outfit_id}")
        if swaps:
            lines.append(f"Swap intents: {', '.join(swaps)}")

    return "\n".join(lines)


def _extract_response_item_ids_from_text(
    response: str,
    retrieved_items: List[Dict[str, Any]],
) -> List[str]:
    """Extract item IDs whose names are explicitly mentioned in the response text."""
    if not response or not retrieved_items:
        return []

    def normalize(text: str) -> str:
        return "".join(ch.lower() if ch.isalnum() or ch.isspace() else " " for ch in text).strip()

    normalized_response = normalize(response)
    allowlist = {
        "jeans",
        "sneakers",
        "sweater",
        "tshirt",
        "t shirt",
        "shirt",
        "pants",
        "skirt",
        "dress",
        "coat",
        "jacket",
        "boots",
        "shorts",
        "hoodie",
    }

    response_ids: List[str] = []
    seen: set[str] = set()

    for item in retrieved_items:
        item_id = None
        name = ""
        brand = ""
        sub_category = ""

        if isinstance(item, dict):
            item_id = item.get("id") or item.get("_id")
            if not item_id:
                raw = item.get("raw") or {}
                if isinstance(raw, dict):
                    item_id = raw.get("id") or raw.get("_id")
            name = str(item.get("name") or "")
            brand = str(item.get("brand") or "")
            sub_category = str(item.get("subCategory") or "")
        else:
            item_id = getattr(item, "id", None) or getattr(item, "_id", None)
            name = str(getattr(item, "name", ""))
            brand = str(getattr(item, "brand", ""))
            sub_category = str(getattr(item, "subCategory", ""))

        if item_id is None:
            continue

        variants = []
        if name:
            variants.append(name)
        if brand and sub_category:
            variants.append(f"{brand} {sub_category}")
        if sub_category:
            variants.append(sub_category)

        matched = False
        for variant in variants:
            normalized_variant = normalize(variant)
            if not normalized_variant:
                continue

            tokens = [t for t in normalized_variant.split() if t]
            if not tokens:
                continue

            if len(tokens) == 1:
                token = tokens[0]
                if token in allowlist and token in normalized_response:
                    matched = True
                    break
                if len(token) >= 4 and token in normalized_response:
                    matched = True
                    break
            else:
                if all(token in normalized_response for token in tokens):
                    matched = True
                    break

        if matched:
            item_id_str = str(item_id)
            if item_id_str and item_id_str not in seen:
                response_ids.append(item_id_str)
                seen.add(item_id_str)

    return response_ids


async def _format_clarification(
    llm_service,
    original_message: str,
    clarification_question: str,
    outfit_context: str,
) -> str:
    """Format a clarification response."""
    prompt = f"""
Original user request: {original_message}
{outfit_context}

We need clarification. The question to ask is: {clarification_question}

Create a natural, friendly response that asks this clarification question.
Keep it brief and conversational.
"""
    
    response = await llm_service.chat_with_history(
        system_prompt=FORMATTER_PROMPT,
        user_message=prompt,
    )
    
    return response


async def _format_no_results(
    llm_service,
    original_message: str,
    outfit_context: str,
) -> str:
    """Format a no-results response."""
    prompt = f"""
Original user request: {original_message}
{outfit_context}

We couldn't find any matching items. Create a helpful response that:
1. Briefly apologizes
2. Suggests alternatives or asks if the user wants to broaden their search
3. Stays positive and helpful
"""
    
    response = await llm_service.chat_with_history(
        system_prompt=FORMATTER_PROMPT,
        user_message=prompt,
    )
    
    return response


async def _format_items(
    llm_service,
    original_message: str,
    retrieved_items: List[Dict[str, Any]],
    style_dna: Optional[Dict[str, Any]],
    search_sources: List[str],
    fallback_used: bool,
    outfit_context: str,
) -> str:
    """Format a response with clothing items."""
    from app.utils.color_utils import get_color_name, get_color_name_from_hex_list
    
    # Build items summary - handle both structured items and agent response format
    items_text = ""
    for i, item in enumerate(retrieved_items[:5], 1):
        if isinstance(item, dict):
            # Check if this is a structured clothing item (from MCP tools)
            if "name" in item:
                name = item.get("name", "Unknown Item")
                brand = item.get("brand", "")
                price = item.get("price")
                
                # Get color - prefer descriptive name, fallback to hex conversion
                color = item.get("color")  # This should already be set by normalization
                if not color:
                    # Fallback: try to get from colorHex or colors array
                    color_hex = item.get("colorHex")
                    if color_hex:
                        try:
                            color = get_color_name(color_hex)
                        except Exception:
                            color = color_hex
                    else:
                        # Try colors array
                        colors = item.get("colors") or []
                        if colors and isinstance(colors, list) and len(colors) > 0:
                            try:
                                color = get_color_name_from_hex_list(colors)
                            except Exception:
                                color = colors[0] if colors else ""
                        else:
                            # Last resort: check raw item
                            raw = item.get("raw", {})
                            if isinstance(raw, dict):
                                raw_colors = raw.get("colors") or []
                                if raw_colors and isinstance(raw_colors, list) and len(raw_colors) > 0:
                                    try:
                                        color = get_color_name_from_hex_list(raw_colors)
                                    except Exception:
                                        color = raw_colors[0] if raw_colors else ""
                
                category = item.get("category", "")
                source = item.get("source", "")
                product_url = item.get("productUrl", "")
                
                # Build item description
                item_desc = f"{name}"
                if brand:
                    item_desc += f" by {brand}"
                if price:
                    item_desc += f" - ${price}"
                if color:
                    item_desc += f" ({color})"
                if source:
                    item_desc += f" [from {source}]"
                if product_url:
                    item_desc += f" [Link: {product_url}]"
                
                items_text += f"\n{i}. {item_desc}"
            
            # Handle agent response format (legacy)
            elif "type" in item or "content" in item:
                item_type = item.get("type", "unknown")
                content = item.get("content", "")
                sources = item.get("sources", [])
                items_text += f"\n{i}. [{item_type}] {content[:300]}"
                if sources:
                    items_text += f" (from: {', '.join(sources)})"
            
            # Handle raw dict (fallback)
            else:
                items_text += f"\n{i}. {str(item)[:300]}"
        else:
            items_text += f"\n{i}. {str(item)[:300]}"
    
    style_text = ""
    if style_dna:
        style_text = f"\n\nUser's Style DNA: {style_dna}"
    
    source_note = ""
    if fallback_used:
        source_note = "\nNote: These recommendations are based on general fashion knowledge."
    elif "web" in search_sources:
        source_note = "\nNote: Some of these suggestions come from web search results."
    
    prompt = f"""
Original user request: {original_message}
{outfit_context}

Found items:{items_text}
{style_text}
{source_note}

Create a helpful, natural response presenting these recommendations.
Format it nicely and include personalized touches if style DNA is available.
Keep it concise but informative.
"""
    
    response = await llm_service.chat_with_history(
        system_prompt=FORMATTER_PROMPT,
        user_message=prompt,
    )
    
    return response


def _simple_format_items(items: List[Dict[str, Any]]) -> str:
    """Simple fallback formatting for items."""
    result = []
    for i, item in enumerate(items[:5], 1):
        if isinstance(item, dict):
            # Handle structured clothing items
            if "name" in item:
                name = item.get("name", "Unknown")
                brand = item.get("brand", "")
                price = item.get("price")
                item_str = f"{name}"
                if brand:
                    item_str += f" by {brand}"
                if price:
                    item_str += f" - ${price}"
                result.append(f"{i}. {item_str}")
            # Handle agent response format
            elif "content" in item:
                content = item.get("content", str(item))
                result.append(f"{i}. {content[:200]}")
            else:
                result.append(f"{i}. {str(item)[:200]}")
        else:
            result.append(f"{i}. {str(item)[:200]}")
    
    return "\n".join(result)
