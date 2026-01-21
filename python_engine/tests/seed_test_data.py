#!/usr/bin/env python3
"""
Seed test data for comprehensive testing.

Run with:
    cd python_engine
    source .venv/bin/activate
    python -m tests.seed_test_data
"""
import asyncio
import os
import sys
from datetime import datetime
from pathlib import Path

# Add python_engine to path
python_engine_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(python_engine_dir))

# Load environment variables from .env files
from dotenv import load_dotenv

# Try backend .env first (has MongoDB Atlas URI)
backend_env = python_engine_dir.parent / "backend" / ".env"
if backend_env.exists():
    load_dotenv(backend_env, override=True)
    
# Then python_engine .env (may override with local settings)
env_path = python_engine_dir / ".env"
if env_path.exists():
    # Don't override MONGODB_URI if already set from backend
    load_dotenv(env_path, override=False)

import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

# Configuration
# Backend uses MONGO_URI, python_engine uses MONGODB_URI
MONGODB_URI = os.environ.get("MONGO_URI") or os.environ.get("MONGODB_URI")
# Always use localhost for embedding service (not docker URL)
EMBEDDING_SERVICE_URL = "http://localhost:8004"
DB_NAME = "aesthetiq"

# Test data constants
TEST_USER_ID = "test_user_001"
TEST_RETAILER_NAME = "TestRetailer"


async def get_embedding(text: str) -> list[float]:
    """Get embedding from embedding service."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                f"{EMBEDDING_SERVICE_URL}/embed/text",
                json={"text": text}
            )
            response.raise_for_status()
            return response.json()["embedding"]
        except Exception as e:
            print(f"  ⚠ Could not get embedding for '{text[:30]}...': {e}")
            return None


async def seed_retailer(db) -> ObjectId:
    """Seed test retailer."""
    print("\n📦 Seeding retailer...")
    
    existing = await db.retailers.find_one({"name": TEST_RETAILER_NAME})
    if existing:
        print(f"  ✓ Retailer '{TEST_RETAILER_NAME}' already exists")
        return existing["_id"]
    
    retailer = {
        "name": TEST_RETAILER_NAME,
        "website": "https://test-retailer.com",
        "country": "USA",
        "isActive": True,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    result = await db.retailers.insert_one(retailer)
    print(f"  ✓ Created retailer: {result.inserted_id}")
    return result.inserted_id


async def seed_commerce_items(db, retailer_id: ObjectId):
    """Seed commerce items with embeddings."""
    print("\n👕 Seeding commerce items...")
    
    items = [
        # TOPS
        {
            "name": "Classic Black Blazer",
            "category": "TOP",
            "subCategory": "Blazer",
            "description": "A timeless black blazer perfect for interviews and formal occasions",
            "colors": ["#000000"],
            "price": 15999,
            "currency": "USD",
            "brand": "TestBrand",
            "size": ["S", "M", "L", "XL"],
            "inStock": True,
            "productUrl": "https://test-retailer.com/black-blazer",
            "imageUrl": "https://via.placeholder.com/400x600?text=Black+Blazer",
            "seasonalPaletteScores": {"WARM_AUTUMN": 0.3, "COOL_WINTER": 0.9, "COOL_SUMMER": 0.7, "WARM_SPRING": 0.2},
        },
        {
            "name": "Navy Blue Cardigan",
            "category": "TOP",
            "subCategory": "Cardigan",
            "description": "Soft navy cardigan for casual and business casual settings",
            "colors": ["#000080"],
            "price": 7999,
            "currency": "USD",
            "brand": "CozyWear",
            "size": ["XS", "S", "M", "L"],
            "inStock": True,
            "productUrl": "https://test-retailer.com/navy-cardigan",
            "imageUrl": "https://via.placeholder.com/400x600?text=Navy+Cardigan",
            "seasonalPaletteScores": {"WARM_AUTUMN": 0.5, "COOL_WINTER": 0.8, "COOL_SUMMER": 0.9, "WARM_SPRING": 0.3},
        },
        {
            "name": "White Cotton T-Shirt",
            "category": "TOP",
            "subCategory": "T-Shirt",
            "description": "Essential white tee for everyday casual wear",
            "colors": ["#FFFFFF"],
            "price": 2499,
            "currency": "USD",
            "brand": "BasicBrand",
            "size": ["XS", "S", "M", "L", "XL"],
            "inStock": True,
            "productUrl": "https://test-retailer.com/white-tee",
            "imageUrl": "https://via.placeholder.com/400x600?text=White+Tee",
            "seasonalPaletteScores": {"WARM_AUTUMN": 0.6, "COOL_WINTER": 0.8, "COOL_SUMMER": 0.9, "WARM_SPRING": 0.9},
        },
        {
            "name": "Red Silk Blouse",
            "category": "TOP",
            "subCategory": "Blouse",
            "description": "Elegant red silk blouse for special occasions",
            "colors": ["#C41E3A"],
            "price": 12999,
            "currency": "USD",
            "brand": "LuxeBrand",
            "size": ["XS", "S", "M"],
            "inStock": True,
            "productUrl": "https://test-retailer.com/red-blouse",
            "imageUrl": "https://via.placeholder.com/400x600?text=Red+Blouse",
            "seasonalPaletteScores": {"WARM_AUTUMN": 0.9, "COOL_WINTER": 0.7, "COOL_SUMMER": 0.4, "WARM_SPRING": 0.8},
        },
        {
            "name": "Olive Green Jacket",
            "category": "TOP",
            "subCategory": "Jacket",
            "description": "Versatile olive jacket perfect for autumn layering",
            "colors": ["#708238"],
            "price": 18999,
            "currency": "USD",
            "brand": "OutdoorStyle",
            "size": ["S", "M", "L", "XL"],
            "inStock": True,
            "productUrl": "https://test-retailer.com/olive-jacket",
            "imageUrl": "https://via.placeholder.com/400x600?text=Olive+Jacket",
            "seasonalPaletteScores": {"WARM_AUTUMN": 0.95, "COOL_WINTER": 0.3, "COOL_SUMMER": 0.4, "WARM_SPRING": 0.6},
        },
        # BOTTOMS
        {
            "name": "Dark Wash Denim Jeans",
            "category": "BOTTOM",
            "subCategory": "Jeans",
            "description": "Classic dark wash jeans with slim fit",
            "colors": ["#1A237E"],
            "price": 8999,
            "currency": "USD",
            "brand": "DenimCo",
            "size": ["28", "30", "32", "34", "36"],
            "inStock": True,
            "productUrl": "https://test-retailer.com/dark-jeans",
            "imageUrl": "https://via.placeholder.com/400x600?text=Dark+Jeans",
            "seasonalPaletteScores": {"WARM_AUTUMN": 0.6, "COOL_WINTER": 0.8, "COOL_SUMMER": 0.7, "WARM_SPRING": 0.4},
        },
        {
            "name": "Khaki Chinos",
            "category": "BOTTOM",
            "subCategory": "Chinos",
            "description": "Comfortable khaki chinos for smart casual",
            "colors": ["#C3B091"],
            "price": 5999,
            "currency": "USD",
            "brand": "SmartCasual",
            "size": ["30", "32", "34", "36"],
            "inStock": True,
            "productUrl": "https://test-retailer.com/khaki-chinos",
            "imageUrl": "https://via.placeholder.com/400x600?text=Khaki+Chinos",
            "seasonalPaletteScores": {"WARM_AUTUMN": 0.85, "COOL_WINTER": 0.4, "COOL_SUMMER": 0.5, "WARM_SPRING": 0.8},
        },
        {
            "name": "Black Dress Pants",
            "category": "BOTTOM",
            "subCategory": "Dress Pants",
            "description": "Formal black dress pants for professional settings",
            "colors": ["#000000"],
            "price": 9999,
            "currency": "USD",
            "brand": "FormalWear",
            "size": ["28", "30", "32", "34"],
            "inStock": True,
            "productUrl": "https://test-retailer.com/black-pants",
            "imageUrl": "https://via.placeholder.com/400x600?text=Black+Pants",
            "seasonalPaletteScores": {"WARM_AUTUMN": 0.4, "COOL_WINTER": 0.95, "COOL_SUMMER": 0.8, "WARM_SPRING": 0.3},
        },
        # SHOES
        {
            "name": "Brown Leather Oxford Shoes",
            "category": "SHOE",
            "subCategory": "Oxford",
            "description": "Classic brown leather oxfords for formal occasions",
            "colors": ["#8B4513"],
            "price": 19999,
            "currency": "USD",
            "brand": "ClassicShoe",
            "size": ["8", "9", "10", "11", "12"],
            "inStock": True,
            "productUrl": "https://test-retailer.com/brown-oxford",
            "imageUrl": "https://via.placeholder.com/400x600?text=Brown+Oxford",
            "seasonalPaletteScores": {"WARM_AUTUMN": 0.9, "COOL_WINTER": 0.5, "COOL_SUMMER": 0.4, "WARM_SPRING": 0.7},
        },
        {
            "name": "White Canvas Sneakers",
            "category": "SHOE",
            "subCategory": "Sneakers",
            "description": "Casual white sneakers for everyday wear",
            "colors": ["#FFFFFF"],
            "price": 7999,
            "currency": "USD",
            "brand": "StreetStyle",
            "size": ["7", "8", "9", "10", "11"],
            "inStock": True,
            "productUrl": "https://test-retailer.com/white-sneakers",
            "imageUrl": "https://via.placeholder.com/400x600?text=White+Sneakers",
            "seasonalPaletteScores": {"WARM_AUTUMN": 0.5, "COOL_WINTER": 0.7, "COOL_SUMMER": 0.9, "WARM_SPRING": 0.9},
        },
        # ACCESSORIES
        {
            "name": "Navy Blue Silk Tie",
            "category": "ACCESSORY",
            "subCategory": "Tie",
            "description": "Elegant navy silk tie for business attire",
            "colors": ["#000080"],
            "price": 4999,
            "currency": "USD",
            "brand": "SilkTies",
            "size": ["One Size"],
            "inStock": True,
            "productUrl": "https://test-retailer.com/navy-tie",
            "imageUrl": "https://via.placeholder.com/400x600?text=Navy+Tie",
            "seasonalPaletteScores": {"WARM_AUTUMN": 0.4, "COOL_WINTER": 0.85, "COOL_SUMMER": 0.9, "WARM_SPRING": 0.3},
        },
        {
            "name": "Brown Leather Belt",
            "category": "ACCESSORY",
            "subCategory": "Belt",
            "description": "Classic brown leather belt",
            "colors": ["#8B4513"],
            "price": 3999,
            "currency": "USD",
            "brand": "LeatherGoods",
            "size": ["S", "M", "L"],
            "inStock": True,
            "productUrl": "https://test-retailer.com/brown-belt",
            "imageUrl": "https://via.placeholder.com/400x600?text=Brown+Belt",
            "seasonalPaletteScores": {"WARM_AUTUMN": 0.9, "COOL_WINTER": 0.4, "COOL_SUMMER": 0.3, "WARM_SPRING": 0.7},
        },
    ]
    
    # Check existing items
    existing_count = await db.commerceitems.count_documents({})
    if existing_count >= len(items):
        print(f"  ✓ Commerce items already seeded ({existing_count} items)")
        return
    
    # Clear existing test items and seed new ones
    await db.commerceitems.delete_many({"retailerId": retailer_id})
    
    for item in items:
        # Get embedding for item
        embed_text = f"{item['name']} {item['description']} {item['category']} {item['subCategory']}"
        embedding = await get_embedding(embed_text)
        
        doc = {
            **item,
            "retailerId": retailer_id,
            "embedding": embedding,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
        }
        
        result = await db.commerceitems.insert_one(doc)
        has_embed = "✓" if embedding else "⚠"
        print(f"  {has_embed} Created: {item['name']} ({item['category']}) - {result.inserted_id}")
    
    print(f"  ✓ Seeded {len(items)} commerce items")


async def seed_user(db) -> ObjectId:
    """Seed test user."""
    print("\n👤 Seeding test user...")
    
    existing = await db.users.find_one({"clerkId": TEST_USER_ID})
    if existing:
        print(f"  ✓ User '{TEST_USER_ID}' already exists")
        return existing["_id"]
    
    user = {
        "clerkId": TEST_USER_ID,
        "email": "test@aesthetiq.com",
        "name": "Test User",
        "role": "user",
        "settings": {
            "notifications": True,
            "language": "en",
        },
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    result = await db.users.insert_one(user)
    print(f"  ✓ Created user: {result.inserted_id}")
    return result.inserted_id


async def seed_color_analysis(db, user_id: ObjectId):
    """Seed color analysis for test user."""
    print("\n🎨 Seeding color analysis...")
    
    existing = await db.coloranalyses.find_one({"userId": TEST_USER_ID})
    if existing:
        print(f"  ✓ Color analysis for '{TEST_USER_ID}' already exists")
        return
    
    analysis = {
        "userId": TEST_USER_ID,
        "season": "WARM_AUTUMN",
        "subSeason": "Deep Autumn",
        "contrastLevel": "medium",
        "undertone": "warm",
        "characteristics": {
            "bestColors": ["olive", "rust", "gold", "cream", "brown"],
            "avoidColors": ["black", "cool pink", "icy blue"],
        },
        "analyzedAt": datetime.utcnow(),
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    result = await db.coloranalyses.insert_one(analysis)
    print(f"  ✓ Created color analysis: {result.inserted_id}")


async def seed_style_profile(db, user_id: ObjectId):
    """Seed style profile for test user."""
    print("\n🎭 Seeding style profile...")
    
    existing = await db.styleprofiles.find_one({"userId": TEST_USER_ID})
    if existing:
        print(f"  ✓ Style profile for '{TEST_USER_ID}' already exists")
        return
    
    profile = {
        "userId": TEST_USER_ID,
        "styleArchetype": "Classic",
        "secondaryArchetype": "Natural",
        "preferences": {
            "formalLevel": 3,
            "adventurousness": 2,
            "colorfulness": 2,
        },
        "bodyMeasurements": {
            "height": "5'10\"",
            "bodyType": "Athletic",
        },
        "lifestyleFactors": {
            "occupation": "Business Professional",
            "occasions": ["work", "casual", "formal events"],
        },
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    result = await db.styleprofiles.insert_one(profile)
    print(f"  ✓ Created style profile: {result.inserted_id}")


async def seed_wardrobe_items(db, user_id: ObjectId):
    """Seed wardrobe items for test user."""
    print("\n🧥 Seeding wardrobe items...")
    
    existing_count = await db.wardrobeitems.count_documents({"userId": TEST_USER_ID})
    if existing_count >= 5:
        print(f"  ✓ Wardrobe items for '{TEST_USER_ID}' already seeded ({existing_count} items)")
        return
    
    items = [
        {
            "name": "My Favorite Navy Blazer",
            "category": "TOP",
            "subCategory": "Blazer",
            "colors": ["#000080"],
            "brand": "Hugo Boss",
            "size": "M",
            "notes": "Great for meetings",
        },
        {
            "name": "Casual Gray Sweater",
            "category": "TOP",
            "subCategory": "Sweater",
            "colors": ["#808080"],
            "brand": "Uniqlo",
            "size": "M",
            "notes": "Comfortable weekend wear",
        },
        {
            "name": "Dark Blue Jeans",
            "category": "BOTTOM",
            "subCategory": "Jeans",
            "colors": ["#1A237E"],
            "brand": "Levi's",
            "size": "32",
            "notes": "Everyday jeans",
        },
        {
            "name": "Brown Leather Loafers",
            "category": "SHOE",
            "subCategory": "Loafers",
            "colors": ["#8B4513"],
            "brand": "Cole Haan",
            "size": "10",
            "notes": "Smart casual shoes",
        },
        {
            "name": "Silver Watch",
            "category": "ACCESSORY",
            "subCategory": "Watch",
            "colors": ["#C0C0C0"],
            "brand": "Seiko",
            "size": "One Size",
            "notes": "Daily wear watch",
        },
    ]
    
    # Clear existing and re-seed
    await db.wardrobeitems.delete_many({"userId": TEST_USER_ID})
    
    for item in items:
        embed_text = f"{item['name']} {item['category']} {item['subCategory']} {item.get('brand', '')}"
        embedding = await get_embedding(embed_text)
        
        doc = {
            **item,
            "userId": TEST_USER_ID,
            "embedding": embedding,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
        }
        result = await db.wardrobeitems.insert_one(doc)
        has_embed = "✓" if embedding else "⚠"
        print(f"  {has_embed} Created: {item['name']} - {result.inserted_id}")
    
    print(f"  ✓ Seeded {len(items)} wardrobe items")


async def main():
    """Main seeding function."""
    print("=" * 60)
    print("AesthetIQ Test Data Seeder")
    print("=" * 60)
    
    if not MONGODB_URI:
        print("\n❌ MONGODB_URI environment variable not set!")
        print("\nRun with:")
        print("  export MONGODB_URI='your-mongodb-uri'")
        print("  python -m tests.seed_test_data")
        sys.exit(1)
    
    print(f"\n📊 MongoDB: {MONGODB_URI[:50]}...")
    print(f"📊 Embedding Service: {EMBEDDING_SERVICE_URL}")
    
    # Check embedding service
    print("\n🔍 Checking embedding service...")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{EMBEDDING_SERVICE_URL}/health")
            data = resp.json()
            if data.get("model_loaded"):
                print(f"  ✓ Embedding service ready (device: {data.get('device')})")
            else:
                print("  ⚠ Embedding service model not loaded - items will be seeded without embeddings")
    except Exception as e:
        print(f"  ⚠ Embedding service not available: {e}")
        print("  Items will be seeded without embeddings")
    
    # Connect to MongoDB
    # Add tlsAllowInvalidCertificates for development with Atlas
    client = AsyncIOMotorClient(
        MONGODB_URI,
        tlsAllowInvalidCertificates=True,
        serverSelectionTimeoutMS=30000,
    )
    db = client[DB_NAME]
    
    try:
        # Test connection
        await db.command("ping")
        print("\n✓ Connected to MongoDB")
        
        # Seed data
        retailer_id = await seed_retailer(db)
        await seed_commerce_items(db, retailer_id)
        user_id = await seed_user(db)
        await seed_color_analysis(db, user_id)
        await seed_style_profile(db, user_id)
        await seed_wardrobe_items(db, user_id)
        
        print("\n" + "=" * 60)
        print("✓ Test data seeding complete!")
        print("=" * 60)
        
        # Print summary
        print("\n📊 Summary:")
        print(f"  - Retailers: {await db.retailers.count_documents({})}")
        print(f"  - Commerce Items: {await db.commerceitems.count_documents({})}")
        print(f"  - Users: {await db.users.count_documents({})}")
        print(f"  - Color Analyses: {await db.coloranalyses.count_documents({})}")
        print(f"  - Style Profiles: {await db.styleprofiles.count_documents({})}")
        print(f"  - Wardrobe Items: {await db.wardrobeitems.count_documents({})}")
        
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
