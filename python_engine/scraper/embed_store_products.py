"""
Store Products Embedding Pipeline

This script processes products from the store_products collection and adds:
1. Hybrid embeddings (85% image + 15% text) 
2. Seasonal palette scores for color compatibility

Environment Variables Required:
- MONGODB_URL: MongoDB connection string
- EMBEDDING_SERVICE_URL: URL of the embedding service (default: http://localhost:8004)
"""

import os
import math
import requests
from typing import List, Dict, Optional
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
MONGODB_URL = os.getenv("MONGODB_URL")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "test")
EMBEDDING_SERVICE_URL = os.getenv("EMBEDDING_SERVICE_URL", "http://localhost:8004")
BATCH_SIZE = 10

# Seasonal palettes enum (matching TypeScript)
SEASONAL_PALETTES = [
    "DARK_AUTUMN",
    "DARK_WINTER",
    "LIGHT_SPRING",
    "LIGHT_SUMMER",
    "MUTED_AUTUMN",
    "MUTED_SUMMER",
    "BRIGHT_SPRING",
    "BRIGHT_WINTER",
    "WARM_AUTUMN",
    "WARM_SPRING",
    "COOL_WINTER",
    "COOL_SUMMER",
]

# Seasonal palette color definitions (ported from TypeScript)
SEASONAL_PALETTE_COLORS = {
    "DARK_AUTUMN": {
        "primary": [
            "#8B4513", "#A0522D", "#6B4423", "#8B0000", "#556B2F",
            "#2F4F4F", "#800000", "#D2691E", "#CD853F", "#B8860B",
        ],
        "secondary": [
            "#DAA520", "#BC8F8F", "#F4A460", "#DEB887", "#D2B48C",
            "#808000", "#6B8E23", "#228B22",
        ],
        "avoid": ["#FF69B4", "#00FFFF", "#FF00FF", "#87CEEB", "#E6E6FA"],
    },
    "DARK_WINTER": {
        "primary": [
            "#000000", "#FFFFFF", "#191970", "#4B0082", "#800080",
            "#8B0000", "#006400", "#00008B", "#2F4F4F", "#483D8B",
        ],
        "secondary": [
            "#DC143C", "#C71585", "#4169E1", "#008B8B", "#556B2F", "#696969",
        ],
        "avoid": ["#FFD700", "#FFA500", "#F5DEB3", "#FAEBD7", "#FFF8DC"],
    },
    "LIGHT_SPRING": {
        "primary": [
            "#FFB6C1", "#FFDAB9", "#98FB98", "#87CEEB", "#F0E68C",
            "#FFFACD", "#E0FFFF", "#FFF0F5", "#FAFAD2", "#F5F5DC",
        ],
        "secondary": [
            "#FFD700", "#FF6347", "#40E0D0", "#00CED1", "#FF7F50", "#FFA07A",
        ],
        "avoid": ["#000000", "#800000", "#191970", "#2F4F4F", "#4B0082"],
    },
    "LIGHT_SUMMER": {
        "primary": [
            "#E6E6FA", "#D8BFD8", "#DDA0DD", "#B0C4DE", "#ADD8E6",
            "#F0F8FF", "#FFF0F5", "#FFE4E1", "#E0FFFF", "#F5F5F5",
        ],
        "secondary": [
            "#778899", "#BC8F8F", "#C0C0C0", "#A9A9A9", "#D3D3D3", "#87CEFA",
        ],
        "avoid": ["#FF4500", "#FF6347", "#FFD700", "#FFA500", "#8B4513"],
    },
    "MUTED_AUTUMN": {
        "primary": [
            "#BC8F8F", "#D2B48C", "#DEB887", "#F5DEB3", "#8FBC8F",
            "#9ACD32", "#BDB76B", "#DAA520", "#CD853F", "#D2691E",
        ],
        "secondary": [
            "#808000", "#6B8E23", "#556B2F", "#A0522D", "#8B4513", "#B8860B",
        ],
        "avoid": ["#FF00FF", "#00FFFF", "#0000FF", "#FF1493", "#7B68EE"],
    },
    "MUTED_SUMMER": {
        "primary": [
            "#778899", "#708090", "#B0C4DE", "#C0C0C0", "#A9A9A9",
            "#D3D3D3", "#E6E6FA", "#D8BFD8", "#BC8F8F", "#DDA0DD",
        ],
        "secondary": [
            "#6A5ACD", "#9370DB", "#8B008B", "#4682B4", "#5F9EA0", "#20B2AA",
        ],
        "avoid": ["#FF4500", "#FFD700", "#FF6347", "#FFA500", "#FFFF00"],
    },
    "BRIGHT_SPRING": {
        "primary": [
            "#FF6347", "#FF7F50", "#FFA500", "#FFD700", "#ADFF2F",
            "#00FF7F", "#40E0D0", "#00CED1", "#FF69B4", "#FF1493",
        ],
        "secondary": [
            "#7FFF00", "#00FF00", "#00FFFF", "#1E90FF", "#FF4500", "#DC143C",
        ],
        "avoid": ["#000000", "#2F4F4F", "#191970", "#4B0082", "#800000"],
    },
    "BRIGHT_WINTER": {
        "primary": [
            "#FFFFFF", "#000000", "#FF0000", "#0000FF", "#FF00FF",
            "#00FFFF", "#FF1493", "#4169E1", "#9400D3", "#00FF00",
        ],
        "secondary": [
            "#DC143C", "#8A2BE2", "#7B68EE", "#6A5ACD", "#1E90FF", "#00CED1",
        ],
        "avoid": ["#F5DEB3", "#DEB887", "#D2B48C", "#BC8F8F", "#8B4513"],
    },
    "WARM_AUTUMN": {
        "primary": [
            "#FF8C00", "#FF7F50", "#CD853F", "#D2691E", "#8B4513",
            "#A0522D", "#B8860B", "#DAA520", "#808000", "#6B8E23",
        ],
        "secondary": [
            "#FF6347", "#FFA500", "#FFD700", "#F4A460", "#DEB887", "#228B22",
        ],
        "avoid": ["#FF00FF", "#00FFFF", "#0000FF", "#E6E6FA", "#D8BFD8"],
    },
    "WARM_SPRING": {
        "primary": [
            "#FFD700", "#FFA500", "#FF7F50", "#FF6347", "#FFDAB9",
            "#F0E68C", "#98FB98", "#00FA9A", "#40E0D0", "#FFB6C1",
        ],
        "secondary": [
            "#ADFF2F", "#7FFF00", "#00FF7F", "#FF69B4", "#FFA07A", "#F5DEB3",
        ],
        "avoid": ["#000000", "#191970", "#4B0082", "#2F4F4F", "#800000"],
    },
    "COOL_WINTER": {
        "primary": [
            "#000000", "#FFFFFF", "#191970", "#000080", "#4B0082",
            "#800080", "#C71585", "#DC143C", "#008B8B", "#2F4F4F",
        ],
        "secondary": [
            "#4169E1", "#6A5ACD", "#8A2BE2", "#9400D3", "#FF00FF", "#00CED1",
        ],
        "avoid": ["#FFD700", "#FFA500", "#FF7F50", "#F5DEB3", "#DEB887"],
    },
    "COOL_SUMMER": {
        "primary": [
            "#E6E6FA", "#D8BFD8", "#DDA0DD", "#B0C4DE", "#778899",
            "#708090", "#6A5ACD", "#9370DB", "#BC8F8F", "#C0C0C0",
        ],
        "secondary": [
            "#ADD8E6", "#87CEEB", "#87CEFA", "#4682B4", "#5F9EA0", "#20B2AA",
        ],
        "avoid": ["#FF4500", "#FF6347", "#FFD700", "#FFA500", "#8B4513"],
    },
}


def hex_to_rgb(hex_color: str) -> Optional[Dict[str, int]]:
    """Convert hex color to RGB dictionary"""
    clean_hex = hex_color.replace("#", "").lower()
    if len(clean_hex) != 6:
        return None
    
    try:
        return {
            "r": int(clean_hex[0:2], 16),
            "g": int(clean_hex[2:4], 16),
            "b": int(clean_hex[4:6], 16),
        }
    except ValueError:
        return None


def color_distance(hex1: str, hex2: str) -> float:
    """
    Calculate weighted Euclidean distance between two colors
    Uses weighted formula to account for human perception
    """
    rgb1 = hex_to_rgb(hex1)
    rgb2 = hex_to_rgb(hex2)
    
    if not rgb1 or not rgb2:
        return float("inf")
    
    r_mean = (rgb1["r"] + rgb2["r"]) / 2
    d_r = rgb1["r"] - rgb2["r"]
    d_g = rgb1["g"] - rgb2["g"]
    d_b = rgb1["b"] - rgb2["b"]
    
    return math.sqrt(
        (2 + r_mean / 256) * d_r * d_r +
        4 * d_g * d_g +
        (2 + (255 - r_mean) / 256) * d_b * d_b
    )


def min_distance_to_palette(item_color: str, palette_colors: List[str]) -> float:
    """Find minimum distance from a color to any color in a palette"""
    min_dist = float("inf")
    for palette_color in palette_colors:
        dist = color_distance(item_color, palette_color)
        if dist < min_dist:
            min_dist = dist
    return min_dist


def calculate_color_score(item_color: str, palette: Dict[str, List[str]]) -> float:
    """
    Calculate compatibility score for a single color against a palette
    Returns a score between 0 and 1
    """
    PERFECT_MATCH = 30
    GOOD_MATCH = 80
    MAX_DISTANCE = 200
    
    # Check if color is in avoid list
    avoid_dist = min_distance_to_palette(item_color, palette["avoid"])
    if avoid_dist < PERFECT_MATCH:
        return 0.1
    
    # Check primary colors
    primary_dist = min_distance_to_palette(item_color, palette["primary"])
    if primary_dist < PERFECT_MATCH:
        return 1.0
    if primary_dist < GOOD_MATCH:
        return 0.85 + (0.15 * (1 - primary_dist / GOOD_MATCH))
    
    # Check secondary colors
    secondary_dist = min_distance_to_palette(item_color, palette["secondary"])
    if secondary_dist < PERFECT_MATCH:
        return 0.8
    if secondary_dist < GOOD_MATCH:
        return 0.6 + (0.2 * (1 - secondary_dist / GOOD_MATCH))
    
    # Fallback: calculate based on overall distance
    overall_dist = min(primary_dist, secondary_dist)
    if overall_dist > MAX_DISTANCE:
        return 0.2
    
    return 0.2 + (0.4 * (1 - overall_dist / MAX_DISTANCE))


def calculate_seasonal_palette_scores(item_colors: List[str]) -> Dict[str, float]:
    """
    Calculate seasonal palette scores for a clothing item based on its colors
    Returns dict with scores (0-1) for each seasonal palette
    """
    scores = {}
    
    if not item_colors or len(item_colors) == 0:
        # Return neutral scores if no colors
        for palette in SEASONAL_PALETTES:
            scores[palette] = 0.5
        return scores
    
    # Normalize colors to uppercase hex
    normalized_colors = [c.upper() for c in item_colors]
    
    for palette in SEASONAL_PALETTES:
        palette_colors = SEASONAL_PALETTE_COLORS[palette]
        
        # Calculate score for each item color and average them
        total_score = 0
        for color in normalized_colors:
            total_score += calculate_color_score(color, palette_colors)
        
        # Average score, rounded to 2 decimal places
        scores[palette] = round((total_score / len(normalized_colors)) * 100) / 100
    
    return scores


def create_product_description(product: Dict) -> str:
    """Build text description from product metadata"""
    parts = []
    
    if product.get("name"):
        parts.append(product["name"])
    if product.get("category"):
        parts.append(product["category"])
    if product.get("subCategory"):
        parts.append(product["subCategory"])
    if product.get("color"):
        parts.append(product["color"])
    if product.get("description"):
        parts.append(product["description"])
    if product.get("material"):
        parts.append(product["material"])
    
    return " ".join(parts)


def get_text_embedding(text: str) -> Optional[List[float]]:
    """Get text embedding from embedding service"""
    try:
        response = requests.post(
            f"{EMBEDDING_SERVICE_URL}/embed/text",
            json={"text": text},
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        return data.get("embedding")
    except Exception as e:
        print(f"Error getting text embedding: {e}")
        return None


def get_image_embedding(image_url: str) -> Optional[List[float]]:
    """Get image embedding from embedding service by downloading image first"""
    try:
        # Download image from URL with browser headers to bypass hotlink protection
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "Referer": "https://www.zara.com/",
        }
        img_response = requests.get(image_url, headers=headers, timeout=15)
        img_response.raise_for_status()
        
        # Send to embedding service
        files = {"file": ("image.jpg", img_response.content, "image/jpeg")}
        response = requests.post(
            f"{EMBEDDING_SERVICE_URL}/embed/image",
            files=files,
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        return data.get("embedding")
    except Exception as e:
        print(f"Error getting image embedding: {e}")
        return None


def get_hybrid_embedding(image_url: str, text: str) -> Optional[List[float]]:
    """
    Get hybrid embedding by combining image and text embeddings
    85% image + 15% text
    """
    # Get both embeddings
    image_emb = get_image_embedding(image_url)
    text_emb = get_text_embedding(text)
    
    if not image_emb:
        print("  ⚠ Image embedding failed, using text only")
        return text_emb
    
    if not text_emb:
        print("  ⚠ Text embedding failed, using image only")
        return image_emb
    
    # Combine with weights: 85% image + 15% text
    IMAGE_WEIGHT = 0.85
    TEXT_WEIGHT = 0.15
    
    hybrid = []
    for i in range(len(image_emb)):
        hybrid.append(image_emb[i] * IMAGE_WEIGHT + text_emb[i] * TEXT_WEIGHT)
    
    return hybrid


def process_products():
    """Main processing loop for store products"""
    if not MONGODB_URL:
        print("ERROR: MONGODB_URL not set in environment")
        return
    
    print(f"Connecting to MongoDB...")
    client = MongoClient(MONGODB_URL)
    db = client[MONGODB_DB_NAME]
    collection = db["store_products"]
    
    # Count total and remaining products
    total_count = collection.count_documents({})
    remaining_count = collection.count_documents({"embedding": {"$exists": False}})
    
    print(f"Total products: {total_count}")
    print(f"Products without embeddings: {remaining_count}")
    print(f"Embedding service URL: {EMBEDDING_SERVICE_URL}")
    print(f"Batch size: {BATCH_SIZE}\n")
    
    if remaining_count == 0:
        print("All products already have embeddings!")
        return
    
    # Process in batches
    processed = 0
    failed = 0
    
    while True:
        # Get batch of products without embeddings
        products = list(
            collection.find(
                {"embedding": {"$exists": False}},
                limit=BATCH_SIZE
            )
        )
        
        if not products:
            break
        
        print(f"Processing batch of {len(products)} products...")
        
        for product in products:
            try:
                product_id = product["_id"]
                
                # Get image URL - try primaryImageUrl first, then imageUrls
                image_url = product.get("primaryImageUrl")
                if not image_url:
                    image_urls = product.get("imageUrls", [])
                    if image_urls and len(image_urls) > 0:
                        image_url = image_urls[0]
                        print(f"  ℹ Using imageUrls[0] for {product_id}")
                
                if not image_url:
                    print(f"  ⚠ Skipping {product_id}: no image available")
                    continue
                
                # Create text description
                text = create_product_description(product)
                
                # Get hybrid embedding
                embedding = get_hybrid_embedding(
                    image_url,
                    text
                )
                
                if not embedding:
                    print(f"  ✗ Failed to get embedding for {product_id}")
                    failed += 1
                    continue
                
                # Update document with embedding only
                collection.update_one(
                    {"_id": product_id},
                    {
                        "$set": {
                            "embedding": embedding,
                        }
                    }
                )
                
                processed += 1
                print(f"  ✓ Processed {product_id} ({processed}/{remaining_count})")
                
            except Exception as e:
                print(f"  ✗ Error processing product {product.get('_id')}: {e}")
                failed += 1
    
    print(f"\n{'='*50}")
    print(f"Processing complete!")
    print(f"Successfully processed: {processed}")
    print(f"Failed: {failed}")
    print(f"{'='*50}")
    
    client.close()


if __name__ == "__main__":
    print("Store Products Embedding Pipeline")
    print("=" * 50)
    process_products()
