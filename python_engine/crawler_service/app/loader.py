"""Database loader for storing scraped products with embeddings."""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from mcp_servers.commerce_server import db as commerce_db
from mcp_servers.commerce_server.schemas import Category
from mcp_servers.core.config import get_settings
from mcp_servers.shared.embeddings_client import embed_text

logger = logging.getLogger(__name__)


class ProductLoader:
    """Loader for storing products in the database with embeddings."""
    
    def __init__(self):
        """Initialize the loader."""
        self.settings = get_settings()
    
    async def load_products(self, products: List[Dict[str, Any]], retailer_id: Optional[str] = None) -> int:
        """Load products into the database.
        
        Args:
            products: List of product dictionaries from scraper
            retailer_id: Optional retailer ID (ObjectId string)
            
        Returns:
            Number of products successfully loaded
        """
        loaded_count = 0
        
        for product in products:
            try:
                # Prepare item data
                item_data = await self._prepare_item_data(product, retailer_id)
                
                # Generate embedding
                embed_text_str = f"{item_data['name']} {item_data.get('description', '')} {item_data.get('brand', '')}"
                try:
                    embedding = await embed_text(embed_text_str)
                    item_data["embedding"] = embedding
                except Exception as e:
                    logger.warning(f"Failed to generate embedding for {item_data.get('productUrl')}: {e}")
                
                # Store in retailitems collection using upsert
                await commerce_db.upsert_retail_item(item_data)
                loaded_count += 1
                
            except Exception as e:
                logger.error(f"Failed to load product {product.get('name', 'unknown')}: {e}")
        
        logger.info(f"Loaded {loaded_count}/{len(products)} products into database")
        return loaded_count
    
    async def _prepare_item_data(
        self,
        product: Dict[str, Any],
        retailer_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Prepare product data for database storage.
        
        Args:
            product: Raw product dictionary from scraper
            retailer_id: Optional retailer ID
            
        Returns:
            Prepared item data dictionary
        """
        # Map category string to Category enum
        # Handle None case: if category key exists but value is None, get() returns None
        category_value = product.get("category")
        category_str = (category_value if category_value else "").upper()
        category = Category.TOP  # Default
        
        # Simple category mapping (can be improved)
        if any(word in category_str for word in ["TOP", "SHIRT", "BLOUSE", "SWEATER", "JACKET", "COAT"]):
            category = Category.TOP
        elif any(word in category_str for word in ["BOTTOM", "PANT", "JEAN", "SKIRT", "SHORT"]):
            category = Category.BOTTOM
        elif any(word in category_str for word in ["SHOE", "BOOT", "SNEAKER", "SANDAL"]):
            category = Category.SHOE
        elif any(word in category_str for word in ["ACCESSORY", "BAG", "HAT", "BELT", "SCARF"]):
            category = Category.ACCESSORY
        
        item_data = {
            "name": product.get("name", ""),
            "description": product.get("description", ""),
            "imageUrl": product.get("imageUrl", ""),
            "category": category.value,
            "subCategory": product.get("subCategory"),
            "brand": product.get("brand"),
            "retailerId": retailer_id or "",
            "productUrl": product.get("productUrl", ""),
            "price": product.get("price"),
            "currency": "USD",  # Default, could be extracted from page
            "inStock": True,  # Default, could be checked
            "colors": product.get("colors", []),
            "tags": product.get("tags", []),
            "metadata": {
                "source": "crawler",
                "scraped_at": product.get("scraped_at"),
            },
        }
        
        return item_data
