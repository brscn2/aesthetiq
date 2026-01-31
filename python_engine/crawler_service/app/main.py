"""Crawler service - FastAPI app with scheduled nightly crawling."""
from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

import yaml
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import sys
from pathlib import Path

# Add parent directory to path for mcp_servers imports
# In Docker: /app is the working dir, so we need to go up to python_engine level
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Use relative imports for local modules
from app.loader import ProductLoader
from app.scraper import ProductScraper
from mcp_servers.core.config import get_settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global scheduler task
_scheduler_task = None


class CrawlResponse(BaseModel):
    """Response model for crawl endpoint."""
    success: bool
    urls_processed: int
    products_found: int
    products_loaded: int
    errors: List[str]


def load_target_urls(config_path: str) -> List[Dict[str, Any]]:
    """Load target URLs from YAML config file.
    
    Args:
        config_path: Path to YAML config file
        
    Returns:
        List of retailer dictionaries with name and urls
    """
    try:
        with open(config_path, "r") as f:
            config = yaml.safe_load(f)
            return config.get("retailers", [])
    except Exception as e:
        logger.error(f"Error loading target URLs config: {e}")
        return []


async def run_crawl() -> CrawlResponse:
    """Run the crawler on all target URLs.
    
    Returns:
        CrawlResponse with results
    """
    settings = get_settings()
    config_path = settings.CRAWLER_TARGET_URLS_PATH
    
    if not config_path:
        logger.warning("CRAWLER_TARGET_URLS_PATH not configured")
        return CrawlResponse(
            success=False,
            urls_processed=0,
            products_found=0,
            products_loaded=0,
            errors=["CRAWLER_TARGET_URLS_PATH not configured"],
        )
    
    # Load target URLs
    retailers = load_target_urls(config_path)
    if not retailers:
        logger.warning("No retailers configured in target URLs file")
        return CrawlResponse(
            success=False,
            urls_processed=0,
            products_found=0,
            products_loaded=0,
            errors=["No retailers configured"],
        )
    
    total_urls = 0
    total_products_found = 0
    total_products_loaded = 0
    errors = []
    
    # Initialize loader
    loader = ProductLoader()
    
    # Run scraper for each retailer
    async with ProductScraper(headless=True) as scraper:
        for retailer in retailers:
            retailer_name = retailer.get("name", "Unknown")
            urls = retailer.get("urls", [])
            retailer_id = retailer.get("retailerId")  # Optional retailer ID
            
            logger.info(f"Processing retailer: {retailer_name} ({len(urls)} URLs)")
            
            for url in urls:
                try:
                    total_urls += 1
                    logger.info(f"Scraping: {url}")
                    
                    # Scrape products
                    products = await scraper.scrape_url(url)
                    
                    if products:
                        # Add metadata
                        for product in products:
                            product["scraped_at"] = datetime.utcnow().isoformat()
                        
                        total_products_found += len(products)
                        
                        # Load into database
                        loaded = await loader.load_products(products, retailer_id)
                        total_products_loaded += loaded
                    
                    # Rate limiting - wait between URLs
                    await asyncio.sleep(2)
                
                except Exception as e:
                    error_msg = f"Error processing {url}: {e}"
                    logger.error(error_msg)
                    errors.append(error_msg)
    
    success = len(errors) == 0 or total_products_loaded > 0
    
    return CrawlResponse(
        success=success,
        urls_processed=total_urls,
        products_found=total_products_found,
        products_loaded=total_products_loaded,
        errors=errors,
    )


async def scheduled_crawl():
    """Scheduled crawl task - runs nightly at 2 AM UTC."""
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.cron import CronTrigger
    
    scheduler = AsyncIOScheduler(timezone="UTC")
    
    async def job():
        logger.info("Starting scheduled crawl...")
        result = await run_crawl()
        logger.info(f"Scheduled crawl completed: {result.products_loaded} products loaded")
    
    # Schedule for 2 AM UTC daily
    scheduler.add_job(
        job,
        trigger=CronTrigger(hour=2, minute=0),
        id="nightly_crawl",
        name="Nightly product crawl",
    )
    
    scheduler.start()
    logger.info("Scheduler started - will run crawl daily at 2 AM UTC")
    
    # Keep running
    try:
        while True:
            await asyncio.sleep(3600)  # Sleep for 1 hour
    except asyncio.CancelledError:
        scheduler.shutdown()
        raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for FastAPI app."""
    global _scheduler_task
    
    # Start scheduler on startup
    logger.info("Starting crawler service...")
    _scheduler_task = asyncio.create_task(scheduled_crawl())
    
    yield
    
    # Cleanup on shutdown
    logger.info("Shutting down crawler service...")
    if _scheduler_task:
        _scheduler_task.cancel()
        try:
            await _scheduler_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="Crawler Service",
    description="Nightly crawler for retailer product pages",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "service": "crawler"}


@app.post("/crawl", response_model=CrawlResponse)
async def crawl_endpoint():
    """Manually trigger a crawl.
    
    Returns:
        CrawlResponse with crawl results
    """
    logger.info("Manual crawl triggered")
    return await run_crawl()


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "crawler",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "crawl": "/crawl (POST)",
        },
    }
