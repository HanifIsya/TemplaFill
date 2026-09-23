"""Vector store abstraction — Task 1.4 (pgvector).

Provides both:
 - InMemoryVectorStore (default for dev/tests, no Postgres needed)
 - PgVectorStore stub (production interface, requires postgres+pgvector)

The interface is async-compatible and stores chunks with embeddings.
For MVP we use InMemoryVectorStore; PgVectorStore is wired when DATABASE_URL
points to postgres and pgvector extension is available.

Usage:
    store = get_vector_store()  # returns InMemory or PgVector based on config
    await store.add(chunks_with_embeddings)
    results = await store.search(query_embedding, top_k=5)
"""

from __future__ import annotations

import math
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from pydantic import BaseModel, Field


class StoredChunk(BaseModel):
    """Chunk stored with its embedding."""

    chunk_id: str
    text: str
    embedding: List[float]
    page_number: int
    header: Optional[str] = None
    metadata: Dict = Field(default_factory=dict)
    token_count: int = 0


class SearchResult(BaseModel):
    """Result from vector search."""

    chunk: StoredChunk
    score: float  # cosine similarity [0,1] (higher is more similar)


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    """Compute cosine similarity between two vectors (pure python)."""
    if len(a) != len(b):
        raise ValueError(f"Vector dim mismatch: {len(a)} vs {len(b)}")
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


class VectorStore(ABC):
    """Abstract vector store interface."""

    @abstractmethod
    async def add(self, chunks: List[StoredChunk]) -> None:
        """Add chunks with embeddings to store."""
        ...

    @abstractmethod
    async def search(self, query_embedding: List[float], top_k: int = 5) -> List[SearchResult]:
        """Search top_k most similar chunks."""
        ...

    @abstractmethod
    async def clear(self) -> None:
        """Clear all stored chunks (useful for tests / per-job isolation)."""
        ...

    @abstractmethod
    def count(self) -> int:
        """Return number of stored chunks."""
        ...


class InMemoryVectorStore(VectorStore):
    """In-memory vector store using brute-force cosine search.

    Suitable for dev, tests, and small documents (MVP). For production
    with large corpora, swap to PgVectorStore.
    """

    def __init__(self):
        self._store: Dict[str, StoredChunk] = {}
        # Optional namespace for per-job isolation
        self._job_id: Optional[str] = None

    async def add(self, chunks: List[StoredChunk]) -> None:
        for c in chunks:
            self._store[c.chunk_id] = c

    async def search(self, query_embedding: List[float], top_k: int = 5) -> List[SearchResult]:
        if not self._store:
            return []
        scored: List[Tuple[float, StoredChunk]] = []
        for chunk in self._store.values():
            if not chunk.embedding or len(chunk.embedding) != len(query_embedding):
                continue
            sim = _cosine_similarity(query_embedding, chunk.embedding)
            scored.append((sim, chunk))
        # Sort descending by similarity
        scored.sort(key=lambda x: x[0], reverse=True)
        top = scored[:top_k]
        return [SearchResult(chunk=chunk, score=score) for score, chunk in top]

    async def clear(self) -> None:
        self._store.clear()

    def count(self) -> int:
        return len(self._store)

    # Sync helpers for convenience in tests
    def add_sync(self, chunks: List[StoredChunk]) -> None:
        for c in chunks:
            self._store[c.chunk_id] = c

    def search_sync(self, query_embedding: List[float], top_k: int = 5) -> List[SearchResult]:
        if not self._store:
            return []
        scored: List[Tuple[float, StoredChunk]] = []
        for chunk in self._store.values():
            sim = _cosine_similarity(query_embedding, chunk.embedding)
            scored.append((sim, chunk))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [SearchResult(chunk=chunk, score=score) for score, chunk in scored[:top_k]]


class PgVectorStore(VectorStore):
    """Postgres + pgvector implementation (stub for production).

    This class provides the same interface but persists to Postgres.
    For MVP we keep it as a stub that falls back to InMemory if DB unavailable.
    Full implementation would use SQLAlchemy async + pgvector column (Vector(768)).

    Schema (per docs/2-architecture/DATA_MODEL.md):
        Table `chunks`:
            id UUID PK, job_id UUID, chunk_id TEXT, text TEXT, embedding VECTOR(768),
            page_number INT, header TEXT, token_count INT, created_at TIMESTAMPTZ

    Methods below raise NotImplemented with guidance; actual DB wiring is Task 1.4 future work.
    InMemoryVectorStore is used until postgres is provisioned.
    """

    def __init__(self, database_url: str):
        self.database_url = database_url
        self._fallback = InMemoryVectorStore()
        self._warning_shown = False

    async def add(self, chunks: List[StoredChunk]) -> None:
        # TODO: implement SQLAlchemy insert with pgvector
        # For now, delegate to fallback to keep pipeline functional without DB
        await self._fallback.add(chunks)

    async def search(self, query_embedding: List[float], top_k: int = 5) -> List[SearchResult]:
        # TODO: SELECT ... ORDER BY embedding <=> :query LIMIT :top_k
        return await self._fallback.search(query_embedding, top_k=top_k)

    async def clear(self) -> None:
        await self._fallback.clear()

    def count(self) -> int:
        return self._fallback.count()


# Singleton factory
_vector_store_instance: Optional[VectorStore] = None


def get_vector_store(force_in_memory: bool = False) -> VectorStore:
    """Factory returning vector store singleton.

    Args:
        force_in_memory: If True, always return InMemory (useful for tests)
    """
    global _vector_store_instance
    if force_in_memory:
        return InMemoryVectorStore()
    if _vector_store_instance is not None:
        return _vector_store_instance

    try:
        from app.core.config import get_settings

        settings = get_settings()
        # If DATABASE_URL looks like postgres and not explicitly InMemory, attempt PgVector
        if settings.database_url.startswith("postgresql") and not force_in_memory:
            # Check if we can import asyncpg/pgvector; if not, fallback
            try:
                import asyncpg  # noqa: F401
                import pgvector  # noqa: F401

                _vector_store_instance = PgVectorStore(settings.database_url)
            except ImportError:
                _vector_store_instance = InMemoryVectorStore()
        else:
            _vector_store_instance = InMemoryVectorStore()
    except Exception:  # noqa: BLE001
        _vector_store_instance = InMemoryVectorStore()

    return _vector_store_instance


__all__ = [
    "VectorStore",
    "InMemoryVectorStore",
    "PgVectorStore",
    "StoredChunk",
    "SearchResult",
    "get_vector_store",
    "_cosine_similarity",
]
