from fastapi.testclient import TestClient

from mcp_servers.main import app


def test_wardrobe_health_route():
    client = TestClient(app)
    resp = client.get("/mcp/wardrobe/health")
    assert resp.status_code == 200
    assert resp.json()["domain"] == "wardrobe"

