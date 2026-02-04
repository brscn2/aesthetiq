import pytest

from mcp_servers.web_search_server import tools


@pytest.mark.asyncio
async def test_web_search_parses_results(monkeypatch):
    class FakeTavily:
        async def search(self, query: str, *, max_results: int = 5):
            assert query == "jackets"
            assert max_results == 3
            return [{"title": "A Jacket", "url": "https://example.com/a", "content": "nice"}]

    monkeypatch.setattr(tools, "TavilyClient", lambda: FakeTavily())

    results = await tools.web_search("jackets", max_results=3)
    assert len(results) == 1
    assert results[0].title == "A Jacket"
    assert results[0].url == "https://example.com/a"

