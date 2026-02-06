from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from pydantic import BaseModel, Field

from mcp_servers.shared.schemas import Category
from mcp_servers.core.config import get_settings
from mcp_servers.shared.embeddings_client import embed_text
from mcp_servers.web_search_server.google_client import GoogleCustomSearchClient
from mcp_servers.web_search_server.og_scraper import OpenGraphScraper
from mcp_servers.web_search_server.schemas import WebSearchResult

logger = logging.getLogger(__name__)

# Allowed retailer domains for clothing searches
ALLOWED_RETAILER_DOMAINS = [
    "uniqlo.com",
    "www.uniqlo.com",
    "zalando.com",
    "www.zalando.com",
    "zalando.de",
    "www.zalando.de",
    "zalando.fr",
    "www.zalando.fr",
    "zalando.co.uk",
    "www.zalando.co.uk",
]

# Domains to exclude (social media, etc.)
EXCLUDED_DOMAINS = [
    "instagram.com",
    "www.instagram.com",
    "pinterest.com",
    "www.pinterest.com",
    "facebook.com",
    "www.facebook.com",
    "twitter.com",
    "www.twitter.com",
    "x.com",
    "www.x.com",
]


# -----------------------------------------------------------------------------
# Filter models
# -----------------------------------------------------------------------------


class RetailerFilters(BaseModel):
    """Filters for querying retailer items."""

    category: Optional[Category] = None
    subCategory: Optional[str] = None
    brand: Optional[str] = None
    gender: Optional[str] = None
    colors: Optional[List[str]] = None  # Filter by colors (any match)
    # Generic escape hatch for additional filters
    extra: Dict[str, Any] = Field(default_factory=dict)


def _clean_for_json(obj: Any) -> Any:
    """Recursively clean non-JSON-serializable objects from dicts/lists.

    Converts datetime objects to ISO format strings and handles ObjectId
    and other non-serializable types.
    """
    if isinstance(obj, dict):
        return {k: _clean_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_clean_for_json(item) for item in obj]
    elif isinstance(obj, (datetime, date)):
        return obj.isoformat()
    elif hasattr(obj, "__dict__"):  # Handle ObjectId and similar
        return str(obj)
    return obj


def _extract_domain(url: str) -> str:
    """Extract domain from URL."""
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        # Remove 'www.' prefix for comparison
        if domain.startswith("www."):
            domain = domain[4:]
        return domain
    except Exception:
        return ""


def _is_allowed_retailer_domain(url: str) -> bool:
    """Check if URL belongs to an allowed retailer domain."""
    domain = _extract_domain(url)
    return domain in ALLOWED_RETAILER_DOMAINS


def _is_excluded_domain(url: str) -> bool:
    """Check if URL belongs to an excluded domain."""
    domain = _extract_domain(url)
    return domain in EXCLUDED_DOMAINS


def _normalize_item_fields(item: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize commerceitems schema fields to flat structure expected by current code.

    Converts:
    - price.amount/100 → price (float, handles None gracefully → 0.0)
    - price.currency → currency (default "USD")
    - primaryImageUrl or imageUrls[0] → imageUrl
    - sourceUrl → productUrl

    Args:
        item: Raw item document from MongoDB (commerceitems or retailitems)

    Returns:
        Normalized item dict with flat field structure
    """
    normalized = item.copy()

    # Handle nested price structure (commerceitems) vs flat price (retailitems)
    if "price" in item and isinstance(item["price"], dict):
        # commerceitems: {amount: 2995, currency: "EUR", formatted: "29.95 €"}
        price_obj = item["price"]
        normalized["price"] = (
            price_obj.get("amount", 0) / 100.0
            if price_obj.get("amount") is not None
            else 0.0
        )
        normalized["currency"] = price_obj.get("currency", "USD")
    elif "price" not in item or item.get("price") is None:
        # Handle missing price
        normalized["price"] = 0.0
        normalized.setdefault("currency", "USD")

    # Handle image URL mapping: primaryImageUrl or imageUrls[0] → imageUrl
    if "primaryImageUrl" in item:
        normalized["imageUrl"] = item["primaryImageUrl"]
    elif (
        "imageUrls" in item
        and isinstance(item["imageUrls"], list)
        and len(item["imageUrls"]) > 0
    ):
        normalized["imageUrl"] = item["imageUrls"][0]
    elif "imageUrl" not in item:
        normalized["imageUrl"] = ""

    # Handle product URL mapping: sourceUrl → productUrl
    if "sourceUrl" in item:
        normalized["productUrl"] = item["sourceUrl"]
    elif "productUrl" not in item:
        normalized["productUrl"] = ""

    return normalized


def _to_result(
    raw: Dict[str, Any],
    og_image: Optional[str] = None,
    og_title: Optional[str] = None,
    og_description: Optional[str] = None,
    gender: Optional[str] = None,
) -> WebSearchResult:
    # Clean raw dict to remove non-serializable objects
    cleaned_raw = _clean_for_json(raw)
    return WebSearchResult(
        title=raw.get("title") or raw.get("name") or "",
        url=raw.get("url") or raw.get("link") or "",
        content=raw.get("content") or raw.get("snippet"),
        score=raw.get("score"),
        gender=gender,
        raw=cleaned_raw,
        og_image=og_image,
        og_title=og_title,
        og_description=og_description,
    )


async def web_search(
    query: str,
    max_results: int = 5,
    filter_retailers_only: bool = False,
    scrape_og_tags: bool = True,
) -> List[WebSearchResult]:
    """Perform web search using Google Custom Search API.

    Args:
        query: Search query string
        max_results: Maximum number of results to return
        filter_retailers_only: If True, only return results from allowed retailer domains
        scrape_og_tags: If True, scrape Open Graph tags from URLs

    Returns:
        List of WebSearchResult objects
    """
    try:
        client = GoogleCustomSearchClient()

        # If filtering to retailers only, restrict search to retailer domains
        site_restrict = ALLOWED_RETAILER_DOMAINS if filter_retailers_only else None

        # Search with Google
        raw_results = await client.search(
            query,
            max_results=max_results,
            site_restrict=site_restrict,
        )

        # Filter results by domain if needed (additional filtering for safety)
        if filter_retailers_only:
            filtered_results = []
            for result in raw_results:
                url = result.get("url") or result.get("link") or ""
                if _is_allowed_retailer_domain(url) and not _is_excluded_domain(url):
                    filtered_results.append(result)
            raw_results = filtered_results[:max_results]
        else:
            # Still filter out excluded domains
            filtered_results = []
            for result in raw_results:
                url = result.get("url") or result.get("link") or ""
                if not _is_excluded_domain(url):
                    filtered_results.append(result)
            raw_results = filtered_results[:max_results]

        # Scrape OG tags if requested
        if scrape_og_tags and raw_results:
            scraper = OpenGraphScraper()
            results = []
            for raw in raw_results:
                url = raw.get("url") or raw.get("link") or ""
                if url:
                    og_data = await scraper.scrape(url)
                    results.append(
                        _to_result(
                            raw,
                            og_image=og_data.get("og_image"),
                            og_title=og_data.get("og_title"),
                            og_description=og_data.get("og_description"),
                        )
                    )
                else:
                    results.append(_to_result(raw))
            return results
        else:
            return [_to_result(r) for r in raw_results]
    except Exception as e:
        logger.error(f"Error in web_search: {e}")
        return []


async def search_trends(topic: str, max_results: int = 5) -> List[WebSearchResult]:
    q = f"fashion trends {topic} 2026"
    return await web_search(q, max_results=max_results)


async def search_blogs(query: str, max_results: int = 5) -> List[WebSearchResult]:
    q = f"{query} site:fashion blog OR site:blog"
    return await web_search(q, max_results=max_results)


async def search_retailer_items(
    query: str,
    max_results: int = 5,
    disliked_item_ids: Optional[List[str]] = None,
    filters: Optional[RetailerFilters] = None,
) -> List[WebSearchResult]:
    """Search for clothing items from retailer websites.

    Implements commerceitems-first strategy with optional retailitems fallback:
    1. Check commerceitems collection for matching items (no freshness filter)
    2. If empty and ENABLE_RETAILITEMS_FALLBACK=True, check retailitems collection (with 7-day freshness)
    3. If still empty, use Google Custom Search API
    4. Store Google results in retailitems collection
    5. Return results

    Supports soft de-ranking of previously disliked items (multiplies score by 0.85).
    Supports filtering by category, subCategory, brand, and colors.

    Args:
        query: Search query for clothing items
        max_results: Maximum number of results to return
        disliked_item_ids: Optional list of item IDs to soft-de-rank in results
        filters: Optional filters for category, subCategory, brand, and colors

    Returns:
        List of WebSearchResult objects with OG tags populated
    """
    settings = get_settings()
    freshness_days = settings.CACHE_FRESHNESS_DAYS

    # Step 1: Check commerceitems collection (primary, curated collection)
    try:
        # Use semantic search to find matching items
        from mcp_servers.commerce_server import db as commerce_db
        from mcp_servers.commerce_server.tools import _doc_to_item, _cosine_similarity
        from mcp_servers.shared.mongo import get_collection

        # Use commerceitems collection as primary source
        coll = get_collection(
            settings.MONGODB_DB_COMMERCE, settings.MONGODB_COLLECTION_COMMERCE
        )
        db_query = {
            "embedding": {"$ne": None},
            "isActive": True,  # Only return active items from commerceitems
        }

        # Apply filters if provided
        if filters:
            if filters.category:
                db_query["category"] = filters.category.value
            if filters.subCategory:
                db_query["subCategory"] = filters.subCategory
            if filters.brand:
                # Case-insensitive partial match
                db_query["brand"] = {"$regex": filters.brand, "$options": "i"}
            if filters.gender:
                gender_value = filters.gender.upper()
                db_query["gender"] = {"$in": [gender_value, "UNISEX"]}
            if filters.colors:
                # Match any of the specified colors
                db_query["colors"] = {"$in": filters.colors}

        cursor = coll.find(db_query).limit(200)
        commerce_docs = await cursor.to_list(length=200)

        if not commerce_docs:
            logger.info(f"No items in commerceitems collection for query: {query[:50]}")
            commerce_results = []
        else:
            # Perform semantic search on commerceitems
            query_emb = await embed_text(query)
            results = []

            for doc in commerce_docs:
                # Normalize fields before converting to item
                normalized_doc = _normalize_item_fields(doc)
                item = _doc_to_item(normalized_doc)

                # Use pre-computed embedding
                if item.embedding:
                    item_emb = item.embedding
                    score = _cosine_similarity(query_emb, item_emb)
                else:
                    score = 0.0

                # Soft de-rank disliked items (reduce score by 15%)
                if disliked_item_ids and item.id in disliked_item_ids:
                    score = score * 0.85
                    logger.debug(
                        f"Soft de-ranking disliked item {item.id}: score {score:.3f}"
                    )

                results.append({"item": item, "score": score})

            # Sort by score and take top results
            results.sort(key=lambda r: r["score"], reverse=True)
            commerce_results = results[:max_results]

        # Step 2: Fallback to retailitems if commerceitems empty and flag enabled
        if not commerce_results and settings.ENABLE_RETAILITEMS_FALLBACK:
            logger.info("Falling back to retailitems collection")
            try:
                # Calculate freshness threshold for retailitems
                freshness_threshold = datetime.utcnow() - timedelta(days=freshness_days)

                # Query retailitems collection with freshness filter
                retail_coll = get_collection(
                    settings.MONGODB_DB_COMMERCE, settings.MONGODB_COLLECTION_RETAIL
                )
                retail_query = {
                    "updatedAt": {"$gte": freshness_threshold},
                    "embedding": {"$ne": None},
                }

                # Apply same filters to retailitems
                if filters:
                    if filters.category:
                        retail_query["category"] = filters.category.value
                    if filters.subCategory:
                        retail_query["subCategory"] = filters.subCategory
                    if filters.brand:
                        retail_query["brand"] = {
                            "$regex": filters.brand,
                            "$options": "i",
                        }
                    if filters.gender:
                        gender_value = filters.gender.upper()
                        retail_query["gender"] = {"$in": [gender_value, "UNISEX"]}
                    if filters.colors:
                        retail_query["colors"] = {"$in": filters.colors}

                retail_cursor = retail_coll.find(retail_query).limit(200)
                retail_docs = await retail_cursor.to_list(length=200)

                if retail_docs:
                    query_emb = await embed_text(query)
                    results = []

                    for doc in retail_docs:
                        # Normalize fields (retailitems already has flat structure, but normalize anyway)
                        normalized_doc = _normalize_item_fields(doc)
                        item = _doc_to_item(normalized_doc)

                        if item.embedding:
                            item_emb = item.embedding
                            score = _cosine_similarity(query_emb, item_emb)
                        else:
                            score = 0.0

                        if disliked_item_ids and item.id in disliked_item_ids:
                            score = score * 0.85

                        results.append({"item": item, "score": score})

                    results.sort(key=lambda r: r["score"], reverse=True)
                    commerce_results = results[:max_results]
                    logger.info(
                        f"Found {len(commerce_results)} items in retailitems fallback"
                    )
            except Exception as e:
                logger.warning(f"Error in retailitems fallback: {e}")
                commerce_results = []

        if commerce_results:
            logger.info(
                f"Returning {len(commerce_results)} items from database for query: {query[:50]}"
            )
            # Convert items to WebSearchResult format
            results = []
            for result in commerce_results:
                item = result["item"]
                item_gender = getattr(item, "gender", None)
                item_category = getattr(item, "category", None)
                item_subcategory = getattr(item, "subCategory", None)
                if item_category and hasattr(item_category, "value"):
                    item_category = item_category.value
                results.append(
                    WebSearchResult(
                        title=item.name,
                        url=item.productUrl,
                        content=item.description or "",
                        score=result.get("score"),
                        gender=item_gender,
                        category=item_category,
                        subCategory=item_subcategory,
                        raw={},
                        og_image=item.imageUrl,
                        og_title=item.name,
                        og_description=item.description,
                    )
                )
            return results[:max_results]
    except Exception as e:
        # Safely log error without datetime serialization issues
        error_msg = str(e)
        logger.warning(
            f"Error checking database collections: {error_msg}, falling back to Google search"
        )

    # Step 3: Fallback to Google Custom Search
    logger.info(
        f"No items in database collections, using Google Custom Search for query: {query[:50]}"
    )

    try:
        client = GoogleCustomSearchClient()
        raw_results = await client.search(
            query,
            max_results=max_results,
            site_restrict=ALLOWED_RETAILER_DOMAINS,
        )

        if not raw_results:
            logger.info("No results from Google Custom Search")
            return []

        # Step 4: Process and store results in retailitems collection
        scraper = OpenGraphScraper()
        web_results = []
        stored_count = 0

        for raw in raw_results:
            url = raw.get("url") or raw.get("link") or ""
            if not url:
                continue

            # Scrape OG tags
            og_data = await scraper.scrape(url)

            # Extract domain to determine retailer
            domain = _extract_domain(url)
            retailer_id = None  # TODO: Map domain to retailerId if needed

            # Try to extract product information
            title = og_data.get("og_title") or raw.get("title") or ""
            image_url = og_data.get("og_image") or ""
            description = og_data.get("og_description") or raw.get("content") or ""

            # Determine category - use filter if provided, otherwise default to TOP
            item_category = (
                filters.category if filters and filters.category else Category.TOP
            )
            item_subcategory = (
                filters.subCategory if filters and filters.subCategory else None
            )

            # Create retail item document (for retailitems collection)
            item_data = {
                "name": title,
                "description": description,
                "imageUrl": image_url,
                "category": item_category,
                "subCategory": item_subcategory,
                "retailerId": retailer_id or "",
                "productUrl": url,
                "inStock": True,
                "currency": "USD",
                "colors": [],  # Could extract from image later
                "gender": (
                    filters.gender.upper() if filters and filters.gender else None
                ),
                "tags": [],
                "metadata": {
                    "source": "google_search",
                    "query": query,
                    "scraped_at": datetime.utcnow().isoformat(),
                },
            }

            # Generate embedding for the item
            try:
                embed_text_str = f"{title} {description}"
                embedding = await embed_text(embed_text_str)
                item_data["embedding"] = embedding
            except Exception as e:
                logger.warning(f"Failed to generate embedding for {url}: {e}")

            # Store in retailitems collection
            try:
                await commerce_db.upsert_retail_item(item_data)
                stored_count += 1
            except Exception as e:
                logger.warning(f"Failed to store item {url} in database: {e}")

            # Create WebSearchResult - clean raw dict to remove non-serializable objects
            cleaned_raw = _clean_for_json(raw)
            web_results.append(
                WebSearchResult(
                    title=title,
                    url=url,
                    content=description,
                    score=None,
                    raw=cleaned_raw,
                    og_image=image_url,
                    og_title=title,
                    og_description=description,
                    gender=(
                        filters.gender.upper() if filters and filters.gender else None
                    ),
                    category=(
                        filters.category.value
                        if filters and filters.category
                        else None
                    ),
                    subCategory=(
                        filters.subCategory if filters and filters.subCategory else None
                    ),
                )
            )

        logger.info(f"Stored {stored_count} items from Google search in database")
        return web_results[:max_results]

    except Exception as e:
        logger.error(f"Error in Google Custom Search fallback: {e}")
        return []
