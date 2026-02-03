"""Clothing Recommender Agent for retrieving clothing items.

This agent handles the "clothing" intent path:
- Fetches user context (profile, style DNA)
- Searches commerce, wardrobe, or both based on scope
- Uses web search as fallback when no items found
- Integrates user feedback to soft-de-rank disliked items
- Handles outfit decomposition for occasion-based requests
"""
from typing import Any, Dict, List, Optional
import hashlib
import json
import asyncio

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


async def _get_user_feedback_decay_days(user_id: str) -> int:
    """
    Fetch user-configured decay days for disliked feedback.
    Defaults to 7 days if unavailable.
    """
    try:
        tools_dict = await get_mcp_tools()
        for tool in tools_dict:
            if hasattr(tool, 'name') and tool.name == 'get_user_profile':
                result = await tool.ainvoke({"user_id": user_id})
                profile = result.get("profile") if isinstance(result, dict) else result
                settings = (profile or {}).get("settings", {}) if isinstance(profile, dict) else {}
                decay_days = settings.get("feedbackDecayDays") or settings.get("feedback_decay_days")
                if isinstance(decay_days, int) and decay_days > 0:
                    return decay_days
                return 7
        return 7
    except Exception as e:
        logger.error(f"Error fetching feedback decay days: {e}")
        return 7


async def _get_user_disliked_items(user_id: str, decay_days: Optional[int] = None) -> List[str]:
    """
    Fetch list of user's disliked items for soft-de-ranking in search.
    
    Args:
        user_id: The user's ID
        
    Returns:
        List of disliked item IDs
    """
    try:
        # Get MCP tools to access wardrobe server
        tools_dict = await get_mcp_tools()
        
        # Look for the get_disliked_items_for_search tool
        for tool in tools_dict:
            if hasattr(tool, 'name') and tool.name == 'get_disliked_items_for_search':
                logger.info(f"Found get_disliked_items_for_search tool")
                # Invoke the tool
                result = await tool.ainvoke({"user_id": user_id, "decay_days": decay_days})
                if isinstance(result, list):
                    logger.info(f"Retrieved {len(result)} disliked items for user {user_id}")
                    return result
                if isinstance(result, dict):
                    item_ids = result.get("item_ids") or []
                    if isinstance(item_ids, list):
                        logger.info(f"Retrieved {len(item_ids)} disliked items for user {user_id}")
                        return item_ids
                return []
        
        logger.debug("get_disliked_items_for_search tool not available")
        return []
    except Exception as e:
        logger.error(f"Error fetching disliked items: {e}")
        return []


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
**WARDROBE-FIRST PHILOSOPHY**: Suggest items users already own before showing new purchases.

**CRITICAL: Valid Category Values**
The system ONLY supports these 4 categories (case-sensitive, all caps):
- TOP (upper body: jackets, coats, sweaters, shirts, blouses, dresses, tank tops, crop tops, hoodies, etc.)
- BOTTOM (lower body: pants, jeans, shorts, skirts, trousers, sweatpants, leggings, etc.)
- SHOE (all footwear: sneakers, boots, heels, sandals, loafers, flip-flops, flats, mules, etc.)
- ACCESSORY (bags, jewelry, belts, scarves, hats, sunglasses, watches, etc.)

**Category Mapping - - READ CAREFULLY - Use Meaning, Not a Fixed List**
Map the user's wording to one of the 4 categories above by meaning, then set subCategory to a sensible label (title case).
- If the user says a term NOT listed below, infer the category from what the item is (e.g. sandals, flip-flops, loafers → SHOE; tank top, crop top → TOP) and use their term in title case for subCategory (e.g. "Sandals", "Flip-Flops", "Loafers", "Tank Top").
- Examples (use these when they fit; otherwise infer similarly):
  - Jackets, Coats, Blazers, Cardigans → category: "TOP", subCategory: "Jacket" (or "Coat", "Blazer", "Cardigan")
  - Dresses, Shirts, T-Shirts, Blouses, Sweaters, Hoodies → category: "TOP", subCategory: match the term (e.g. "Dress", "Shirt", "Sweater")
  - Jeans, Pants, Trousers, Shorts, Skirts, Leggings, Sweatpants → category: "BOTTOM", subCategory: match the term (e.g. "Jeans", "Shorts", "Skirt")
  - Sneakers, Boots, Heels, Sandals, Loafers, Flip-Flops → category: "SHOE", subCategory: match the term (e.g. "Sneakers", "Sandals", "Loafers")
  - Bags, Purses, Backpacks, Jewelry, Belts, Scarves, Hats, Sunglasses → category: "ACCESSORY", subCategory: match the term (e.g. "Bag", "Jewelry", "Belt", "Hat")

NEVER use categories like "OUTERWEAR", "CLOTHING", "APPAREL" - these are INVALID. Use exactly one of: TOP, BOTTOM, SHOE, ACCESSORY.

**Tool Usage Guidelines:**

1. Get user's style_dna FIRST to personalize recommendations

2. **WARDROBE-FIRST APPROACH** (for "both" or "wardrobe" scope):
    - ALWAYS search `search_wardrobe_items` first if user has items in their wardrobe
    - This finds items they already own (fastest, free, sustainable)
    - If wardrobe search returns good results, return those immediately
    - Only add retailer items if wardrobe search returns few results (<3 items)

3. **For clothing searches**:
   - For wardrobe scope: use `search_wardrobe_items` with filters (category, subCategory)
    - For commerce scope: use `search_retailer_items` - This searches the retailitems collection with fresh, crawler-scraped items from retailers like UNIQLO and Zalando
    - For both scope: Search wardrobe FIRST, then commerce if needed
   
   **MANDATORY: ALWAYS use filters parameter with category and subCategory**
   - You MUST extract the category and subCategory from the user's query using the mapping rules above
   - Category must be EXACTLY one of: "TOP", "BOTTOM", "SHOE", "ACCESSORY" (all caps, as written)
   - SubCategory is the specific item type (use title case, e.g., "Bag", "Jacket", "Jeans")
   - **IMPORTANT: Only include filter fields that have actual values**
   - DO NOT pass None or empty values for optional list fields (colors, disliked_item_ids)
   - Only include: category (required), subCategory (required) in the filters dict
   - Omit optional fields like colors, brand if not being used
   - Example correct filters: {"category": "ACCESSORY", "subCategory": "Bag"}
   - Example WRONG filters: {"category": "ACCESSORY", "subCategory": "Bag", "colors": None} ← Do NOT do this
   - NEVER call search_retailer_items or search_wardrobe_items without the filters parameter
   - This prevents returning wrong item categories (e.g., jeans when searching for bags)

4. **IMPORTANT: Handle outfit decomposition**
   - If you receive decomposed sub_categories (e.g., for a gym outfit: ["T-shirt", "Sweatpants", "Sneakers"]):
      * Search for EACH sub_category separately in wardrobe first
      * Then search commerce if wardrobe results are sparse
      * Combine results prioritizing wardrobe items over new items
    - Example: For gym outfit with "both" scope:
      1. Search wardrobe for T-shirt with filters: {category: "TOP", subCategory: "T-Shirt"}
      2. Search wardrobe for Sweatpants with filters: {category: "BOTTOM", subCategory: "Sweatpants"}
      3. Search wardrobe for Sneakers with filters: {category: "SHOE", subCategory: "Sneakers"}
      4. If any category missing from wardrobe, search commerce for that category only with proper filters

5. **Graceful Fallback Ranking**:
   - Search tools return results ranked by relevance + Style DNA alignment (70% semantic + 30% color season)
   - If NO items match the user's Style DNA palette: Return all results ranked by semantic relevance alone
   - NEVER return zero results - keep searching with broader terms if needed
   - If Style DNA search fails: Fall back to semantic search without color filtering

6. Keep tool usage minimal - ideally 2-5 calls maximum (style_dna + searches for each item type).
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
    # For web items, we'll generate ID from URL later
    item_id = None
    if source != "web":
        item_id = item.get("id") or item.get("_id")
        if item_id is None:
            # Fallback: try to get from raw dict if it exists
            raw = item.get("raw", {})
            if isinstance(raw, dict):
                item_id = raw.get("id") or raw.get("_id")
        # Convert to string if it's not already
        item_id = str(item_id) if item_id is not None else ""
    
    normalized = {
        "id": item_id or "",  # Will be set for web items later
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
    
    # Handle web search results with OG tags
    if source == "web":
        # Log OG tags presence in raw item
        og_tags_present = {
            "og_image": bool(item.get("og_image")),
            "og_title": bool(item.get("og_title")),
            "og_description": bool(item.get("og_description")),
        }
        logger.info(f"[NORMALIZE] Web item OG tags present: {og_tags_present}")
        
        # For web items, prefer OG tags over default fields
        # Use og_title for name if available, otherwise use title
        og_title = item.get("og_title")
        title = item.get("title") or ""
        if og_title and og_title.strip():
            normalized["name"] = og_title.strip()
            logger.debug(f"[NORMALIZE] Using og_title for name: '{og_title[:50]}...'")
        elif title and title.strip():
            normalized["name"] = title.strip()
            logger.debug(f"[NORMALIZE] Using title for name (og_title not available): '{title[:50]}...'")
        else:
            normalized["name"] = "Web Item"
            logger.warning(f"[NORMALIZE] No og_title or title found, using default name")
        
        # Use og_image as imageUrl for web items
        og_image = item.get("og_image")
        if og_image and og_image.strip():
            normalized["imageUrl"] = og_image.strip()
            logger.debug(f"[NORMALIZE] Using og_image for imageUrl: '{og_image[:50]}...'")
        else:
            # Fallback to regular imageUrl if og_image not available
            image_url = item.get("imageUrl")
            if image_url and image_url.strip():
                normalized["imageUrl"] = image_url.strip()
                logger.debug(f"[NORMALIZE] Using fallback imageUrl (og_image not available): '{image_url[:50]}...'")
            else:
                logger.warning(f"[NORMALIZE] No og_image or imageUrl found for web item")
        
        # Use og_description for description if available
        og_description = item.get("og_description")
        if og_description and og_description.strip():
            normalized["description"] = og_description.strip()
            logger.debug(f"[NORMALIZE] Using og_description for description")
        elif item.get("content"):
            normalized["description"] = item.get("content")
            logger.debug(f"[NORMALIZE] Using content for description (og_description not available)")
        
        # Use url as productUrl for web items
        url = item.get("url")
        if url:
            normalized["productUrl"] = url
            logger.debug(f"[NORMALIZE] Using url for productUrl: '{url[:50]}...'")
            
            # Generate unique ID from URL for web items (required for frontend display)
            # Use MD5 hash of URL to create a stable, unique identifier
            url_hash = hashlib.md5(url.encode('utf-8')).hexdigest()
            normalized["id"] = url_hash
            logger.info(f"[NORMALIZE] Generated ID for web item from URL: {url_hash[:16]}... (url: {url[:50]}...)")
        else:
            logger.warning(f"[NORMALIZE] No url found for web item - cannot generate ID")
            # Fallback: generate ID from title or use a random hash
            if normalized.get("name"):
                name_hash = hashlib.md5(normalized["name"].encode('utf-8')).hexdigest()
                normalized["id"] = name_hash
                logger.warning(f"[NORMALIZE] Generated ID from name as fallback: {name_hash[:16]}...")
            else:
                # Last resort: use a hash of the entire item dict
                item_str = str(sorted(item.items()))
                item_hash = hashlib.md5(item_str.encode('utf-8')).hexdigest()
                normalized["id"] = item_hash
                logger.warning(f"[NORMALIZE] Generated ID from item dict as last resort: {item_hash[:16]}...")
        
        logger.info(f"[NORMALIZE] Normalized web item: id='{normalized.get('id')[:16] if normalized.get('id') else 'missing'}...', name='{normalized.get('name')}', imageUrl={'present' if normalized.get('imageUrl') else 'missing'}, productUrl={'present' if normalized.get('productUrl') else 'missing'}")
    else:
        # Check if this is a WebSearchResult format item (from search_retailer_items)
        # even though source is "commerce" - search_retailer_items returns WebSearchResult format
        has_og_tags = any(key in item for key in ("og_title", "og_image", "og_description"))
        has_web_fields = any(key in item for key in ("title", "url")) and not item.get("name")
        
        if has_og_tags or has_web_fields:
            # Handle as WebSearchResult format even though source is "commerce"
            logger.debug(f"[NORMALIZE] Detected WebSearchResult format item with source='commerce', handling OG tags")
            
            # Use og_title for name if available, otherwise use title
            og_title = item.get("og_title")
            title = item.get("title") or ""
            if og_title and og_title.strip():
                normalized["name"] = og_title.strip()
                logger.debug(f"[NORMALIZE] Using og_title for name: '{og_title[:50]}...'")
            elif title and title.strip():
                normalized["name"] = title.strip()
                logger.debug(f"[NORMALIZE] Using title for name (og_title not available): '{title[:50]}...'")
            else:
                normalized["name"] = "Commerce Item"
                logger.warning(f"[NORMALIZE] No og_title or title found for WebSearchResult format item")
            
            # Use og_image as imageUrl
            og_image = item.get("og_image")
            if og_image and og_image.strip():
                normalized["imageUrl"] = og_image.strip()
                logger.debug(f"[NORMALIZE] Using og_image for imageUrl: '{og_image[:50]}...'")
            else:
                # Fallback to regular imageUrl if og_image not available
                image_url = item.get("imageUrl")
                if image_url and image_url.strip():
                    normalized["imageUrl"] = image_url.strip()
                    logger.debug(f"[NORMALIZE] Using fallback imageUrl: '{image_url[:50]}...'")
                else:
                    logger.warning(f"[NORMALIZE] No og_image or imageUrl found for WebSearchResult format item")
            
            # Use og_description for description if available
            og_description = item.get("og_description")
            if og_description and og_description.strip():
                normalized["description"] = og_description.strip()
                logger.debug(f"[NORMALIZE] Using og_description for description")
            elif item.get("content"):
                normalized["description"] = item.get("content")
                logger.debug(f"[NORMALIZE] Using content for description")
            
            # Use url as productUrl
            url = item.get("url")
            if url:
                normalized["productUrl"] = url
                logger.debug(f"[NORMALIZE] Using url for productUrl: '{url[:50]}...'")
                
                # Generate unique ID from URL if not already set
                if not normalized.get("id"):
                    url_hash = hashlib.md5(url.encode('utf-8')).hexdigest()
                    normalized["id"] = url_hash
                    logger.debug(f"[NORMALIZE] Generated ID for WebSearchResult format item from URL: {url_hash[:16]}...")
            else:
                logger.warning(f"[NORMALIZE] No url found for WebSearchResult format item")
        else:
            # Standard commerce/wardrobe item handling
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
            # Commerce items: use imageUrl directly
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
        """Convert Pydantic model or dict to dict.
        
        For WebSearchResult objects, this preserves all fields including:
        - OG tags: og_image, og_title, og_description
        - Tavily fields: url, title, content, score
        """
        if isinstance(obj, BaseModel):
            # Convert Pydantic model to dict - model_dump() preserves all fields including OG tags
            result = obj.model_dump()
            keys = list(result.keys()) if isinstance(result, dict) else []
            logger.debug(f"[EXTRACT] Converted BaseModel to dict, keys: {keys}")
            # Log OG tags if present (for WebSearchResult objects)
            if isinstance(result, dict) and any(key.startswith("og_") for key in keys):
                og_fields = {k: v for k, v in result.items() if k.startswith("og_")}
                logger.debug(f"[EXTRACT] Found OG tags in BaseModel: {og_fields}")
            return result
        elif isinstance(obj, dict):
            return obj
        else:
            # Try to convert if it has model_dump method
            if hasattr(obj, "model_dump"):
                result = obj.model_dump()
                keys = list(result.keys()) if isinstance(result, dict) else []
                logger.debug(f"[EXTRACT] Converted object with model_dump() to dict, keys: {keys}")
                # Log OG tags if present
                if isinstance(result, dict) and any(key.startswith("og_") for key in keys):
                    og_fields = {k: v for k, v in result.items() if k.startswith("og_")}
                    logger.debug(f"[EXTRACT] Found OG tags in object with model_dump(): {og_fields}")
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
        # Also handles {results: [WebSearchResult, ...]} format (from WebSearchResponse)
        if "results" in tool_result:
            results_list = tool_result.get("results") or []
            logger.info(f"[EXTRACT] Processing {len(results_list)} results from 'results' key (source: {source})")
            for i, r in enumerate(results_list):
                r_dict = _convert_to_dict(r)
                if r_dict:
                    logger.debug(f"[EXTRACT] Result {i}: keys={list(r_dict.keys())}")
                    # For WebSearchResponse, results are direct WebSearchResult objects (no "item" wrapper)
                    # For other responses, results may have "item" key
                    item = r_dict.get("item") if "item" in r_dict else r_dict
                    item_dict = _convert_to_dict(item)
                    if item_dict:
                        logger.debug(f"[EXTRACT] Extracted item {i}: has id={('id' in item_dict or '_id' in item_dict)}, has imageUrl={'imageUrl' in item_dict}, has url={'url' in item_dict}")
                        # Log OG tags for web search results
                        if source == "web":
                            og_tags = {k: v for k, v in item_dict.items() if k.startswith("og_")}
                            if og_tags:
                                logger.info(f"[EXTRACT] Web item {i} OG tags: {og_tags}")
                            else:
                                logger.warning(f"[EXTRACT] Web item {i} has no OG tags! Available keys: {list(item_dict.keys())}")
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
                # Log OG tags for web search results
                if source == "web" and any(key.startswith("og_") for key in item_dict.keys()):
                    og_tags = {k: v for k, v in item_dict.items() if k.startswith("og_")}
                    logger.info(f"[EXTRACT] Web item {i} from list OG tags: {og_tags}")
                
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
    attached_outfits = state.get("attached_outfits") or []
    swap_intents = state.get("swap_intents") or []

    excluded_item_ids: set[str] = set()
    for outfit in attached_outfits:
        items = outfit.get("items", {}) if isinstance(outfit, dict) else {}
        for key in ("top", "bottom", "shoe"):
            item = items.get(key)
            if isinstance(item, dict):
                item_id = item.get("id") or item.get("_id")
                if item_id:
                    excluded_item_ids.add(str(item_id))
        for accessory in items.get("accessories", []) or []:
            if isinstance(accessory, dict):
                item_id = accessory.get("id") or accessory.get("_id")
                if item_id:
                    excluded_item_ids.add(str(item_id))
    
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

        # Prefetch user profile + style DNA for personalization (even if agent doesn’t call tools)
        prefetched_user_profile = state.get("user_profile")
        prefetched_style_dna = state.get("style_dna")
        tools_by_name = {tool.name: tool for tool in tools if hasattr(tool, "name")}

        if not prefetched_user_profile and "get_user_profile" in tools_by_name:
            try:
                tool_result = await tools_by_name["get_user_profile"].ainvoke({"user_id": user_id})
                prefetched_user_profile = _extract_dict_value(tool_result, "profile") or tool_result
                if trace_id:
                    tracing_service.log_tool_call(
                        trace_id=trace_id,
                        tool_name="get_user_profile",
                        input_params={"user_id": user_id},
                        output=str(tool_result)[:500],
                    )
            except Exception as e:
                logger.warning(f"[RECOMMENDER] Failed to prefetch user profile: {e}")

        if not prefetched_style_dna:
            for tool_name in ("get_style_dna", "get_color_season", "get_recommended_colors"):
                tool = tools_by_name.get(tool_name)
                if not tool:
                    continue
                try:
                    tool_result = await tool.ainvoke({"user_id": user_id})
                    extracted = _extract_dict_value(tool_result, "style_dna", "color_season", "colors")
                    if extracted:
                        prefetched_style_dna = {**(prefetched_style_dna or {}), **extracted} if prefetched_style_dna else extracted
                    if trace_id:
                        tracing_service.log_tool_call(
                            trace_id=trace_id,
                            tool_name=tool_name,
                            input_params={"user_id": user_id},
                            output=str(tool_result)[:500],
                        )
                except Exception as e:
                    logger.warning(f"[RECOMMENDER] Failed to prefetch {tool_name}: {e}")
        
        # Fetch user's disliked items for soft de-ranking in search results
        decay_days = await _get_user_feedback_decay_days(user_id)
        disliked_items = await _get_user_disliked_items(user_id, decay_days=decay_days)
        disliked_context = ""
        if disliked_items:
            disliked_context = f"\n\nNote: User has previously disliked {len(disliked_items)} items. These will be soft-de-ranked (reduced priority) in results if they appear."
        
        # Create and invoke the ReAct agent
        agent = create_react_agent(llm_service.llm, tools, prompt=RECOMMENDER_AGENT_PROMPT)
        
        # Build search request - let agent decide which tools to use
        filter_str = ", ".join(f"{k}={v}" for k, v in mcp_filters.items()) if mcp_filters else "none"
        
        # Handle outfit decomposition - expand search to include all decomposed sub_categories
        decomposed_items = extracted_filters.get("sub_categories", [])
        decomposition_context = ""
        if decomposed_items:
            decomposition_context = f"\n\nDECOMPOSED OUTFIT ITEMS: {', '.join(decomposed_items)}\nSearch for each of these items to build a complete outfit."
        
        # Handle search hints for outfit completion
        search_hint = extracted_filters.get("_search_hint", "")
        target_categories = extracted_filters.get("target_categories", [])
        hint_context = ""
        enhanced_message = message
        
        if search_hint:
            if target_categories:
                # Multiple categories to search - enhance the message to be more specific
                categories_str = ', '.join(target_categories)
                hint_context = f"\n\nOUTFIT COMPLETION MODE: The outfit is missing {categories_str}. Use specific search queries (NOT category names) with proper filters:"
                for cat in target_categories:
                    cat_guidance = {
                        "TOP": "For TOP category: search with queries like 'shirt', 'blouse', 'sweater', 'jacket' (NOT 'top' or 'TOP')",
                        "BOTTOM": "For BOTTOM category: search with queries like 'jeans', 'pants', 'shorts', 'skirt' (NOT 'bottom' or 'BOTTOM')",
                        "SHOE": "For SHOE category: search with queries like 'sneakers', 'boots', 'sandals', 'heels' (NOT 'shoe' or 'SHOE')",
                        "ACCESSORY": "For ACCESSORY category: search with queries like 'bag', 'necklace', 'belt', 'scarf' (NOT 'accessory' or 'ACCESSORY')",
                    }
                    hint_context += f"\n  - {cat_guidance.get(cat, '')}"
                # Enhance the user message to be more directive
                enhanced_message = f"Find items to complete this outfit: {search_hint}"
            else:
                # Single category - make it very explicit
                category = extracted_filters.get("category", "")
                if category:
                    cat_examples = {
                        "TOP": "shirts, blouses, sweaters, or jackets",
                        "BOTTOM": "jeans, pants, shorts, or skirts",
                        "SHOE": "sneakers, boots, sandals, or heels",
                        "ACCESSORY": "bags, necklaces, belts, or scarves",
                    }
                    examples = cat_examples.get(category, "items")
                    hint_context = f"\n\nSEARCH INSTRUCTION: Use specific item names in your search queries (e.g., '{examples.split(',')[0].strip()}', '{examples.split(',')[1].strip()}'), NOT the category name '{category}'. The category filter is already set to {category}."
                    enhanced_message = f"Find {examples} to complete this outfit"
                else:
                    hint_context = f"\n\nSEARCH GUIDANCE: When searching, use specific item names: {search_hint}"
        
        refinement_context = ""
        if refinement_notes and iteration > 0:
            refinement_context = f"\n\nRefinement needed (attempt {iteration + 1}): {', '.join(refinement_notes)}"

        outfit_context = ""
        if attached_outfits:
            outfit_summaries = []
            for outfit in attached_outfits:
                name = outfit.get("name", "Outfit") if isinstance(outfit, dict) else "Outfit"
                items = outfit.get("items", {}) if isinstance(outfit, dict) else {}
                present = []
                if items.get("top"):
                    present.append("top")
                if items.get("bottom"):
                    present.append("bottom")
                if items.get("shoe"):
                    present.append("shoes")
                if items.get("accessories"):
                    present.append("accessories")
                outfit_summaries.append(f"{name} (has {', '.join(present) or 'no items'})")
            outfit_context = f"\n\nAttached outfits: {', '.join(outfit_summaries)}"

        swap_context = ""
        if swap_intents:
            swap_descriptions = []
            for intent in swap_intents:
                category = intent.get("category", "item")
                outfit_id = intent.get("outfitId")
                swap_descriptions.append(f"{category} for outfit {outfit_id}")
            swap_context = f"\n\nSwap intents: {', '.join(swap_descriptions)}"
        
        profile_context = f"\n\nUser profile: {prefetched_user_profile}" if prefetched_user_profile else ""
        style_context = f"\n\nUser style DNA: {prefetched_style_dna}" if prefetched_style_dna else ""

        search_request = f"""User request: {enhanced_message}
    User ID: {user_id}
    Search scope: {search_scope}
    Filters: {filter_str}{decomposition_context}{hint_context}{refinement_context}{disliked_context}{profile_context}{style_context}{outfit_context}{swap_context}"""
        
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
        user_profile = prefetched_user_profile
        style_dna = prefetched_style_dna
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
                    elif "commerce" in tool_name or tool_name == "search_retailer_items":
                        # search_retailer_items searches retailitems collection (commerce)
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
                
                elif any(kw in tool_name for kw in ("wardrobe", "commerce", "web_search", "search_retailer")):
                    # search_retailer_items searches retailitems collection (commerce), not web
                    source = "wardrobe" if "wardrobe" in tool_name else (
                        "commerce" if "commerce" in tool_name or ("retailer" in tool_name and "web_search" not in tool_name)
                        else ("web" if "web" in tool_name else "commerce")
                    )
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
        
        # Deduplicate items by ID (or URL for web items) to prevent React key conflicts
        seen_ids = set()
        deduplicated_items = []
        for item in validated_items:
            if not isinstance(item, dict):
                continue
            
            # Get unique identifier for deduplication
            item_id = item.get("id")
            if not item_id and item.get("source") == "web":
                # For web items without ID yet, use URL as identifier
                item_id = item.get("url") or item.get("productUrl")
            
            if item_id:
                if item_id not in seen_ids:
                    seen_ids.add(item_id)
                    deduplicated_items.append(item)
                else:
                    logger.debug(f"[RECOMMENDER] Skipping duplicate item with id/url: {item_id[:50] if isinstance(item_id, str) else item_id}")
            else:
                # Items without ID/URL - keep them but log warning
                logger.warning(f"[RECOMMENDER] Item without ID or URL, keeping anyway: {item.get('name', 'unknown')}")
                deduplicated_items.append(item)
        
        if len(validated_items) != len(deduplicated_items):
            logger.info(f"[RECOMMENDER] Deduplicated items: {len(validated_items)} -> {len(deduplicated_items)} (removed {len(validated_items) - len(deduplicated_items)} duplicates)")
        
        retrieved_items = deduplicated_items

        if excluded_item_ids:
            before_count = len(retrieved_items)
            filtered_items = []
            for item in retrieved_items:
                if not isinstance(item, dict):
                    filtered_items.append(item)
                    continue
                item_id = item.get("id") or item.get("_id")
                if item_id and str(item_id) in excluded_item_ids:
                    continue
                filtered_items.append(item)
            retrieved_items = filtered_items
            if before_count != len(retrieved_items):
                logger.info(f"[RECOMMENDER] Excluded {before_count - len(retrieved_items)} items already in attached outfits")
        
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
            "item_feedback_applied": len(disliked_items) > 0,  # Track if feedback was applied
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
