"""Client for the embedding service used for semantic search."""

from __future__ import annotations

from typing import List

import asyncio
import httpx

from mcp_servers.core.config import get_settings


async def embed_text(text: str, *, timeout_s: float = 30.0) -> List[float]:
    """Embed a single text string using the embedding service."""
    settings = get_settings()
    url = f"{settings.EMBEDDING_SERVICE_URL.rstrip('/')}/embed/text"
    async with httpx.AsyncClient(timeout=timeout_s) as client:
        resp = await client.post(url, json={"text": text})
        resp.raise_for_status()
        data = resp.json()
        return data["embedding"]


async def embed_texts(texts: List[str], *, timeout_s: float = 60.0) -> List[List[float]]:
    """Embed a list of texts. Uses concurrent calls (embedding service is single-text API)."""
    settings = get_settings()
    url = f"{settings.EMBEDDING_SERVICE_URL.rstrip('/')}/embed/text"
    async with httpx.AsyncClient(timeout=timeout_s) as client:
        tasks = [client.post(url, json={"text": t}) for t in texts]
        responses = await asyncio.gather(*tasks)
        embeddings: List[List[float]] = []
        for r in responses:
            r.raise_for_status()
            embeddings.append(r.json()["embedding"])
        return embeddings

