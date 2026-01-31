from __future__ import annotations

import logging
from typing import Dict, Optional
from urllib.parse import urljoin, urlparse

import httpx

logger = logging.getLogger(__name__)


class OpenGraphScraper:
    """Scrape Open Graph tags from web pages.
    
    Similar to how WhatsApp extracts preview cards - makes a quick HTTP request
    and parses the <head> section for og:image, og:title, and og:description tags.
    """
    
    def __init__(self, timeout: float = 10.0):
        """Initialize the scraper.
        
        Args:
            timeout: Request timeout in seconds
        """
        self.timeout = timeout
        self._user_agent = (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
    
    async def scrape(self, url: str) -> Dict[str, Optional[str]]:
        """Scrape OG tags from a URL.
        
        Args:
            url: The URL to scrape
            
        Returns:
            Dictionary with keys: og_image, og_title, og_description
            Values are None if tag is not found or scraping fails
        """
        result = {
            "og_image": None,
            "og_title": None,
            "og_description": None,
        }
        
        try:
            async with httpx.AsyncClient(
                timeout=self.timeout,
                follow_redirects=True,
                headers={"User-Agent": self._user_agent},
            ) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                
                # Only process HTML content
                content_type = resp.headers.get("content-type", "").lower()
                if "text/html" not in content_type:
                    logger.debug(f"URL {url} is not HTML (content-type: {content_type})")
                    return result
                
                html = resp.text
                base_url = str(resp.url)  # Get final URL after redirects
                
                # Parse OG tags from HTML
                og_data = self._parse_og_tags(html, base_url)
                result.update(og_data)
                
        except httpx.TimeoutException:
            logger.warning(f"Timeout while scraping OG tags from {url}")
        except httpx.HTTPStatusError as e:
            logger.warning(f"HTTP error {e.response.status_code} while scraping {url}")
        except Exception as e:
            logger.warning(f"Error scraping OG tags from {url}: {e}")
        
        return result
    
    def _parse_og_tags(self, html: str, base_url: str) -> Dict[str, Optional[str]]:
        """Parse OG tags from HTML content.
        
        Uses simple regex/string parsing to find meta tags in the <head> section.
        This is faster than BeautifulSoup and sufficient for our needs.
        
        Args:
            html: HTML content
            base_url: Base URL for resolving relative image URLs
            
        Returns:
            Dictionary with og_image, og_title, og_description
        """
        result = {
            "og_image": None,
            "og_title": None,
            "og_description": None,
        }
        
        # Extract <head> section for faster parsing
        head_start = html.find("<head")
        if head_start == -1:
            head_start = html.find("<HEAD")
        if head_start == -1:
            logger.debug("No <head> tag found in HTML")
            return result
        
        head_end = html.find("</head>", head_start)
        if head_end == -1:
            head_end = html.find("</HEAD>", head_start)
        if head_end == -1:
            # If no closing tag, parse the rest of the document
            head_end = len(html)
        
        head_content = html[head_start:head_end]
        
        # Look for og:image
        og_image = self._extract_meta_property(head_content, "og:image")
        if og_image:
            # Resolve relative URLs
            result["og_image"] = urljoin(base_url, og_image)
        
        # Look for og:title
        og_title = self._extract_meta_property(head_content, "og:title")
        if og_title:
            result["og_title"] = og_title.strip()
        
        # Look for og:description
        og_description = self._extract_meta_property(head_content, "og:description")
        if og_description:
            result["og_description"] = og_description.strip()
        
        return result
    
    def _extract_meta_property(self, html: str, property_name: str) -> Optional[str]:
        """Extract content from a meta property tag.
        
        Looks for: <meta property="og:image" content="...">
        or: <meta property='og:image' content='...'>
        
        Args:
            html: HTML content to search
            property_name: The property name (e.g., "og:image")
            
        Returns:
            The content value or None if not found
        """
        # Try with double quotes
        pattern1 = f'property="{property_name}"'
        pattern2 = f'property=\'{property_name}\''
        
        for pattern in [pattern1, pattern2]:
            idx = html.find(pattern)
            if idx != -1:
                # Find the content attribute after the property
                content_start = html.find('content="', idx)
                if content_start == -1:
                    content_start = html.find("content='", idx)
                if content_start != -1:
                    # Extract the content value
                    quote_char = html[content_start + 8]  # After 'content='
                    content_start += 9  # After 'content="' or "content='"
                    content_end = html.find(quote_char, content_start)
                    if content_end != -1:
                        return html[content_start:content_end]
        
        return None
