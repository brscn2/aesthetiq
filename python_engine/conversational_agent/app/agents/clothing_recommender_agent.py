"""Clothing Recommender Agent for retrieving clothing items.

This agent handles the "clothing" intent path:
- Fetches user context (profile, style DNA)
- Searches commerce, wardrobe, or both based on scope
- Uses web search as fallback when no items found
"""
from typing import Any, Dict, List, Optional
import json

from langchain_core.messages import HumanMessage, ToolMessage
from langgraph.prebuilt import create_react_agent
from pydantic import BaseModel

from app.workflows.state import ConversationState
from app.services.llm_service import get_llm_service
from app.services.tracing.langfuse_service import get_tracing_service
from app.mcp import get_mcp_tools
from app.core.logger import get_logger
from app.utils.color_utils import get_color_name, get_color_name_from_hex_list

logger = get_logger(__name__)


def convert_filters_to_mcp_format(filters: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert filter keys from snake_case to camelCase for MCP servers.
    
    Agent uses snake_case (e.g., sub_category, price_range)
    MCP servers use camelCase (e.g., subCategory, priceRange)
    
    Args:
        filters: Filters with snake_case keys
        
    Returns:
        Filters with camelCase keys for MCP compatibility
    """
    if not filters:
        return {}
    
    key_mapping = {
        "sub_category": "subCategory",
        "price_range": "priceRange",
        "max_price": "priceMax",
        "min_price": "priceMin",
        "is_favorite": "isFavorite",
        "in_stock": "inStock",
        "brand_id": "brandId",
        "retailer_id": "retailerId",
        "seasonal_palette": "seasonalPalette",
        "min_palette_score": "minPaletteScore",
    }
    
    converted = {}
    for key, value in filters.items():
        # Convert key if mapping exists, otherwise keep original
        new_key = key_mapping.get(key, key)
        converted[new_key] = value
    
    return converted



RECOMMENDER_AGENT_PROMPT = """You are the Clothing Recommender for AesthetIQ, a fashion AI assistant.

Your role is to find and recommend clothing items based on the user's request.

**Tool Usage Guidelines:**

1. Get user's style_dna FIRST to personalize recommendations
2. For database searches:
   - Use filter tools when specific criteria are provided (category, brand, color, price)
   - Use search tools for vague or semantic queries
3. Prioritize database tools over web search
4. Only use web_search if database returns zero results AND user explicitly wants trending/external items
5. Pick ONE appropriate search tool - don't call multiple search tools sequentially

Keep tool usage minimal - ideally 2 calls maximum (style_dna + one search).
Return results immediately after finding items.
"""


def _normalize_item_to_clothing_item(item: Dict[str, Any], source: str) -> Dict[str, Any]:
    """
    Normalize a raw item dict from MCP tools to ClothingItem format expected by frontend.
    
    Handles wardrobe items (no name field), commerce items (has name), and web items.
    Also handles Pydantic models by converting them to dicts first.
    
    Args:
        item: Raw item dict or Pydantic model from MCP tool
        source: Source of the item ("wardrobe", "commerce", or "web")
        
    Returns:
        Normalized item dict matching frontend ClothingItem interface
    """
    # Convert Pydantic model to dict if needed
    if isinstance(item, BaseModel):
        item = item.model_dump()
    elif hasattr(item, "model_dump") and not isinstance(item, dict):
        item = item.model_dump()
    
    # Ensure item is a dict at this point
    if not isinstance(item, dict):
        logger.warning(f"Item is not a dict after conversion: {type(item)}")
        try:
            item = dict(item)
        except (TypeError, ValueError):
            logger.error(f"Could not convert item to dict: {type(item)}")
            return {
                "id": "",
                "name": "Unknown Item",
                "source": source,
            }
    
    # Debug logging - log item structure
    logger.debug(f"Normalizing item from {source}: keys={list(item.keys())}")
    if source == "commerce":
        logger.debug(f"[COMMERCE] Normalizing commerce item: has name={'name' in item}, has imageUrl={'imageUrl' in item}, has colors={'colors' in item}, has price={'price' in item}, has productUrl={'productUrl' in item}")
    
    # Extract ID (handle both id and _id fields, and stringify if needed)
    item_id = item.get("id") or item.get("_id")
    if item_id is None:
        # Fallback: try to get from raw dict if it exists
        raw = item.get("raw", {})
        if isinstance(raw, dict):
            item_id = raw.get("id") or raw.get("_id")
    # Convert to string if it's not already
    item_id = str(item_id) if item_id is not None else ""
    
    normalized = {
        "id": item_id,
        "source": source,
    }
    
    # Extract fields with proper defaults - handle None and empty strings
    brand = item.get("brand") or ""
    sub_category = item.get("subCategory") or ""
    category = item.get("category") or ""
    
    # Handle category - could be string or enum object
    if category:
        if hasattr(category, 'value'):
            # It's an enum, extract the value
            category = category.value
        category = str(category) if category else ""
    
    # Debug logging - log extracted fields
    logger.debug(f"Extracted fields - brand: '{brand}', subCategory: '{sub_category}', category: '{category}'")
    
    # Generate name if missing (wardrobe items don't have name, but commerce items do)
    if "name" not in item or not item.get("name"):
        name_parts = []
        # Check for non-empty strings (strip whitespace)
        if brand and brand.strip():
            name_parts.append(brand.strip())
        if sub_category and sub_category.strip():
            name_parts.append(sub_category.strip())
        elif category and category.strip():
            name_parts.append(category.strip())
        
        if name_parts:
            normalized["name"] = " ".join(name_parts)
        else:
            # Better fallback - use category if available
            if category and category.strip():
                normalized["name"] = f"{category.strip()} Item"
            else:
                # Use source-appropriate default name
                normalized["name"] = "Commerce Item" if source == "commerce" else "Wardrobe Item"
    else:
        # Commerce items have name field, wardrobe items don't
        normalized["name"] = item["name"]
    
    logger.debug(f"Generated name: '{normalized.get('name')}'")
    
    # Extract imageUrl - prefer processedImageUrl for wardrobe items
    # Commerce items only have imageUrl (no processedImageUrl)
    # Handle both dict access and attribute access (for Pydantic models that weren't converted)
    image_url = None
    if source == "wardrobe":
        image_url = item.get("processedImageUrl") or item.get("imageUrl")
        # Also try attribute access if dict access failed
        if not image_url and hasattr(item, "processedImageUrl"):
            image_url = getattr(item, "processedImageUrl", None)
        if not image_url and hasattr(item, "imageUrl"):
            image_url = getattr(item, "imageUrl", None)
    else:
        # Commerce and web items: use imageUrl directly
        image_url = item.get("imageUrl")
        if not image_url and hasattr(item, "imageUrl"):
            image_url = getattr(item, "imageUrl", None)
    
    # Always set imageUrl if present (even if empty string - let frontend handle it)
    if image_url is not None and image_url != "":
        normalized["imageUrl"] = image_url
        image_preview = image_url[:50] + "..." if len(image_url) > 50 else image_url
        logger.debug(f"Set imageUrl: '{image_preview}'")
    else:
        logger.warning(f"No imageUrl found in item from {source}, keys: {list(item.keys())}")
    
    # Map category and subCategory (handle enum if present)
    if "category" in item:
        cat_value = item["category"]
        if hasattr(cat_value, 'value'):
            normalized["category"] = cat_value.value
        else:
            normalized["category"] = str(cat_value) if cat_value else None
    if "subCategory" in item:
        normalized["subCategory"] = item["subCategory"]
    
    # Map brand
    if "brand" in item:
        normalized["brand"] = item["brand"]
    
    # Map colors to colorHex (first color if array) and convert to color name
    colors = item.get("colors") or []
    color_hex = None
    if colors and isinstance(colors, list) and len(colors) > 0:
        color_hex = colors[0]
        normalized["colorHex"] = color_hex
    elif "colorHex" in item:
        color_hex = item["colorHex"]
        normalized["colorHex"] = color_hex
    elif "color" in item:
        color_hex = item["color"]
        normalized["colorHex"] = color_hex
    
    # Convert hex to descriptive color name
    if color_hex:
        try:
            color_name = get_color_name(color_hex)
            normalized["color"] = color_name
            logger.debug(f"Converted color hex {color_hex} to name: {color_name}")
        except Exception as e:
            logger.warning(f"Failed to convert color hex {color_hex} to name: {e}")
            normalized["color"] = None
    elif colors and isinstance(colors, list) and len(colors) > 0:
        # Try to get color name from the list
        try:
            color_name = get_color_name_from_hex_list(colors)
            if color_name:
                normalized["color"] = color_name
                logger.debug(f"Converted color list to name: {color_name}")
        except Exception as e:
            logger.warning(f"Failed to convert color list to name: {e}")
    
    # Map price
    if "price" in item:
        normalized["price"] = item["price"]
    
    # Map size
    if "size" in item:
        normalized["size"] = item["size"]
    
    # Map productUrl (for commerce items - required field)
    if "productUrl" in item:
        normalized["productUrl"] = item["productUrl"]
    
    # Map currency (for commerce items)
    if "currency" in item:
        normalized["currency"] = item["currency"]
    
    # Map inStock (for commerce items)
    if "inStock" in item:
        normalized["inStock"] = item["inStock"]
    
    # Preserve metadata and search score
    if "_search_score" in item:
        normalized["_search_score"] = item["_search_score"]
    
    # Store raw item in metadata for reference
    if "metadata" not in normalized:
        normalized["metadata"] = {}
    normalized["metadata"]["raw"] = item
    
    logger.debug(f"Normalized item: id={normalized.get('id')}, name={normalized.get('name')}, imageUrl={'present' if normalized.get('imageUrl') else 'missing'}, color={'present' if normalized.get('color') else 'missing'}")
    
    if source == "commerce":
        logger.debug(f"[COMMERCE] Normalized commerce item: id={normalized.get('id')}, name={normalized.get('name')}, imageUrl={'present' if normalized.get('imageUrl') else 'missing'}, price={normalized.get('price')}, productUrl={'present' if normalized.get('productUrl') else 'missing'}, color={normalized.get('color')}")
    
    return normalized


def _extract_items_from_result(tool_result: Any, source: str) -> List[Dict[str, Any]]:
    """
    Generic helper to extract items from various tool result formats.
    
    Handles: {results: [{item: {...}}]}, {items: [...]}, direct list, etc.
    Normalizes items to ClothingItem format expected by frontend.
    
    Also handles Pydantic models by converting them to dicts using model_dump().
    """
    # Debug: Log the raw tool_result structure
    logger.info(f"[EXTRACT] Starting extraction from {source}, tool_result type: {type(tool_result)}")
    if isinstance(tool_result, dict):
        logger.debug(f"[EXTRACT] tool_result keys: {list(tool_result.keys())}")
        if "results" in tool_result:
            logger.debug(f"[EXTRACT] Found 'results' key with {len(tool_result.get('results') or [])} entries")
        if "items" in tool_result:
            logger.debug(f"[EXTRACT] Found 'items' key with {len(tool_result.get('items') or [])} entries")
    elif isinstance(tool_result, list):
        logger.debug(f"[EXTRACT] tool_result is a list with {len(tool_result)} entries")
    else:
        logger.debug(f"[EXTRACT] tool_result is {type(tool_result)}, has model_dump: {hasattr(tool_result, 'model_dump')}")
    
    items = []
    
    def _convert_to_dict(obj: Any) -> Dict[str, Any]:
        """Convert Pydantic model or dict to dict."""
        if isinstance(obj, BaseModel):
            # Convert Pydantic model to dict
            result = obj.model_dump()
            logger.debug(f"[EXTRACT] Converted BaseModel to dict, keys: {list(result.keys()) if isinstance(result, dict) else 'N/A'}")
            return result
        elif isinstance(obj, dict):
            return obj
        else:
            # Try to convert if it has model_dump method
            if hasattr(obj, "model_dump"):
                result = obj.model_dump()
                logger.debug(f"[EXTRACT] Converted object with model_dump() to dict, keys: {list(result.keys()) if isinstance(result, dict) else 'N/A'}")
                return result
            # Fallback: try dict() constructor
            try:
                result = dict(obj)
                logger.debug(f"[EXTRACT] Converted object using dict() constructor")
                return result
            except (TypeError, ValueError):
                logger.warning(f"[EXTRACT] Could not convert item to dict: {type(obj)}")
                return {}
    
    if isinstance(tool_result, dict):
        # Handle {results: [{item: {...}, score: ...}]} format (from SearchWardrobeItemsResponse)
        if "results" in tool_result:
            results_list = tool_result.get("results") or []
            logger.info(f"[EXTRACT] Processing {len(results_list)} results from 'results' key")
            for i, r in enumerate(results_list):
                r_dict = _convert_to_dict(r)
                if r_dict:
                    logger.debug(f"[EXTRACT] Result {i}: keys={list(r_dict.keys())}")
                    item = r_dict.get("item") if "item" in r_dict else r_dict
                    item_dict = _convert_to_dict(item)
                    if item_dict:
                        logger.debug(f"[EXTRACT] Extracted item {i}: has id={('id' in item_dict or '_id' in item_dict)}, has imageUrl={'imageUrl' in item_dict}")
                        if "score" in r_dict:
                            item_dict["_search_score"] = r_dict.get("score")
                        items.append(item_dict)
                    else:
                        logger.warning(f"[EXTRACT] Could not convert item {i} to dict")
                else:
                    logger.warning(f"[EXTRACT] Could not convert result {i} to dict")
        # Handle {items: [...]} format (from FilterWardrobeItemsResponse)
        elif "items" in tool_result:
            items_list = tool_result.get("items") or []
            logger.info(f"[EXTRACT] Processing {len(items_list)} items from 'items' key (FilterWardrobeItemsResponse)")
            for i, item in enumerate(items_list):
                item_dict = _convert_to_dict(item)
                if item_dict:
                    logger.debug(f"[EXTRACT] Extracted item {i} from 'items': keys={list(item_dict.keys())}, has id={('id' in item_dict or '_id' in item_dict)}, has imageUrl={'imageUrl' in item_dict}")
                    items.append(item_dict)
                else:
                    logger.warning(f"[EXTRACT] Could not convert item {i} from 'items' to dict")
        else:
            # Dict but no 'results' or 'items' key - log all keys for debugging
            logger.warning(f"[EXTRACT] tool_result is dict but has no 'results' or 'items' key. Keys: {list(tool_result.keys())}")
            # Try to see if it's a single item wrapped in a dict
            if "id" in tool_result or "_id" in tool_result or "imageUrl" in tool_result:
                logger.info(f"[EXTRACT] tool_result dict looks like a single item, adding it")
                items.append(tool_result)
    elif isinstance(tool_result, list):
        logger.info(f"[EXTRACT] Processing {len(tool_result)} items from direct list")
        if tool_result:
            first_item = tool_result[0]
            logger.debug(f"[EXTRACT] First item in list: type={type(first_item)}, is dict={isinstance(first_item, dict)}, is str={isinstance(first_item, str)}")
            if isinstance(first_item, dict):
                logger.debug(f"[EXTRACT] First item keys: {list(first_item.keys())}")
                logger.debug(f"[EXTRACT] First item sample: {str(first_item)[:200]}")
            elif isinstance(first_item, str):
                logger.debug(f"[EXTRACT] First item is string, length: {len(first_item)}, preview: {first_item[:200]}")
                # Try to parse as JSON
                try:
                    parsed = json.loads(first_item)
                    logger.debug(f"[EXTRACT] Successfully parsed first item as JSON, type: {type(parsed)}")
                    if isinstance(parsed, dict):
                        logger.debug(f"[EXTRACT] Parsed item keys: {list(parsed.keys())}")
                except (json.JSONDecodeError, TypeError):
                    logger.debug(f"[EXTRACT] First item is not valid JSON")
        
        for i, item in enumerate(tool_result):
            # Check if item is a string that needs parsing
            if isinstance(item, str):
                logger.debug(f"[EXTRACT] Item {i} is a string, attempting JSON parse")
                try:
                    parsed_item = json.loads(item)
                    item = parsed_item
                    logger.debug(f"[EXTRACT] Successfully parsed item {i} as JSON")
                except (json.JSONDecodeError, TypeError):
                    logger.warning(f"[EXTRACT] Item {i} is a string but not valid JSON: {item[:100]}")
                    continue
            
            item_dict = _convert_to_dict(item)
            if item_dict:
                logger.debug(f"[EXTRACT] Extracted item {i} from list: keys={list(item_dict.keys())}, has id={('id' in item_dict or '_id' in item_dict)}, has imageUrl={'imageUrl' in item_dict}")
                
                # Check if this is a langchain ToolMessage format (has 'type', 'text', 'id' but not wardrobe/commerce fields)
                # The actual response JSON is inside the 'text' field
                if 'type' in item_dict and 'text' in item_dict and 'id' in item_dict:
                    if 'imageUrl' not in item_dict and 'category' not in item_dict:
                        logger.info(f"[EXTRACT] Item {i} has langchain ToolMessage format (type/text/id), extracting from 'text' field")
                        # Extract actual data from 'text' field if it's JSON
                        if 'text' in item_dict and isinstance(item_dict['text'], str):
                            try:
                                text_content = json.loads(item_dict['text'])
                                logger.debug(f"[EXTRACT] Successfully parsed 'text' field as JSON for item {i}, type: {type(text_content)}")
                                
                                if isinstance(text_content, dict):
                                    # Check if this is a response structure with 'results' or 'items'
                                    if 'results' in text_content:
                                        logger.info(f"[EXTRACT] Found 'results' in parsed text for item {i} with {len(text_content.get('results') or [])} entries")
                                        # Recursively process the results structure
                                        # This handles SearchCommerceItemsResponse, SearchWardrobeItemsResponse, etc.
                                        nested_items = _extract_items_from_result(text_content, source)
                                        items.extend(nested_items)
                                        logger.info(f"[EXTRACT] Extracted {len(nested_items)} items from 'results' in text field")
                                        continue
                                    elif 'items' in text_content:
                                        logger.info(f"[EXTRACT] Found 'items' in parsed text for item {i} with {len(text_content.get('items') or [])} entries")
                                        # Recursively process the items structure
                                        # This handles FilterCommerceItemsResponse, FilterWardrobeItemsResponse, etc.
                                        nested_items = _extract_items_from_result(text_content, source)
                                        items.extend(nested_items)
                                        logger.info(f"[EXTRACT] Extracted {len(nested_items)} items from 'items' in text field")
                                        continue
                                    elif 'imageUrl' in text_content or 'category' in text_content:
                                        # This looks like a direct item (not wrapped in response structure)
                                        logger.info(f"[EXTRACT] Found direct item data in 'text' field for item {i}")
                                        item_dict = text_content
                                    else:
                                        logger.debug(f"[EXTRACT] Parsed text content doesn't have 'results', 'items', or item fields. Keys: {list(text_content.keys())}")
                                        # Empty results or unknown structure - continue to next item
                                        continue
                                elif isinstance(text_content, list):
                                    # Text content is a list - process it recursively
                                    logger.info(f"[EXTRACT] Parsed text content is a list with {len(text_content)} entries, processing recursively")
                                    nested_items = _extract_items_from_result(text_content, source)
                                    items.extend(nested_items)
                                    logger.info(f"[EXTRACT] Extracted {len(nested_items)} items from list in text field")
                                    continue
                                else:
                                    logger.debug(f"[EXTRACT] Parsed text content is not dict or list: {type(text_content)}")
                                    continue
                            except (json.JSONDecodeError, TypeError) as e:
                                logger.warning(f"[EXTRACT] 'text' field is not valid JSON for item {i}: {e}")
                                continue
                        else:
                            logger.debug(f"[EXTRACT] 'text' field is not a string for item {i}")
                            continue
                
                # If we get here, item_dict is a valid clothing item (not a langchain wrapper)
                items.append(item_dict)
            else:
                logger.warning(f"[EXTRACT] Could not convert item {i} from list to dict, type: {type(item)}")
    else:
        # Try to convert the whole result
        logger.info(f"[EXTRACT] Attempting to convert tool_result to dict (type: {type(tool_result)})")
        result_dict = _convert_to_dict(tool_result)
        if result_dict:
            logger.debug(f"[EXTRACT] Converted tool_result to dict, keys: {list(result_dict.keys())}")
            # Try to extract items from the dict
            if "results" in result_dict:
                results_list = result_dict.get("results") or []
                logger.info(f"[EXTRACT] Found 'results' in converted dict with {len(results_list)} entries")
                for i, r in enumerate(results_list):
                    r_dict = _convert_to_dict(r)
                    if r_dict:
                        item = r_dict.get("item") if "item" in r_dict else r_dict
                        item_dict = _convert_to_dict(item)
                        if item_dict:
                            logger.debug(f"[EXTRACT] Extracted item {i} from converted result: has id={('id' in item_dict or '_id' in item_dict)}, has imageUrl={'imageUrl' in item_dict}")
                            items.append(item_dict)
            elif "items" in result_dict:
                items_list = result_dict.get("items") or []
                logger.info(f"[EXTRACT] Found 'items' in converted dict with {len(items_list)} entries")
                for i, item in enumerate(items_list):
                    item_dict = _convert_to_dict(item)
                    if item_dict:
                        logger.debug(f"[EXTRACT] Extracted item {i} from converted items: has id={('id' in item_dict or '_id' in item_dict)}, has imageUrl={'imageUrl' in item_dict}")
                        items.append(item_dict)
        else:
            logger.warning(f"[EXTRACT] Could not convert tool_result to dict, type: {type(tool_result)}")
    
    logger.info(f"[EXTRACT] Extracted {len(items)} raw items from tool_result")
    
    # Normalize items to ClothingItem format
    normalized_items = []
    for i, item in enumerate(items):
        if not isinstance(item, dict):
            # Skip non-dict items (shouldn't happen after conversion, but safety check)
            logger.warning(f"[EXTRACT] Skipping non-dict item {i}: {type(item)}")
            continue
        
        # Check if this is a special response type (not a clothing item)
        # These are things like web_summary, agent_response, llm_response
        if item.get("type") in ("web_summary", "agent_response", "llm_response"):
            # Keep special response types as-is (they already have source added)
            logger.debug(f"[EXTRACT] Item {i} is special response type: {item.get('type')}")
            normalized_items.append(item)
        elif "id" in item or "_id" in item or "imageUrl" in item:
            # This looks like a clothing item - normalize it
            logger.debug(f"[EXTRACT] Normalizing item {i} as clothing item (has id or imageUrl)")
            try:
                normalized_item = _normalize_item_to_clothing_item(item, source)
                normalized_items.append(normalized_item)
                logger.debug(f"[EXTRACT] Successfully normalized item {i}: id={normalized_item.get('id')}, name={normalized_item.get('name')}, imageUrl={'present' if normalized_item.get('imageUrl') else 'missing'}")
            except Exception as e:
                logger.error(f"[EXTRACT] Error normalizing item {i}: {e}", exc_info=True)
        else:
            # Unknown format - try to normalize anyway, might be a clothing item
            # with unusual structure
            logger.debug(f"[EXTRACT] Item {i} has unknown format, attempting normalization anyway")
            try:
                normalized_item = _normalize_item_to_clothing_item(item, source)
                normalized_items.append(normalized_item)
                logger.debug(f"[EXTRACT] Successfully normalized unknown format item {i}")
            except Exception as e:
                logger.error(f"[EXTRACT] Error normalizing unknown format item {i}: {e}", exc_info=True)
    
    logger.info(f"[EXTRACT] Final normalized items count: {len(normalized_items)}")
    if normalized_items:
        # Log sample of first normalized item
        first_item = normalized_items[0]
        logger.debug(f"[EXTRACT] Sample normalized item: id={first_item.get('id')}, name={first_item.get('name')}, source={first_item.get('source')}, imageUrl={'present' if first_item.get('imageUrl') else 'missing'}, color={'present' if first_item.get('color') else 'missing'}")
    
    return normalized_items


def _extract_dict_value(tool_result: Any, *keys: str) -> Optional[Dict[str, Any]]:
    """
    Extract a dict value from various result formats.
    
    Tries keys in order, handles nested/list/string formats.
    """
    data = None
    
    if isinstance(tool_result, dict):
        for key in keys:
            if key in tool_result:
                data = tool_result[key]
                break
        if data is None:
            data = tool_result
    elif isinstance(tool_result, list) and tool_result:
        first = tool_result[0]
        if isinstance(first, dict):
            for key in keys:
                if key in first:
                    data = first[key]
                    break
            if data is None:
                data = first
    elif isinstance(tool_result, str):
        try:
            parsed = json.loads(tool_result)
            for key in keys:
                if key in parsed:
                    data = parsed[key]
                    break
            if data is None:
                data = parsed
        except json.JSONDecodeError:
            pass
    
    return data if isinstance(data, dict) else None


async def clothing_recommender_node(state: ConversationState) -> Dict[str, Any]:
    """
    Clothing recommender agent node - retrieves clothing items.
    
    Uses a ReAct agent with MCP tools to find clothing items based on user request.
    The agent autonomously decides which tools to use and how to combine results.
    """
    message = state.get("message", "")
    user_id = state.get("user_id", "")
    search_scope = state.get("search_scope", "commerce")
    extracted_filters = state.get("extracted_filters", {}) or {}
    refinement_notes = state.get("refinement_notes", []) or []
    iteration = state.get("iteration", 0)
    trace_id = state.get("langfuse_trace_id")
    
    # Verify state reading in refinement loops
    previous_items = state.get("retrieved_items") or []
    previous_analysis = state.get("analysis_result")
    logger.info(
        f"[RECOMMENDER] State verification - iteration={iteration}, "
        f"previous_items_count={len(previous_items) if isinstance(previous_items, list) else 0}, "
        f"has_refinement_notes={len(refinement_notes) > 0}, "
        f"has_previous_analysis={previous_analysis is not None}"
    )
    
    # Convert filter keys to camelCase for MCP server compatibility
    mcp_filters = convert_filters_to_mcp_format(extracted_filters)
    logger.info(f"Clothing recommender processing: scope={search_scope}, filters={mcp_filters}, iteration={iteration}")
    
    # Get services
    llm_service = get_llm_service()
    tracing_service = get_tracing_service()
    
    if trace_id:
        tracing_service.log_agent_transition(
            trace_id=trace_id,
            from_agent="query_analyzer",
            to_agent="clothing_recommender",
            reason=f"Searching {search_scope} with filters: {mcp_filters}",
        )
    
    try:
        # Get all MCP tools - agent decides which to use based on task
        tools = await get_mcp_tools()
        
        if not tools:
            logger.warning("No MCP tools available, using fallback response")
            response = await llm_service.chat_with_history(
                system_prompt="You are a fashion AI. Help the user find clothing based on their request.",
                user_message=f"User is looking for: {message}. Filters: {mcp_filters}. Scope: {search_scope}",
            )
            return {
                "retrieved_items": [{"type": "llm_response", "content": response, "sources": ["llm_fallback"]}],
                "user_profile": None,
                "style_dna": None,
                "search_sources_used": ["fallback"],
                "fallback_used": True,
            }
        
        logger.info(f"Clothing recommender has {len(tools)} tools available")
        
        # Create and invoke the ReAct agent
        agent = create_react_agent(llm_service.llm, tools, prompt=RECOMMENDER_AGENT_PROMPT)
        
        # Build search request - let agent decide which tools to use
        filter_str = ", ".join(f"{k}={v}" for k, v in mcp_filters.items()) if mcp_filters else "none"
        refinement_context = ""
        if refinement_notes and iteration > 0:
            refinement_context = f"\n\nRefinement needed (attempt {iteration + 1}): {', '.join(refinement_notes)}"
        
        search_request = f"""User request: {message}
User ID: {user_id}
Search scope: {search_scope}
Filters: {filter_str}{refinement_context}"""
        
        agent_result = await agent.ainvoke({"messages": [HumanMessage(content=search_request)]})
        
        # Process agent results - simplified extraction
        tools_used = []
        search_sources_used = []
        fallback_used = False
        # Initialize retrieved_items - preserve from previous iteration if in refinement loop
        previous_items = state.get("retrieved_items") or []
        if previous_items and isinstance(previous_items, list) and iteration > 0:
            # In refinement, we might want to keep some previous items
            # But for now, start fresh and let agent find new items
            retrieved_items = []
            logger.info(f"[RECOMMENDER] Starting fresh search for iteration {iteration + 1} (previous had {len(previous_items)} items)")
        else:
            retrieved_items = []
        user_profile = None
        style_dna = None
        tool_call_ids = {}
        
        for msg in agent_result["messages"]:
            # Track tool calls
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                for tool_call in msg.tool_calls:
                    tool_name = tool_call.get("name", "unknown")
                    tools_used.append(tool_name)
                    tool_call_ids[tool_call.get("id", "")] = tool_name
                    
                    # Track sources based on tool name
                    if "wardrobe" in tool_name:
                        search_sources_used.append("wardrobe") if "wardrobe" not in search_sources_used else None
                    elif "commerce" in tool_name:
                        search_sources_used.append("commerce") if "commerce" not in search_sources_used else None
                    elif tool_name == "web_search":
                        fallback_used = True
                        search_sources_used.append("web") if "web" not in search_sources_used else None
                    
                    if trace_id:
                        tracing_service.log_tool_call(
                            trace_id=trace_id,
                            tool_name=tool_name,
                            input_params=tool_call.get("args", {}),
                            output="[pending]",
                        )
            
            # Extract data from ToolMessage results
            if isinstance(msg, ToolMessage):
                tool_name = tool_call_ids.get(getattr(msg, "tool_call_id", ""), "unknown")
                
                # Parse tool result - handle both JSON strings and already-parsed objects
                try:
                    if isinstance(msg.content, str):
                        tool_result = json.loads(msg.content)
                        logger.debug(f"[RECOMMENDER] Parsed tool_result from JSON string, type: {type(tool_result)}")
                    else:
                        tool_result = msg.content
                        logger.debug(f"[RECOMMENDER] tool_result is not a string, type: {type(tool_result)}")
                except (json.JSONDecodeError, TypeError) as e:
                    logger.warning(f"[RECOMMENDER] Failed to parse tool_result as JSON: {e}, using raw content")
                    tool_result = msg.content
                
                # Log the raw tool_result structure for debugging
                if isinstance(tool_result, dict):
                    logger.debug(f"[RECOMMENDER] tool_result dict keys: {list(tool_result.keys())}")
                    # Check if it's FilterWardrobeItemsResponse structure
                    if "items" in tool_result:
                        items_list = tool_result.get("items") or []
                        logger.debug(f"[RECOMMENDER] Found 'items' key with {len(items_list)} items")
                        if items_list and isinstance(items_list[0], dict):
                            logger.debug(f"[RECOMMENDER] First item in 'items' has keys: {list(items_list[0].keys())}")
                elif isinstance(tool_result, list):
                    logger.debug(f"[RECOMMENDER] tool_result is a list with {len(tool_result)} items")
                    if tool_result and isinstance(tool_result[0], dict):
                        logger.debug(f"[RECOMMENDER] First item in list has keys: {list(tool_result[0].keys())}")
                
                # Skip error results
                if isinstance(tool_result, dict) and tool_result.get("error"):
                    continue
                
                # Extract based on tool category (simplified)
                if tool_name == "get_user_profile":
                    user_profile = _extract_dict_value(tool_result, "profile") or tool_result
                
                elif tool_name in ("get_style_dna", "get_color_season", "get_recommended_colors"):
                    extracted = _extract_dict_value(tool_result, "style_dna", "color_season", "colors")
                    if extracted:
                        style_dna = {**(style_dna or {}), **extracted} if style_dna else extracted
                
                elif any(kw in tool_name for kw in ("wardrobe", "commerce", "web_search")):
                    source = "wardrobe" if "wardrobe" in tool_name else ("web" if "web" in tool_name else "commerce")
                    logger.info(f"[RECOMMENDER] Processing tool result from {tool_name} (source: {source})")
                    logger.debug(f"[RECOMMENDER] tool_result type: {type(tool_result)}, is dict: {isinstance(tool_result, dict)}, is list: {isinstance(tool_result, list)}")
                    if isinstance(tool_result, dict):
                        logger.debug(f"[RECOMMENDER] tool_result keys: {list(tool_result.keys())}")
                        if "results" in tool_result:
                            logger.debug(f"[RECOMMENDER] 'results' has {len(tool_result.get('results') or [])} entries")
                            if source == "commerce" and tool_result.get('results'):
                                first_result = tool_result['results'][0]
                                if isinstance(first_result, dict):
                                    logger.debug(f"[RECOMMENDER] [COMMERCE] First result keys: {list(first_result.keys())}")
                                    if 'item' in first_result:
                                        item_keys = list(first_result['item'].keys()) if isinstance(first_result['item'], dict) else 'not a dict'
                                        logger.debug(f"[RECOMMENDER] [COMMERCE] First result item keys: {item_keys}")
                        if "items" in tool_result:
                            logger.debug(f"[RECOMMENDER] 'items' has {len(tool_result.get('items') or [])} entries")
                            if source == "commerce" and tool_result.get('items'):
                                first_item = tool_result['items'][0]
                                item_keys = list(first_item.keys()) if isinstance(first_item, dict) else 'not a dict'
                                logger.debug(f"[RECOMMENDER] [COMMERCE] First item keys: {item_keys}")
                    
                    items = _extract_items_from_result(tool_result, source)
                    logger.info(f"[RECOMMENDER] Extracted {len(items)} items from {tool_name}")
                    if items:
                        logger.debug(f"[RECOMMENDER] First item sample: id={items[0].get('id') if items else 'N/A'}, name={items[0].get('name') if items else 'N/A'}, imageUrl={'present' if items and items[0].get('imageUrl') else 'missing'}")
                        retrieved_items.extend(items)
                        logger.info(f"[RECOMMENDER] Added {len(items)} items to retrieved_items (total now: {len(retrieved_items)})")
                    elif isinstance(tool_result, str) and tool_name == "web_search":
                        logger.info(f"[RECOMMENDER] Adding web_search summary as special item")
                        retrieved_items.append({"type": "web_summary", "content": tool_result, "source": "web"})
                    else:
                        logger.warning(f"[RECOMMENDER] No items extracted from {tool_name}, tool_result type: {type(tool_result)}")
                
                if trace_id:
                    tracing_service.log_tool_call(
                        trace_id=trace_id,
                        tool_name=f"{tool_name}_result",
                        input_params={},
                        output=str(tool_result)[:500],
                    )
        
        # Fallback: use agent's final response if no items extracted
        if not retrieved_items:
            logger.warning(f"[RECOMMENDER] No items extracted from any tool, using fallback")
            final_message = agent_result["messages"][-1].content
            if final_message and "no items" not in final_message.lower():
                retrieved_items = [{"type": "agent_response", "content": final_message, "sources": search_sources_used}]
                logger.info(f"[RECOMMENDER] Added agent response as fallback item")
        
        # Ensure retrieved_items is always a list (never None)
        if retrieved_items is None:
            logger.warning("[RECOMMENDER] retrieved_items is None, initializing as empty list")
            retrieved_items = []
        
        # Validate items are properly formatted
        validated_items = []
        for item in retrieved_items:
            if isinstance(item, dict):
                # Ensure item has at least a name or content
                if item.get("name") or item.get("content") or item.get("type"):
                    validated_items.append(item)
                else:
                    logger.warning(f"[RECOMMENDER] Skipping invalid item: {item}")
            else:
                logger.warning(f"[RECOMMENDER] Skipping non-dict item: {type(item)}")
        
        retrieved_items = validated_items
        
        logger.info(f"[RECOMMENDER] Final retrieved_items count: {len(retrieved_items)}")
        if retrieved_items:
            # Log details about retrieved items
            for i, item in enumerate(retrieved_items[:3]):  # Log first 3 items
                if isinstance(item, dict):
                    logger.debug(f"[RECOMMENDER] Item {i}: id={item.get('id', 'N/A')}, name={item.get('name', 'N/A')}, source={item.get('source', 'N/A')}, imageUrl={'present' if item.get('imageUrl') else 'missing'}, type={item.get('type', 'clothing_item')}")
                else:
                    logger.debug(f"[RECOMMENDER] Item {i}: type={type(item)}")
        else:
            logger.warning("[RECOMMENDER] No items retrieved after validation - this may cause issues downstream")
        
        if trace_id:
            tracing_service.log_llm_call(
                trace_id=trace_id,
                agent_name="clothing_recommender",
                input_text=f"Search {search_scope} with filters {mcp_filters}",
                output_text=f"Found {len(retrieved_items)} items from {search_sources_used}",
                metadata={"tools_used": tools_used, "search_sources": search_sources_used, "fallback_used": fallback_used},
            )
        
        logger.info(f"Clothing recommender found {len(retrieved_items)} items from {search_sources_used}")
        
        return {
            "retrieved_items": retrieved_items,  # Always a list, never None
            "user_profile": user_profile,
            "style_dna": style_dna,
            "search_sources_used": search_sources_used,
            "fallback_used": fallback_used,
        }
        
    except Exception as e:
        logger.error(f"Clothing recommender failed: {e}", exc_info=True)
        if trace_id:
            tracing_service.log_error(trace_id=trace_id, error=e)
        
        # Try to extract any partial results from state if available
        partial_items = []
        try:
            # Check if we have any items from previous iteration
            previous_items = state.get("retrieved_items") or []
            if previous_items and isinstance(previous_items, list):
                partial_items = previous_items[:5]  # Keep some previous items as fallback
                logger.info(f"[RECOMMENDER] Using {len(partial_items)} items from previous iteration as fallback")
        except Exception:
            pass
        
        # Always return a list, never None
        return {
            "retrieved_items": partial_items,  # Always a list
            "user_profile": None,
            "style_dna": None,
            "search_sources_used": ["error"],
            "fallback_used": True,
            "metadata": {
                **state.get("metadata", {}),
                "recommender_error": str(e),
                "error_type": type(e).__name__,
            },
        }
