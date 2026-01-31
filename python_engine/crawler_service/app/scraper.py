"""Playwright-based scraper for extracting product data from retailer pages."""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from playwright.async_api import async_playwright, Browser, Page

logger = logging.getLogger(__name__)


class ProductScraper:
    """Scraper for extracting product information from retailer pages."""
    
    def __init__(self, headless: bool = True):
        """Initialize the scraper.
        
        Args:
            headless: Run browser in headless mode
        """
        self.headless = headless
        self.browser: Optional[Browser] = None
    
    async def __aenter__(self):
        """Async context manager entry."""
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(headless=self.headless)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.browser:
            await self.browser.close()
    
    async def scrape_url(self, url: str, max_retries: int = 2) -> List[Dict[str, Any]]:
        """Scrape products from a single URL with retry logic.
        
        Args:
            url: The URL to scrape
            max_retries: Maximum number of retry attempts
            
        Returns:
            List of product dictionaries
        """
        if not self.browser:
            raise RuntimeError("Browser not initialized. Use async context manager.")
        
        for attempt in range(max_retries + 1):
            page = await self.browser.new_page()
            products = []
            
            try:
                if attempt > 0:
                    logger.info(f"Retry attempt {attempt} for URL: {url}")
                else:
                    logger.info(f"Scraping URL: {url}")
                
                # Increase timeout to 60 seconds for slow-loading pages
                await page.goto(url, wait_until="networkidle", timeout=60000)
                
                # Wait longer for dynamic content to load (especially for JS-rendered pages)
                await page.wait_for_timeout(5000)  # Increased from 2 to 5 seconds
                
                # Try multiple extraction methods
                # Method 1: JSON-LD structured data
                logger.debug(f"Attempting JSON-LD extraction for {url}")
                products = await self._extract_json_ld(page)
                logger.debug(f"JSON-LD extraction found {len(products)} products")
                
                # Method 2: If no JSON-LD, try DOM parsing
                if not products:
                    logger.debug(f"JSON-LD extraction failed, trying DOM parsing for {url}")
                    products = await self._extract_from_dom(page, url)
                    logger.debug(f"DOM extraction found {len(products)} products")
                
                if products:
                    logger.info(f"Extracted {len(products)} products from {url}")
                    await page.close()
                    return products
                else:
                    logger.warning(f"No products found from {url} (attempt {attempt + 1}/{max_retries + 1})")
                    if attempt < max_retries:
                        await page.close()
                        await asyncio.sleep(2)  # Wait before retry
                        continue
                
            except Exception as e:
                error_msg = str(e)
                if "timeout" in error_msg.lower():
                    logger.warning(f"Timeout error scraping {url} (attempt {attempt + 1}/{max_retries + 1}): {e}")
                else:
                    logger.error(f"Error scraping {url} (attempt {attempt + 1}/{max_retries + 1}): {e}")
                
                await page.close()
                
                # Retry on timeout or network errors
                if attempt < max_retries and ("timeout" in error_msg.lower() or "network" in error_msg.lower()):
                    await asyncio.sleep(3)  # Wait longer before retry
                    continue
                else:
                    break
        
        logger.warning(f"Failed to extract products from {url} after {max_retries + 1} attempts")
        return []
    
    async def _extract_json_ld(self, page: Page) -> List[Dict[str, Any]]:
        """Extract products from JSON-LD structured data.
        
        Args:
            page: Playwright page object
            
        Returns:
            List of product dictionaries
        """
        products = []
        
        try:
            # Find all JSON-LD scripts
            json_ld_scripts = await page.evaluate("""
                () => {
                    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
                    return scripts.map(s => {
                        try {
                            return JSON.parse(s.textContent);
                        } catch (e) {
                            return null;
                        }
                    }).filter(x => x !== null);
                }
            """)
            
            logger.debug(f"Found {len(json_ld_scripts)} JSON-LD scripts")
            
            for data in json_ld_scripts:
                # Handle different JSON-LD types
                if isinstance(data, dict):
                    # Single Product
                    if data.get("@type") == "Product":
                        product = self._parse_json_ld_product(data)
                        if product:
                            products.append(product)
                    # ProductCollection or ItemList
                    elif data.get("@type") in ["ItemList", "ProductCollection"]:
                        items = data.get("itemListElement") or data.get("hasOfferCatalog", {}).get("numberOfItems", [])
                        for item in items:
                            if isinstance(item, dict):
                                if item.get("@type") == "Product":
                                    product = self._parse_json_ld_product(item)
                                    if product:
                                        products.append(product)
                                elif "item" in item:
                                    # Nested item
                                    nested_item = item.get("item", {})
                                    if nested_item.get("@type") == "Product":
                                        product = self._parse_json_ld_product(nested_item)
                                        if product:
                                            products.append(product)
                elif isinstance(data, list):
                    # Array of products
                    for item in data:
                        if isinstance(item, dict) and item.get("@type") == "Product":
                            product = self._parse_json_ld_product(item)
                            if product:
                                products.append(product)
        
        except Exception as e:
            logger.warning(f"Error extracting JSON-LD: {e}", exc_info=True)
        
        if products:
            logger.debug(f"JSON-LD extraction successful: {len(products)} products found")
        else:
            logger.debug("JSON-LD extraction found no products")
        
        return products
    
    def _parse_json_ld_product(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Parse a JSON-LD Product object into our format.
        
        Args:
            data: JSON-LD Product object
            
        Returns:
            Product dictionary or None if invalid
        """
        try:
            # Extract basic fields
            name = data.get("name") or data.get("title") or ""
            description = data.get("description") or ""
            
            # Extract image
            image = data.get("image")
            if isinstance(image, str):
                image_url = image
            elif isinstance(image, list) and len(image) > 0:
                image_url = image[0] if isinstance(image[0], str) else image[0].get("url", "")
            elif isinstance(image, dict):
                image_url = image.get("url", "")
            else:
                image_url = ""
            
            # Extract URL
            url = data.get("url") or data.get("mainEntityOfPage", {}).get("@id", "") if isinstance(data.get("mainEntityOfPage"), dict) else ""
            if not url and isinstance(data.get("mainEntityOfPage"), str):
                url = data.get("mainEntityOfPage")
            
            # Extract price
            price = None
            offers = data.get("offers")
            if offers:
                if isinstance(offers, dict):
                    price_str = offers.get("price")
                    if price_str:
                        try:
                            price = float(str(price_str).replace(",", ""))
                        except (ValueError, TypeError):
                            pass
                elif isinstance(offers, list) and len(offers) > 0:
                    price_str = offers[0].get("price")
                    if price_str:
                        try:
                            price = float(str(price_str).replace(",", ""))
                        except (ValueError, TypeError):
                            pass
            
            # Extract brand
            brand = None
            brand_data = data.get("brand")
            if isinstance(brand_data, str):
                brand = brand_data
            elif isinstance(brand_data, dict):
                brand = brand_data.get("name", "")
            
            # Extract category (try to infer from product category or category)
            category = None
            category_data = data.get("category") or data.get("productCategory")
            if isinstance(category_data, str):
                category = category_data
            elif isinstance(category_data, list) and len(category_data) > 0:
                category = category_data[0] if isinstance(category_data[0], str) else category_data[0].get("name", "")
            
            logger.debug(f"Extracted category: {category} for product: {name[:50]}")
            
            # Validate required fields
            if not name or not image_url or not url:
                return None
            
            return {
                "name": name.strip(),
                "description": description.strip() if description else "",
                "imageUrl": image_url,
                "productUrl": url,
                "price": price,
                "brand": brand.strip() if brand else None,
                "category": category.strip() if category else None,
            }
        
        except Exception as e:
            logger.warning(f"Error parsing JSON-LD product: {e}")
            return None
    
    async def _extract_from_dom(self, page: Page, base_url: str) -> List[Dict[str, Any]]:
        """Extract products by parsing DOM (fallback method).
        
        Uses retailer-specific selectors for better extraction.
        
        Args:
            page: Playwright page object
            base_url: Base URL for resolving relative links
            
        Returns:
            List of product dictionaries
        """
        products = []
        
        # Determine retailer from URL
        parsed_url = urlparse(base_url)
        domain = parsed_url.netloc.lower()
        is_uniqlo = "uniqlo" in domain
        is_zalando = "zalando" in domain
        
        try:
            # Wait a bit more for dynamic content
            await page.wait_for_timeout(2000)
            
            # Try retailer-specific extraction first, then generic
            if is_uniqlo:
                logger.debug("Using Uniqlo-specific DOM extraction")
                products = await self._extract_uniqlo_products(page, base_url)
            elif is_zalando:
                logger.debug("Using Zalando-specific DOM extraction")
                products = await self._extract_zalando_products(page, base_url)
            
            # Fallback to generic extraction if retailer-specific failed
            if not products:
                logger.debug("Using generic DOM extraction")
                products = await self._extract_generic_products(page, base_url)
            
            logger.debug(f"DOM extraction found {len(products)} products from {base_url}")
        
        except Exception as e:
            logger.warning(f"Error extracting from DOM for {base_url}: {e}")
        
        return products
    
    async def _extract_uniqlo_products(self, page: Page, base_url: str) -> List[Dict[str, Any]]:
        """Extract products from Uniqlo pages using specific selectors."""
        products = []
        
        try:
            product_elements = await page.evaluate("""
                () => {
                    const products = [];
                    const links = Array.from(document.querySelectorAll('a[href*="/us/en/products/"]'));
                    const seen = new Set();
                    
                    for (const link of links.slice(0, 100)) {
                        const url = link.href.split('?')[0]; // Remove query params
                        if (seen.has(url)) continue;
                        seen.add(url);
                        
                        const container = link.closest('[class*="product"], [class*="item"], article, li');
                        const img = container ? container.querySelector('img') : null;
                        const titleEl = container ? (container.querySelector('[class*="name"]') || container.querySelector('[class*="title"]') || container.querySelector('h2, h3')) : null;
                        
                        if (url && (titleEl || link.textContent.trim())) {
                            products.push({
                                url: url,
                                image: img ? (img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '') : '',
                                title: titleEl ? titleEl.textContent.trim() : link.textContent.trim(),
                            });
                        }
                    }
                    return products;
                }
            """)
            
            logger.debug(f"Uniqlo extraction found {len(product_elements)} potential products")
            
            for elem in product_elements:
                if elem.get("url") and elem.get("title"):
                    products.append({
                        "name": elem.get("title", ""),
                        "description": "",
                        "imageUrl": elem.get("image", ""),
                        "productUrl": elem.get("url", ""),
                        "price": None,
                        "brand": "Uniqlo",
                        "category": None,
                    })
        
        except Exception as e:
            logger.warning(f"Error in Uniqlo-specific extraction: {e}")
        
        return products
    
    async def _extract_zalando_products(self, page: Page, base_url: str) -> List[Dict[str, Any]]:
        """Extract products from Zalando pages using specific selectors."""
        products = []
        
        try:
            # Wait for Zalando's dynamic content
            await page.wait_for_timeout(3000)
            
            product_elements = await page.evaluate("""
                () => {
                    const products = [];
                    // Zalando product links typically contain product IDs
                    const links = Array.from(document.querySelectorAll('a[href*="/p/"], a[href*="/product/"]'));
                    const seen = new Set();
                    
                    for (const link of links.slice(0, 100)) {
                        const url = link.href.split('?')[0];
                        if (seen.has(url)) continue;
                        seen.add(url);
                        
                        const container = link.closest('[class*="product"], [class*="item"], article, [data-testid*="product"]');
                        const img = container ? container.querySelector('img') : null;
                        const titleEl = container ? (container.querySelector('[class*="name"]') || container.querySelector('[class*="title"]') || container.querySelector('h2, h3, span[class*="name"]')) : null;
                        
                        if (url && (titleEl || link.textContent.trim())) {
                            products.push({
                                url: url,
                                image: img ? (img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '') : '',
                                title: titleEl ? titleEl.textContent.trim() : link.textContent.trim(),
                            });
                        }
                    }
                    return products;
                }
            """)
            
            for elem in product_elements:
                if elem.get("url") and elem.get("title"):
                    products.append({
                        "name": elem.get("title", ""),
                        "description": "",
                        "imageUrl": elem.get("image", ""),
                        "productUrl": elem.get("url", ""),
                        "price": None,
                        "brand": None,
                        "category": None,
                    })
        
        except Exception as e:
            logger.warning(f"Error in Zalando-specific extraction: {e}")
        
        return products
    
    async def _extract_generic_products(self, page: Page, base_url: str) -> List[Dict[str, Any]]:
        """Generic product extraction fallback."""
        products = []
        
        try:
            product_elements = await page.evaluate("""
                () => {
                    const selectors = [
                        '[data-testid*="product"]',
                        '[class*="product-card"]',
                        '[class*="product-item"]',
                        'article[class*="product"]',
                        'li[class*="product"]',
                    ];
                    
                    for (const selector of selectors) {
                        const elements = Array.from(document.querySelectorAll(selector));
                        if (elements.length > 0) {
                            return elements.slice(0, 50).map(el => {
                                const link = el.querySelector('a[href]');
                                const img = el.querySelector('img');
                                const title = el.querySelector('h1, h2, h3, [class*="title"], [class*="name"]');
                                
                                return {
                                    url: link ? link.href : '',
                                    image: img ? (img.src || img.getAttribute('data-src') || '') : '',
                                    title: title ? title.textContent.trim() : '',
                                };
                            }).filter(p => p.url && p.title);
                        }
                    }
                    return [];
                }
            """)
            
            logger.debug(f"Generic extraction found {len(product_elements) if product_elements else 0} potential products")
            
            for elem in product_elements:
                if elem.get("url") and elem.get("title"):
                    products.append({
                        "name": elem.get("title", ""),
                        "description": "",
                        "imageUrl": elem.get("image", ""),
                        "productUrl": elem.get("url", ""),
                        "price": None,
                        "brand": None,
                        "category": None,
                    })
        
        except Exception as e:
            logger.warning(f"Error in generic extraction: {e}")
        
        return products
