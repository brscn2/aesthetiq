"""
Zara Store Product Scraper

Scrapes product information from Zara category pages and stores them in MongoDB.
Uses Playwright for headless browser automation.

Usage:
    python zara_scraper.py

Requirements:
    - playwright
    - pymongo
    - httpx
    - Pillow
"""

import asyncio
import json
import re
import logging
from datetime import datetime
from typing import Optional
from dataclasses import dataclass, field, asdict
from urllib.parse import urljoin

from playwright.async_api import async_playwright, Page, Browser
from pymongo import MongoClient
from pymongo.collection import Collection
import httpx
from PIL import Image
from io import BytesIO
import colorsys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# Configuration
# ============================================================================

MONGODB_URI = "mongodb://localhost:27017/"
DATABASE_NAME = "aesthetiq"
COLLECTION_NAME = "store_products"

# Embedding service URL (local)
EMBEDDING_SERVICE_URL = "http://localhost:8004"

# Category URLs to scrape (20 products each)
CATEGORY_URLS = [
    # ============================================================================
    # WOMEN'S CATEGORIES
    # ============================================================================
    
    # === OUTERWEAR ===
    "https://www.zara.com/de/en/woman-outerwear-coats-l1188.html?v1=2419020",
    "https://www.zara.com/de/en/woman-outerwear-anorak-l7704.html?v1=2440856",
    "https://www.zara.com/de/en/woman-outerwear-fur-l1189.html?v1=2419022",
    "https://www.zara.com/de/en/woman-outerwear-padded-l1195.html?v1=2419045",
    "https://www.zara.com/de/en/woman-jackets-leather-l1589.html?v1=2417740",
    "https://www.zara.com/de/en/woman-jackets-bombers-l1116.html?v1=2417747",
    "https://www.zara.com/de/en/woman-jackets-denim-l1681.html?v1=2417748",
    "https://www.zara.com/de/en/woman-blazers-l1055.html?v1=2420942",
    
    # === KNITWEAR ===
    "https://www.zara.com/de/en/woman-knitwear-sweaters-l1165.html?v1=2420324",
    "https://www.zara.com/de/en/woman-knitwear-cardigans-l1156.html?v1=2420325",
    "https://www.zara.com/de/en/woman-polos-l1785.html?v1=2548473",
    "https://www.zara.com/de/en/woman-knitwear-basics-l1153.html?v1=2420326",
    "https://www.zara.com/de/en/woman-knitwear-premium-l4880.html?v1=2420302",
    
    # === SHIRTS & BLOUSES ===
    "https://www.zara.com/de/en/woman-shirts-shirts-l1244.html?v1=2420337",
    "https://www.zara.com/de/en/woman-shirts-blouses-l1221.html?v1=2420336",
    
    # === TOPS ===
    "https://www.zara.com/de/en/woman-tops-l1322.html?v1=2419940",
    "https://www.zara.com/de/en/woman-tops-long-sleeve-l1789.html?v1=2419905",
    "https://www.zara.com/de/en/woman-tops-lace-l2211.html?v1=2419904",
    "https://www.zara.com/de/en/woman-body-l1057.html?v1=2419927",
    
    # === T-SHIRTS ===
    "https://www.zara.com/de/en/woman-tshirts-basics-l1364.html?v1=2420405",
    "https://www.zara.com/de/en/woman-tshirts-long-sleeved-l1373.html?v1=2420391",
    "https://www.zara.com/de/en/woman-tshirts-short-sleeved-l1380.html?v1=2420409",
    "https://www.zara.com/de/en/woman-tshirts-white-l2225.html?v1=2420397",
    
    # === TROUSERS ===
    "https://www.zara.com/de/en/woman-trousers-l1335.html?v1=2420795",
    "https://www.zara.com/de/en/woman-trousers-high-waist-l1779.html?v1=2420787",
    "https://www.zara.com/de/en/woman-trousers-wide-l1360.html?v1=2420777",
    "https://www.zara.com/de/en/woman-trousers-tailored-l15853.html?v1=2420799",
    "https://www.zara.com/de/en/woman-trousers-black-l2238.html?v1=2419259",
    "https://www.zara.com/de/en/woman-trousers-joggers-l1346.html?v1=2419265",
    "https://www.zara.com/de/en/woman-trousers-flare-l2235.html?v1=2419262",
    "https://www.zara.com/de/en/woman-trousers-leggings-l1348.html?v1=2420797",
    "https://www.zara.com/de/en/woman-trousers-balloon-l16538.html?v1=2606117",
    
    # === JEANS ===
    "https://www.zara.com/de/en/woman-jeans-l1119.html?v1=2419185",
    "https://www.zara.com/de/en/woman-jeans-baloon-l7964.html?v1=2419216",
    "https://www.zara.com/de/en/woman-jeans-high-waist-l1134.html?v1=2419235",
    "https://www.zara.com/de/en/woman-jeans-wide-leg-l2241.html?v1=2419239",
    "https://www.zara.com/de/en/woman-jeans-baggy-l2083.html?v1=2419230",
    "https://www.zara.com/de/en/woman-jeans-flare-l1132.html?v1=2419205",
    "https://www.zara.com/de/en/woman-jeans-mid-waist-l1463.html?v1=2419238",
    "https://www.zara.com/de/en/woman-jeans-low-waist-l1464.html?v1=2419215",
    
    # === DRESSES ===
    "https://www.zara.com/de/en/woman-dresses-midi-l1081.html?v1=2420900",
    "https://www.zara.com/de/en/woman-dresses-mini-l1083.html?v1=2420826",
    
    # === KNITWEAR (additional) ===
    "https://www.zara.com/de/en/woman-knitwear-cardigans-l1156.html?v1=2419847",
    "https://www.zara.com/de/en/woman-knitwear-sweaters-l1165.html?v1=2419845",
    "https://www.zara.com/de/en/woman-knitwear-premium-l4880.html?v1=2471338",
    "https://www.zara.com/de/en/woman-knitwear-basics-l1153.html?v1=2560475",
    
    # === SKIRTS ===
    "https://www.zara.com/de/en/woman-skirts-l1299.html?v1=2420444",
    "https://www.zara.com/de/en/woman-skirts-midi-l1305.html?v1=2420430",
    "https://www.zara.com/de/en/woman-skirts-mini-l1307.html?v1=2420447",
    "https://www.zara.com/de/en/woman-shorts-skorts-l1297.html?v1=2420439",
    
    # === SWEATSHIRTS & TRACKSUITS ===
    "https://www.zara.com/de/en/woman-tracksuit-l6047.html?v1=2420287",
    "https://www.zara.com/de/en/woman-sweatshirts-l1320.html?v1=2467842",
    "https://www.zara.com/de/en/woman-trousers-joggers-l1346.html?v1=2467843",
    
    # === SHOES ===
    "https://www.zara.com/de/en/woman-shoes-boots-l1263.html?v1=2419166",
    "https://www.zara.com/de/en/woman-shoes-ankle-boots-l1259.html?v1=2419132",
    "https://www.zara.com/de/en/woman-shoes-heeled-l1271.html?v1=2419179",
    "https://www.zara.com/de/en/woman-shoes-sneakers-l1287.html?v1=2419075",
    "https://www.zara.com/de/en/woman-shoes-leather-l1275.html?v1=2419076",
    
    # === BAGS ===
    "https://www.zara.com/de/en/woman-bags-leather-l1041.html?v1=2417675",
    "https://www.zara.com/de/en/woman-bags-shoulder-l1924.html?v1=2417737",
    "https://www.zara.com/de/en/woman-bags-crossbody-l1032.html?v1=2417696",
    
    # === ACCESSORIES ===
    "https://www.zara.com/de/en/woman-accessories-jewelry-l1015.html?v1=2418963",
    "https://www.zara.com/de/en/woman-accessories-foulards-l1008.html?v1=2418991",
    "https://www.zara.com/de/en/woman-accessories-belts-l1004.html?v1=2418966",
    "https://www.zara.com/de/en/woman-accessories-headwear-l1013.html?v1=2418968",
    "https://www.zara.com/de/en/woman-accessories-gloves-l1011.html?v1=2418993",
    "https://www.zara.com/de/en/woman-accessories-socks-l1446.html?v1=2418971",
    
    # ============================================================================
    # MEN'S CATEGORIES (commented out - already scraped)
    # ============================================================================
    # # === T-SHIRTS ===
    # "https://www.zara.com/de/de/herren-t-shirts-lang-l863.html?v1=2432015",
    # "https://www.zara.com/de/de/herren-t-shirts-printed-l867.html?v1=2432030",
    # "https://www.zara.com/de/de/herren-t-shirts-printed-l867.html?v1=2432033",
    # "https://www.zara.com/de/de/zara-athleticz-t-shirts-l4652.html?v1=2432003",
    # # === JEANS ===
    # "https://www.zara.com/de/en/man-jeans-straight-l677.html?v1=2432125",
    # "https://www.zara.com/de/en/man-jeans-slim-l675.html?v1=2432133",
    # "https://www.zara.com/de/en/man-jeans-flare-l7976.html?v1=2432121",
    # "https://www.zara.com/de/en/man-jeans-loose-fit-l2533.html?v1=2432129",
    # # === SHIRTS ===
    # "https://www.zara.com/de/en/man-shirts-formal-l751.html?v1=2431997",
    # "https://www.zara.com/de/en/man-shirts-plain-l757.html?v1=2431987",
    # "https://www.zara.com/de/en/man-shirts-printed-l759.html?v1=2431971",
    # "https://www.zara.com/de/en/man-overshirts-l3174.html?v1=2431989",
    # # === OUTERWEAR ===
    # "https://www.zara.com/de/en/man-outerwear-padded-l722.html?v1=2538410",
    # "https://www.zara.com/de/en/man-outerwear-leather-l4550.html?v1=2600116",
    # "https://www.zara.com/de/en/man-jackets-faux-leather-l650.html?v1=2600615",
    # "https://www.zara.com/de/en/man-jackets-bombers-l645.html?v1=2599622",
    # "https://www.zara.com/de/en/man-outerwear-parkas-l723.html?v1=2603108",
    # "https://www.zara.com/de/en/man-outerwear-vests-l730.html?v1=2536907",
    # "https://www.zara.com/de/en/man-jackets-wind-breaker-l1651.html?v1=2601122",
    # # === KNITWEAR ===
    # "https://www.zara.com/de/en/man-knitwear-turtleneck-l2518.html?v1=2432244",
    # "https://www.zara.com/de/en/man-knitwear-cardigans-l685.html?v1=2432243",
    # "https://www.zara.com/de/en/man-knitwear-plain-l694.html?v1=2558949",
    # "https://www.zara.com/de/en/man-knitwear-printed-l696.html?v1=2432249",
    # "https://www.zara.com/de/en/man-polos-knitwear-l1701.html?v1=2432247",
    # # === SWEATSHIRTS ===
    # "https://www.zara.com/de/en/man-sweatshirts-hoodies-l1525.html?v1=2432226",
    # "https://www.zara.com/de/en/man-sweatshirts-quarter-zip-l7128.html?v1=2432220",
    # "https://www.zara.com/de/en/man-sweatshirts-crew-neck-l4465.html?v1=2432209",
    # "https://www.zara.com/de/en/man-sweatshirt-zip-l16629.html?v1=2609126",
    # # === OTHER ===
    # "https://www.zara.com/de/en/man-polos-l733.html?v1=2432049",
    # "https://www.zara.com/de/en/man-overshirts-l3174.html?v1=2432280",
    # "https://www.zara.com/de/en/man-blazers-l608.html?v1=2436311",
    # "https://www.zara.com/de/en/man-bermudas-l592.html?v1=2432164",
    # "https://www.zara.com/de/en/man-shoes-boots-l781.html?v1=2436391",
    # "https://www.zara.com/de/en/man-shoes-moccasins-l789.html?v1=2436392",
    # "https://www.zara.com/de/en/man-shoes-sneakers-l797.html?v1=2436336",
    # "https://www.zara.com/de/en/man-shoes-laceup-l4378.html?v1=2436383",
    # "https://www.zara.com/de/en/man-shoes-sandals-l794.html?v1=2436393",
    # "https://www.zara.com/de/en/man-shoes-leather-l788.html?v1=2436377",
    # "https://www.zara.com/de/en/man-outerwear-l715.html?v1=2606109",
]

PRODUCTS_PER_CATEGORY = 20

# Category mapping based on URL patterns
CATEGORY_NAME_MAP = {
    # ===== WOMEN'S CATEGORIES =====
    # Outerwear
    "coats": ("OUTERWEAR", "Coat"),
    "anorak": ("OUTERWEAR", "Anorak"),
    "fur": ("OUTERWEAR", "Fur Coat"),
    "denim": ("OUTERWEAR", "Denim Jacket"),
    # Tops & Shirts
    "blouses": ("TOP", "Blouse"),
    "tops": ("TOP", "Top"),
    "long-sleeve": ("TOP", "Long Sleeve Top"),
    "lace": ("TOP", "Lace Top"),
    "body": ("TOP", "Bodysuit"),
    "basics": ("TOP", "Basic"),
    "short-sleeved": ("TOP", "T-Shirt"),
    "white": ("TOP", "T-Shirt"),
    # Bottoms
    "trousers": ("BOTTOM", "Trousers"),
    "high-waist": ("BOTTOM", "High Waist"),
    "wide": ("BOTTOM", "Wide Leg"),
    "tailored": ("BOTTOM", "Tailored Trousers"),
    "black": ("BOTTOM", "Trousers"),
    "joggers": ("BOTTOM", "Joggers"),
    "leggings": ("BOTTOM", "Leggings"),
    "balloon": ("BOTTOM", "Balloon"),
    "baloon": ("BOTTOM", "Balloon Jeans"),
    "wide-leg": ("BOTTOM", "Wide Leg Jeans"),
    "baggy": ("BOTTOM", "Baggy Jeans"),
    "mid-waist": ("BOTTOM", "Mid Waist Jeans"),
    "low-waist": ("BOTTOM", "Low Waist Jeans"),
    # Dresses & Skirts
    "dresses": ("DRESS", "Dress"),
    "midi": ("DRESS", "Midi"),
    "mini": ("DRESS", "Mini"),
    "skirts": ("BOTTOM", "Skirt"),
    "skorts": ("BOTTOM", "Skort"),
    "shorts": ("BOTTOM", "Shorts"),
    # Knitwear
    "sweaters": ("TOP", "Sweater"),
    "premium": ("TOP", "Premium Knitwear"),
    # Shoes
    "ankle-boots": ("FOOTWEAR", "Ankle Boots"),
    "heeled": ("FOOTWEAR", "Heels"),
    # Bags
    "bags": ("ACCESSORY", "Bag"),
    "shoulder": ("ACCESSORY", "Shoulder Bag"),
    "crossbody": ("ACCESSORY", "Crossbody Bag"),
    # Accessories
    "accessories": ("ACCESSORY", "Accessory"),
    "jewelry": ("ACCESSORY", "Jewelry"),
    "foulards": ("ACCESSORY", "Scarf"),
    "belts": ("ACCESSORY", "Belt"),
    "headwear": ("ACCESSORY", "Headwear"),
    "gloves": ("ACCESSORY", "Gloves"),
    "socks": ("ACCESSORY", "Socks"),
    # Tracksuit
    "tracksuit": ("TOP", "Tracksuit"),
    
    # ===== MEN'S CATEGORIES (kept for reference) =====
    # T-Shirts
    "t-shirts": ("TOP", "T-Shirt"),
    "tshirts": ("TOP", "T-Shirt"),
    "lang": ("TOP", "T-Shirt"),
    "printed": ("TOP", "T-Shirt"),
    "athleticz": ("TOP", "T-Shirt"),
    # Jeans
    "jeans": ("BOTTOM", "Jeans"),
    "straight": ("BOTTOM", "Jeans"),
    "slim": ("BOTTOM", "Jeans"),
    "flare": ("BOTTOM", "Flare"),
    "loose-fit": ("BOTTOM", "Jeans"),
    # Shirts
    "shirts": ("TOP", "Shirt"),
    "formal": ("TOP", "Shirt"),
    "plain": ("TOP", "Shirt"),
    "overshirts": ("TOP", "Overshirt"),
    # Outerwear
    "outerwear": ("OUTERWEAR", "Jacket"),
    "padded": ("OUTERWEAR", "Puffer Jacket"),
    "leather": ("OUTERWEAR", "Leather Jacket"),
    "faux-leather": ("OUTERWEAR", "Faux Leather Jacket"),
    "bombers": ("OUTERWEAR", "Bomber Jacket"),
    "parkas": ("OUTERWEAR", "Parka"),
    "vests": ("OUTERWEAR", "Vest"),
    "wind-breaker": ("OUTERWEAR", "Windbreaker"),
    "jackets": ("OUTERWEAR", "Jacket"),
    # Knitwear
    "knitwear": ("TOP", "Knitwear"),
    "turtleneck": ("TOP", "Turtleneck"),
    "cardigans": ("TOP", "Cardigan"),
    # Sweatshirts
    "sweatshirts": ("TOP", "Sweatshirt"),
    "hoodies": ("TOP", "Hoodie"),
    "quarter-zip": ("TOP", "Quarter Zip"),
    "crew-neck": ("TOP", "Sweatshirt"),
    "sweatshirt": ("TOP", "Sweatshirt"),
    # Other
    "polos": ("TOP", "Polo"),
    "blazers": ("TOP", "Blazer"),
    "bermudas": ("BOTTOM", "Shorts"),
    # Shoes
    "shoes": ("FOOTWEAR", "Shoes"),
    "boots": ("FOOTWEAR", "Boots"),
    "moccasins": ("FOOTWEAR", "Moccasins"),
    "sneakers": ("FOOTWEAR", "Sneakers"),
    "laceup": ("FOOTWEAR", "Lace-up Shoes"),
    "sandals": ("FOOTWEAR", "Sandals"),
}

# German to English color mapping
COLOR_NAME_MAP = {
    # German -> English
    "schwarz": "Black",
    "weiß": "White",
    "weiss": "White",
    "creme": "Cream",
    "cremefarben": "Cream",
    "beige": "Beige",
    "grau": "Gray",
    "hellgrau": "Light Gray",
    "dunkelgrau": "Dark Gray",
    "blau": "Blue",
    "hellblau": "Light Blue",
    "dunkelblau": "Navy Blue",
    "marineblau": "Navy Blue",
    "rot": "Red",
    "grün": "Green",
    "gelb": "Yellow",
    "orange": "Orange",
    "rosa": "Pink",
    "lila": "Purple",
    "braun": "Brown",
    "dunkelbraun": "Dark Brown",
    "kamel": "Camel",
    "khaki": "Khaki",
    "olive": "Olive",
    "bordeaux": "Burgundy",
    "anthrazit": "Anthracite",
    "silber": "Silver",
    "gold": "Gold",
    "ecru": "Ecru",
    "naturfarben": "Natural",
}

# Color name to hex mapping
COLOR_TO_HEX = {
    "Black": "#000000",
    "White": "#FFFFFF",
    "Cream": "#F5F5DC",
    "Beige": "#F5F5DC",
    "Gray": "#808080",
    "Light Gray": "#D3D3D3",
    "Dark Gray": "#404040",
    "Blue": "#0000FF",
    "Light Blue": "#ADD8E6",
    "Navy Blue": "#000080",
    "Red": "#FF0000",
    "Green": "#008000",
    "Yellow": "#FFFF00",
    "Orange": "#FFA500",
    "Pink": "#FFC0CB",
    "Purple": "#800080",
    "Brown": "#8B4513",
    "Dark Brown": "#4A2C2A",
    "Camel": "#C19A6B",
    "Khaki": "#C3B091",
    "Olive": "#808000",
    "Burgundy": "#800020",
    "Anthracite": "#293133",
    "Silver": "#C0C0C0",
    "Gold": "#FFD700",
    "Ecru": "#F5F5DC",
    "Natural": "#FAF0E6",
}


# ============================================================================
# Data Models
# ============================================================================

@dataclass
class StoreProduct:
    """Store product data model matching MongoDB schema."""
    sourceUrl: str
    store: str
    productCode: str
    imageUrls: list[str]
    primaryImageUrl: str
    category: str  # TOP, BOTTOM, SHOE, ACCESSORY
    subCategory: str
    breadcrumb: list[str]
    name: str
    brand: str
    price: dict  # {amount, currency, formatted}
    
    # Optional fields
    description: Optional[str] = None
    material: Optional[str] = None
    season: Optional[str] = None
    collection: Optional[str] = None
    color: Optional[str] = None
    colorHex: Optional[str] = None
    colorVariants: list[dict] = field(default_factory=list)
    sizes: list[str] = field(default_factory=list)
    availableSizes: list[str] = field(default_factory=list)
    gender: str = "MEN"
    
    # Computed fields (set after creation)
    embedding: Optional[list[float]] = None
    seasonalPaletteScores: Optional[dict] = None
    
    # Metadata
    isActive: bool = True
    lastScraped: Optional[datetime] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None


# ============================================================================
# Scraper Class
# ============================================================================

class ZaraScraper:
    """Scrapes product data from Zara website."""
    
    def __init__(self, mongodb_uri: str = MONGODB_URI):
        self.mongodb_uri = mongodb_uri
        self.client: Optional[MongoClient] = None
        self.collection: Optional[Collection] = None
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self._playwright = None  # Store playwright instance for cleanup
        
    async def __aenter__(self):
        await self.setup()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.cleanup()
        
    async def setup(self):
        """Initialize MongoDB and browser."""
        # MongoDB
        self.client = MongoClient(self.mongodb_uri)
        self.collection = self.client[DATABASE_NAME][COLLECTION_NAME]
        
        # Create indexes
        self.collection.create_index("sourceUrl", unique=True)
        self.collection.create_index("store")
        self.collection.create_index("productCode")
        self.collection.create_index("category")
        self.collection.create_index("brand")
        
        logger.info(f"Connected to MongoDB: {DATABASE_NAME}.{COLLECTION_NAME}")
        
        # Browser - use visible mode for better SPA handling
        self._playwright = await async_playwright().start()
        self.browser = await self._playwright.chromium.launch(headless=False, slow_mo=100)
        self.page = await self.browser.new_page()
        
        # Set viewport size
        await self.page.set_viewport_size({"width": 1280, "height": 800})
        
        # Set English language preference
        await self.page.set_extra_http_headers({
            "Accept-Language": "en-US,en;q=0.9"
        })
        
        logger.info("Browser initialized (visible mode)")
        
    async def cleanup(self):
        """Close connections."""
        try:
            if self.page:
                await self.page.close()
            if self.browser:
                await self.browser.close()
            if self._playwright:
                await self._playwright.stop()
        except Exception as e:
            logger.debug(f"Cleanup warning: {e}")
        finally:
            if self.client:
                self.client.close()
            logger.info("Cleanup complete")

    async def accept_cookies(self):
        """Accept cookie consent if present."""
        try:
            await asyncio.sleep(2)  # Wait for popup to appear
            
            # Try multiple selectors for cookie accept button
            selectors = [
                'button#onetrust-accept-btn-handler',  # Common OneTrust button
                'button:has-text("ALLE COOKIES AKZEPTIEREN")',
                'button:has-text("ACCEPT ALL COOKIES")',
                'button:has-text("Accept all")',
                'button:has-text("Akzeptieren")',
                '[data-qa-action="accept-cookies"]',
                '.cookie-banner button.accept',
            ]
            
            for selector in selectors:
                try:
                    btn = self.page.locator(selector)
                    if await btn.count() > 0:
                        await btn.first.click()
                        logger.info(f"Accepted cookies with: {selector}")
                        await asyncio.sleep(1)
                        return
                except:
                    continue
                    
            logger.info("No cookie banner found or already accepted")
        except Exception as e:
            logger.debug(f"Cookie handling error: {e}")

    async def get_product_urls_from_category(self, category_url: str, limit: int = 20) -> list[str]:
        """Extract product URLs using while loop with proper indexing."""
        logger.info(f"Fetching {limit} products from: {category_url}")
        
        english_url = category_url.replace("/de/de/", "/de/en/")
        
        # Load category page
        await self.page.goto(english_url, wait_until="domcontentloaded", timeout=60000)
        await self.accept_cookies()
        await asyncio.sleep(2)
        
        # Scroll to load products
        logger.info("Scrolling to load products...")
        for _ in range(6):
            await self.page.mouse.wheel(0, 1500)
            await asyncio.sleep(0.7)
        await self.page.evaluate("window.scrollTo(0, 0)")
        await asyncio.sleep(1)
        
        urls = []
        current_idx = 0
        
        while len(urls) < limit:
            # Get fresh product list
            products = await self.page.query_selector_all('a.product-link.product-grid-product-info__name')
            
            if current_idx >= len(products):
                logger.info(f"No more products (index {current_idx} >= {len(products)})")
                break
            
            try:
                product = products[current_idx]
                text = (await product.inner_text()).strip()
                
                # Click product
                await product.scroll_into_view_if_needed()
                await asyncio.sleep(0.2)
                await product.click()
                await asyncio.sleep(1.5)
                
                # Get URL
                url = self.page.url
                if url and '.html' in url and 'zara.com' in url:
                    url = url.replace("/de/de/", "/de/en/")
                    urls.append(url)
                    logger.info(f"[{len(urls)}/{limit}] {text[:40]}")
                
                # Go back
                await self.page.evaluate("window.history.back()")
                await asyncio.sleep(1.5)
                
                current_idx += 1
                
            except Exception as e:
                logger.warning(f"Error at index {current_idx}: {e}")
                # Reload page and try to continue
                await self.page.goto(english_url, wait_until="domcontentloaded", timeout=30000)
                await asyncio.sleep(2)
                current_idx += 1
        
        logger.info(f"Collected {len(urls)} URLs")
        return urls

    async def scrape_product_page(self, url: str) -> Optional[StoreProduct]:
        """Scrape a single product page."""
        logger.info(f"Scraping: {url}")
        
        try:
            await self.page.goto(url, wait_until="domcontentloaded", timeout=45000)
            await self.accept_cookies()
            await asyncio.sleep(2)
            
            # Scroll to load all images
            for _ in range(3):
                await self.page.mouse.wheel(0, 1000)
                await asyncio.sleep(0.5)
            
            # Extract data using JavaScript
            data = await self.page.evaluate("""
                () => {
                    const result = {};
                    
                    // Product name
                    const nameEl = document.querySelector('.product-detail-info__name, h1.product-detail-info__header-name');
                    result.name = nameEl ? nameEl.textContent.trim() : '';
                    
                    // Price
                    const priceEl = document.querySelector('.money-amount__main, .price__amount');
                    result.priceText = priceEl ? priceEl.textContent.trim() : '';
                    
                    // SKU/Reference - updated selector
                    const refEl = document.querySelector('.product-color-extended-name__copy-action, .product-detail-info__reference');
                    result.productCode = refEl ? refEl.textContent.trim().replace('Ref.', '').trim() : '';
                    
                    // Color - includes reference number in format "Color | XXX/XXX/XXX"
                    const colorEl = document.querySelector('.product-color-extended-name, .product-detail-color-selector__selected-color-name');
                    result.color = colorEl ? colorEl.textContent.trim() : '';
                    
                    // Description
                    const descEl = document.querySelector('.expandable-text__inner-content, .product-detail-description p');
                    result.description = descEl ? descEl.textContent.trim() : '';
                    
                    
                    // Material/Composition - get full text from composition section
                    const compositionSection = document.querySelector('.product-detail-composition, .product-detail-other-info__container');
                    let materialText = '';
                    if (compositionSection) {
                        // Get all text content, including nested elements
                        materialText = compositionSection.innerText || compositionSection.textContent || '';
                        // Clean up: remove "Composition:" prefix and extra whitespace
                        materialText = materialText.replace(/^Composition:\s*/i, '').trim();
                    }
                    result.material = materialText;
                    
                    // Collection
                    const collectionEl = document.querySelector('.product-detail-info__collection');
                    result.collection = collectionEl ? collectionEl.textContent.trim() : '';
                    
                    // Sizes - updated selectors
                    const sizeEls = document.querySelectorAll('.size-selector-sizes-size__button, .product-detail-size-selector__size-list-item span');
                    result.sizes = Array.from(sizeEls).map(el => el.textContent.trim()).filter(s => s && s.length < 10);
                    
                    // Available sizes (not disabled)
                    const availableSizeEls = document.querySelectorAll('.size-selector-sizes-size--enabled .size-selector-sizes-size__button');
                    result.availableSizes = Array.from(availableSizeEls).map(el => el.textContent.trim()).filter(s => s && s.length < 10);
                    
                    // Images - updated selector
                    const imgEls = document.querySelectorAll('img.media-image__image');
                    result.imageUrls = Array.from(imgEls)
                        .map(img => img.src)
                        .filter(src => src && src.includes('zara.net') && !src.includes('transparent-background'))
                        .map(src => src.replace(/w\/\d+/, 'w/750'));  // Higher resolution
                    
                    // Color variants
                    const colorVariantEls = document.querySelectorAll('.product-detail-color-selector__colors-swatch');
                    result.colorVariants = Array.from(colorVariantEls).map(el => {
                        return {
                            color: el.getAttribute('aria-label') || el.getAttribute('title') || '',
                            url: el.getAttribute('href') || ''
                        };
                    }).filter(v => v.color);
                    
                    return result;
                }
            """)
            
            if not data.get('name'):
                logger.warning(f"Could not extract product name from {url}")
                return None
                
            # Process and create product
            product = self._create_product(url, data)
            return product
            
        except Exception as e:
            logger.error(f"Error scraping {url}: {e}")
            return None

    def _create_product(self, url: str, data: dict) -> StoreProduct:
        """Create StoreProduct from scraped data."""
        
        # Parse price
        price_text = data.get('priceText', '0')
        price_match = re.search(r'([\d,\.]+)', price_text.replace(',', '.'))
        price_amount = float(price_match.group(1)) if price_match else 0
        
        # Translate color to English
        color_german = data.get('color', '').lower()
        color_english = COLOR_NAME_MAP.get(color_german, data.get('color', 'Unknown'))
        color_hex = COLOR_TO_HEX.get(color_english, None)
        
        # Select primary image (last images are usually model-free)
        image_urls = data.get('imageUrls', [])
        primary_image = self._select_primary_image(image_urls)
        
        # Determine category from URL
        category, sub_category = self._determine_category(url)
        
        # Translate name to English (basic cleanup)
        name = self._translate_product_name(data.get('name', ''))
        
        # Extract material in English
        material = self._extract_material(data.get('material', ''))
        
        product = StoreProduct(
            sourceUrl=url,
            store="zara",
            productCode=data.get('productCode', ''),
            imageUrls=image_urls,
            primaryImageUrl=primary_image,
            category=category,
            subCategory=sub_category,
            breadcrumb=["Men", "T-Shirts"],
            name=name,
            brand="Zara",
            price={
                "amount": int(price_amount * 100),  # Store as cents
                "currency": "EUR",
                "formatted": f"{price_amount:.2f} €"
            },
            description=self._translate_description(data.get('description', '')),
            material=material,
            collection=data.get('collection', ''),
            color=color_english,
            colorHex=color_hex,
            colorVariants=[
                {"color": v.get('color', ''), "url": v.get('url', '')}
                for v in data.get('colorVariants', [])
            ],
            sizes=data.get('sizes', []),
            availableSizes=data.get('availableSizes', []),
            gender="MEN",
            lastScraped=datetime.utcnow(),
            createdAt=datetime.utcnow(),
            updatedAt=datetime.utcnow(),
        )
        
        return product

    def _select_primary_image(self, image_urls: list[str]) -> str:
        """Select the best primary image (model-free product shot)."""
        if not image_urls:
            return ""
            
        # The last 2-3 images are usually product-only shots
        # Return the second to last if available
        if len(image_urls) >= 2:
            return image_urls[-2]
        return image_urls[-1] if image_urls else ""

    def _determine_category(self, url: str) -> tuple[str, str]:
        """Determine category from URL."""
        url_lower = url.lower()
        
        if "t-shirt" in url_lower or "tshirt" in url_lower:
            return ("TOP", "T-Shirt")
        elif "jeans" in url_lower:
            return ("BOTTOM", "Jeans")
        elif "trousers" in url_lower or "hose" in url_lower:
            return ("BOTTOM", "Trousers")
        elif "shoes" in url_lower or "schuhe" in url_lower:
            return ("SHOE", "Sneakers")
        elif "jacket" in url_lower or "jacke" in url_lower:
            return ("TOP", "Jacket")
        elif "sweater" in url_lower or "pullover" in url_lower:
            return ("TOP", "Sweater")
        else:
            return ("TOP", "T-Shirt")  # Default for this scrape

    def _translate_product_name(self, name: str) -> str:
        """Translate German product name to English."""
        # Common German -> English mappings for product names
        translations = {
            "t-shirt": "T-Shirt",
            "mit langen ärmeln": "Long Sleeve",
            "mittelschwer": "Medium Weight",
            "strukturmuster": "Textured Pattern",
            "schriftzügen": "Lettering",
            "nummernprint": "Number Print",
            "gestreift": "Striped",
            "einfarbig": "Solid Color",
            "rundhalsausschnitt": "Crew Neck",
            "relaxed fit": "Relaxed Fit",
            "henley": "Henley",
        }
        
        result = name.upper()
        for german, english in translations.items():
            result = re.sub(german, english, result, flags=re.IGNORECASE)
            
        return result.title()

    def _translate_description(self, desc: str) -> str:
        """Clean and translate description."""
        if not desc:
            return ""
        # Basic cleanup - remove German phrases
        # In production, you'd use a translation API
        return desc[:500] if desc else ""

    def _extract_material(self, material_text: str) -> str:
        """Extract material composition in English."""
        if not material_text:
            return ""
            
        # Look for percentage patterns
        match = re.search(r'(\d+%?\s*(?:Cotton|Baumwolle|Polyester|Elastan|Viskose|Wolle))', material_text, re.IGNORECASE)
        if match:
            result = match.group(1)
            result = result.replace("Baumwolle", "Cotton")
            result = result.replace("Elastan", "Elastane")
            result = result.replace("Viskose", "Viscose")
            result = result.replace("Wolle", "Wool")
            return result
            
        return material_text[:100]

    async def generate_embedding(self, image_url: str) -> Optional[list[float]]:
        """Generate CLIP embedding for product image."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{EMBEDDING_SERVICE_URL}/embed/image",
                    json={"image_url": image_url}
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("embedding")
                else:
                    logger.warning(f"Embedding service returned {response.status_code}")
        except Exception as e:
            logger.warning(f"Could not generate embedding: {e}")
        return None

    async def extract_dominant_color(self, image_url: str) -> Optional[str]:
        """Extract dominant color hex from image."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(image_url)
                if response.status_code == 200:
                    image = Image.open(BytesIO(response.content))
                    image = image.convert('RGB').resize((100, 100))
                    
                    # Get most common colors
                    colors = image.getcolors(10000)
                    if colors:
                        # Sort by frequency and get top color
                        sorted_colors = sorted(colors, key=lambda x: x[0], reverse=True)
                        # Skip near-white/near-black (background)
                        for count, (r, g, b) in sorted_colors:
                            # Skip very light (background) or very dark colors
                            if 30 < (r + g + b) / 3 < 240:
                                return f"#{r:02x}{g:02x}{b:02x}"
                        # Fallback to first non-white
                        _, (r, g, b) = sorted_colors[0]
                        return f"#{r:02x}{g:02x}{b:02x}"
        except Exception as e:
            logger.warning(f"Could not extract color: {e}")
        return None

    def save_product(self, product: StoreProduct) -> bool:
        """Save product to MongoDB."""
        try:
            data = asdict(product)
            # Remove None values
            data = {k: v for k, v in data.items() if v is not None}
            
            # Upsert by sourceUrl
            result = self.collection.update_one(
                {"sourceUrl": product.sourceUrl},
                {"$set": data},
                upsert=True
            )
            
            logger.info(f"Saved product: {product.name[:50]}...")
            return True
        except Exception as e:
            logger.error(f"Error saving product: {e}")
            return False

    async def scrape_categories(self, category_urls: list[str], products_per_category: int = 20):
        """Scrape products from multiple category pages."""
        total_scraped = 0
        total_saved = 0
        
        for category_url in category_urls:
            logger.info(f"\n{'='*60}")
            logger.info(f"Processing category: {category_url}")
            logger.info(f"{'='*60}\n")
            
            # Get product URLs
            product_urls = await self.get_product_urls_from_category(
                category_url, 
                limit=products_per_category
            )
            
            # Scrape each product
            for i, product_url in enumerate(product_urls, 1):
                logger.info(f"\nProduct {i}/{len(product_urls)}")
                
                # Check if already scraped
                existing = self.collection.find_one({"sourceUrl": product_url})
                if existing:
                    logger.info(f"Already scraped, skipping: {product_url}")
                    continue
                
                product = await self.scrape_product_page(product_url)
                if product:
                    total_scraped += 1
                    
                    # Try to extract better colorHex from image if not set
                    if not product.colorHex and product.primaryImageUrl:
                        product.colorHex = await self.extract_dominant_color(product.primaryImageUrl)
                    
                    # Generate embedding (optional - comment out if embedding service not running)
                    # if product.primaryImageUrl:
                    #     product.embedding = await self.generate_embedding(product.primaryImageUrl)
                    
                    if self.save_product(product):
                        total_saved += 1
                        
                # Be nice to the server
                await asyncio.sleep(2)
                
        logger.info(f"\n{'='*60}")
        logger.info(f"Scraping complete!")
        logger.info(f"Total scraped: {total_scraped}")
        logger.info(f"Total saved: {total_saved}")
        logger.info(f"{'='*60}\n")


# ============================================================================
# Main
# ============================================================================

async def main():
    """Main entry point."""
    logger.info("Starting Zara Scraper...")
    
    async with ZaraScraper() as scraper:
        await scraper.scrape_categories(
            CATEGORY_URLS,
            products_per_category=PRODUCTS_PER_CATEGORY
        )
        

if __name__ == "__main__":
    asyncio.run(main())
