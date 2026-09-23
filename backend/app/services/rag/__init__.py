"""RAG pipeline services — chunking, embedding, retrieval (Tasks 1.3-1.6)."""

from app.services.rag.chunker import Chunk, chunk_document, chunk_text, count_tokens
from app.services.rag.embedder import Embedder, embed_query, embed_texts, get_embedder
from app.services.rag.retriever import Retriever, get_retriever
from app.services.rag.vector_store import (
    InMemoryVectorStore,
    PgVectorStore,
    SearchResult,
    StoredChunk,
    VectorStore,
    get_vector_store,
)

__all__ = [
    # Chunking
    "Chunk",
    "chunk_document",
    "chunk_text",
    "count_tokens",
    # Embeddings
    "Embedder",
    "get_embedder",
    "embed_texts",
    "embed_query",
    # Vector store
    "VectorStore",
    "InMemoryVectorStore",
    "PgVectorStore",
    "StoredChunk",
    "SearchResult",
    "get_vector_store",
    # Retrieval
    "Retriever",
    "get_retriever",
]
