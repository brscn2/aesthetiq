from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from mcp_servers.commerce_server.schemas import Category
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
    elif hasattr(obj, '__dict__'):  # Handle ObjectId and similar
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


def _to_result(
    raw: Dict[str, Any],
    og_image: Optional[str] = None,
    og_title: Optional[str] = None,
    og_description: Optional[str] = None,
) -> WebSearchResult:
    # Clean raw dict to remove non-serializable objects
    cleaned_raw = _clean_for_json(raw)
    return WebSearchResult(
        title=raw.get("title") or raw.get("name") or "",
        url=raw.get("url") or raw.get("link") or "",
        content=raw.get("content") or raw.get("snippet"),
        score=raw.get("score"),
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


async def search_retailer_items(query: str, max_results: int = 5) -> List[WebSearchResult]:
    """Search for clothing items from retailer websites only.
    
    Implements cache-first strategy:
    1. Check database for fresh items (updated within 7 days)
    2. If found, return from database
    3. If not found, use Google Custom Search API
    4. Store Google results in database
    5. Return results
    
    Args:
        query: Search query for clothing items
        max_results: Maximum number of results to return
        
    Returns:
        List of WebSearchResult objects with OG tags populated
    """
    settings = get_settings()
    freshness_days = settings.CACHE_FRESHNESS_DAYS
    
    # Step 1: Check database for fresh items
    try:
        # Calculate freshness threshold
        freshness_threshold = datetime.utcnow() - timedelta(days=freshness_days)
        
        # Use semantic search to find matching items
        # Query database directly with freshness filter
        from mcp_servers.commerce_server import db as commerce_db
        from mcp_servers.commerce_server.tools import _doc_to_item, _cosine_similarity
        
        # Query retailitems collection directly with freshness and embedding filters
        from mcp_servers.shared.mongo import get_collection
        
        # Use retailitems collection for crawler-scraped items
        coll = get_collection(settings.MONGODB_DB_COMMERCE, settings.MONGODB_COLLECTION_RETAIL)
        db_query = {
            "updatedAt": {"$gte": freshness_threshold},
            "embedding": {"$ne": None},
        }
        cursor = coll.find(db_query).limit(200)
        fresh_docs = await cursor.to_list(length=200)
        
        if not fresh_docs:
            logger.info("No fresh items in database, falling back to Google search")
            commerce_results = []
        else:
            # Perform semantic search on fresh items
            query_emb = await embed_text(query)
            results = []
            
            for doc in fresh_docs:
                item = _doc_to_item(doc)
                
                # Use pre-computed embedding
                if item.embedding:
                    item_emb = item.embedding
                    score = _cosine_similarity(query_emb, item_emb)
                    results.append({"item": item, "score": score})
            
            # Sort by score and take top results
            results.sort(key=lambda r: r["score"], reverse=True)
            commerce_results = results[:max_results]
        
        if commerce_results:
            logger.info(f"Found {len(commerce_results)} fresh items in database for query: {query[:50]}")
            # Convert CommerceItems to WebSearchResult format
            results = []
            for result in commerce_results:
                item = result["item"]
                results.append(
                    WebSearchResult(
                        title=item.name,
                        url=item.productUrl,
                        content=item.description or "",
                        score=result.get("score"),
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
        logger.warning(f"Error checking database cache: {error_msg}, falling back to Google search")
    
    # Step 2: Fallback to Google Custom Search
    logger.info(f"No fresh items in database, using Google Custom Search for query: {query[:50]}")
    
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
        
        # Step 3: Process and store results in database
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
            
            # Create retail item document (for retailitems collection)
            item_data = {
                "name": title,
                "description": description,
                "imageUrl": image_url,
                "category": Category.TOP,  # Default, could be improved with category detection
                "retailerId": retailer_id or "",
                "productUrl": url,
                "inStock": True,
                "currency": "USD",
                "colors": [],  # Could extract from image later
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
                )
            )
        
        logger.info(f"Stored {stored_count} items from Google search in database")
        return web_results[:max_results]
        
    except Exception as e:
        logger.error(f"Error in Google Custom Search fallback: {e}")
        return []

