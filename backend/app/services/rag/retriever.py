"""RAG retrieval service — Task 1.6.

Given a field query (name/description), retrieve top-K relevant chunks
via embedding + vector store cosine search, optionally reranking.

Strategy per ARCHITECTURE.md §4:
 1. Convert field name/description to query embedding
 2. Cosine similarity search in pgvector (top-K, K=5)
 3. Optional reranking (stub for future cross-encoder)
 4. Return top chunks with relevance scores

Usage:
    from app.services.rag.retriever import get_retriever

    retriever = get_retriever(vector_store, embedder)
    results = await retriever.retrieve("invoice total amount", top_k=5)
    for r in results:
        print(r.chunk.text, r.score)
"""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel

from app.services.rag.embedder import Embedder, get_embedder
from app.services.rag.vector_store import SearchResult, VectorStore, get_vector_store


class RetrievalResult(BaseModel):
    """Single retrieved chunk with score."""

    chunk_id: str
    text: str
    page_number: int
    header: Optional[str] = None
    score: float
    # Full chunk object for downstream extraction
    chunk: Optional[SearchResult] = None  # type: ignore[assignment]


class Retriever:
    """Field-aware retriever: query -> relevant chunks."""

    def __init__(
        self,
        vector_store: Optional[VectorStore] = None,
        embedder: Optional[Embedder] = None,
        default_top_k: int = 5,
    ):
        self.vector_store = vector_store or get_vector_store(force_in_memory=True)
        self.embedder = embedder or get_embedder(force_fake=True)
        try:
            from app.core.config import get_settings

            settings = get_settings()
            self.default_top_k = settings.rag_top_k
        except Exception:  # noqa: BLE001
            self.default_top_k = default_top_k
        if default_top_k != 5:
            self.default_top_k = default_top_k

    async def retrieve(
        self,
        query: str,
        top_k: Optional[int] = None,
        threshold: float = 0.0,
    ) -> List[SearchResult]:
        """Retrieve top-K chunks for a query string.

        Args:
            query: Field name / description / question (e.g., "invoice total")
            top_k: Number to retrieve (defaults to config RAG_TOP_K)
            threshold: Minimum similarity to include (0.0 = include all)

        Returns:
            List of SearchResult sorted by relevance (highest first)
        """
        if not query or not query.strip():
            return []
        k = top_k if top_k is not None else self.default_top_k
        k = max(1, min(k, 20))

        # 1. Embed query
        query_embedding = await self.embedder.embed_query(query)

        # 2. Vector search
        results = await self.vector_store.search(query_embedding, top_k=k)

        # 3. Threshold filter
        if threshold > 0:
            results = [r for r in results if r.score >= threshold]

        # 4. Optional rerank stub (future: cross-encoder would reorder here)
        # For MVP we keep cosine ranking

        return results

    async def retrieve_for_field(
        self,
        field_name: str,
        field_description: Optional[str] = None,
        top_k: Optional[int] = None,
    ) -> List[SearchResult]:
        """Convenience: build query from field name + description.

        Example field: "total_amount" with description "Total invoice amount including tax"
        """
        parts = [field_name.replace("_", " ")]
        if field_description and field_description.strip():
            parts.append(field_description.strip())
        # Add synonym expansion for better recall (simple, per mapper synonyms)
        query = " ".join(parts)
        return await self.retrieve(query, top_k=top_k)

    # Sync wrappers for tests
    def retrieve_sync(self, query: str, top_k: Optional[int] = None) -> List[SearchResult]:
        import asyncio

        return asyncio.run(self.retrieve(query, top_k=top_k))

    def retrieve_for_field_sync(
        self, field_name: str, field_description: Optional[str] = None, top_k: Optional[int] = None
    ) -> List[SearchResult]:
        import asyncio

        return asyncio.run(self.retrieve_for_field(field_name, field_description, top_k=top_k))


def get_retriever(
    vector_store: Optional[VectorStore] = None,
    embedder: Optional[Embedder] = None,
    force_fake: bool = True,
) -> Retriever:
    """Factory for retriever."""
    if vector_store is None:
        vector_store = get_vector_store(force_in_memory=True)
    if embedder is None:
        embedder = get_embedder(force_fake=force_fake)
    return Retriever(vector_store=vector_store, embedder=embedder)


__all__ = ["Retriever", "RetrievalResult", "get_retriever"]
