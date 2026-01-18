import os
import uuid

import pytest


pytestmark = pytest.mark.asyncio


@pytest.mark.integration
async def test_filter_wardrobe_items_with_real_mongo(monkeypatch):
    mongo_uri = os.getenv("MONGODB_URI")
    if not mongo_uri:
        pytest.skip("MONGODB_URI not set; skipping Mongo integration test")

    # Use unique test DB/collection names to avoid touching real data.
    test_db = f"aesthetiq_test_{uuid.uuid4().hex[:8]}"
    test_collection = "wardrobe"

    os.environ["MONGODB_DB_WARDROBE"] = test_db
    os.environ["MONGODB_COLLECTION_WARDROBE"] = test_collection

    # Clear cached settings/mongo client so env overrides take effect.
    from mcp_servers.core import config as mcp_config
    from mcp_servers.shared import mongo as mongo_shared

    mcp_config.get_settings.cache_clear()
    mongo_shared.get_mongo_client.cache_clear()

    from mcp_servers.shared.mongo import get_collection
    from mcp_servers.wardrobe_server.schemas import WardrobeFilters
    from mcp_servers.wardrobe_server import tools
    from mcp_servers.core.config import get_settings

    settings = get_settings()
    coll = get_collection(settings.MONGODB_DB_WARDROBE, settings.MONGODB_COLLECTION_WARDROBE)

    # Seed
    await coll.insert_many(
        [
            {"user_id": "u1", "name": "Blue Jacket", "category": "jackets", "color": "blue"},
            {"user_id": "u1", "name": "Red Pants", "category": "pants", "color": "red"},
            {"user_id": "u2", "name": "Other User Jacket", "category": "jackets", "color": "black"},
        ]
    )

    # Act
    items = await tools.filter_wardrobe_items("u1", WardrobeFilters(category="jackets"), limit=50)

    # Assert
    assert len(items) == 1
    assert items[0].name == "Blue Jacket"

