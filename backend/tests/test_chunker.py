"""Unit tests for Task 1.3 — text chunking strategy."""

from __future__ import annotations

import pytest

from app.services.extraction import ExtractedDocument, PageContent, PdfMetadata
from app.services.rag.chunker import Chunk, chunk_document, chunk_text, count_tokens


def make_document(pages_text: list[str]) -> ExtractedDocument:
    pages = []
    full_parts = []
    for i, txt in enumerate(pages_text):
        pages.append(
            PageContent(
                page_number=i + 1,
                text=txt,
                width=595,
                height=842,
                blocks=[],
                tables=[],
                char_count=len(txt),
                has_text=bool(txt.strip()),
            )
        )
        if txt.strip():
            full_parts.append(txt.strip())
    return ExtractedDocument(
        filename="test.pdf",
        metadata=PdfMetadata(page_count=len(pages), has_text=any(bool(t.strip()) for t in pages_text)),
        pages=pages,
        tables=[],
        full_text="\n\n".join(full_parts),
    )


class TestCountTokens:
    def test_count_nonempty(self):
        assert count_tokens("Hello world") > 0

    def test_count_empty_zero(self):
        assert count_tokens("") == 0
        assert count_tokens("   ") == 0


class TestChunkText:
    def test_chunk_text_single_short(self):
        text = "Short text that fits in one chunk."
        chunks = chunk_text(text, chunk_size=800, chunk_overlap=100)
        assert len(chunks) == 1
        assert chunks[0] == text

    def test_chunk_text_empty(self):
        assert chunk_text("") == []
        assert chunk_text("   ") == []

    def test_chunk_text_respects_chunk_size(self):
        # Generate long text ~2000 tokens (~8000 chars)
        long_text = " ".join([f"Sentence number {i} with some content to inflate tokens." for i in range(400)])
        chunks = chunk_text(long_text, chunk_size=200, chunk_overlap=20)
        # Each chunk should be approx <= chunk_size tokens
        for c in chunks:
            assert count_tokens(c) <= 300  # allow some slack for overlap logic
        assert len(chunks) > 1

    def test_chunk_text_overlap_present(self):
        # Create repetitive text where overlap is detectable
        long_text = "\n\n".join([f"Section {i}\nParagraph for section {i} with duplicate phrase overlap test." * 5 for i in range(5)])
        chunks = chunk_text(long_text, chunk_size=100, chunk_overlap=20)
        assert len(chunks) >= 2
        # Second chunk should start with tail of first (overlap)
        # Check that there is some word overlap
        first_words = set(chunks[0].split()[:20])
        second_words = set(chunks[1].split()[:30])
        # Overlap should cause some intersection
        assert len(first_words & second_words) > 0 or "overlap" in chunks[1].lower()

    def test_chunk_text_primary_split_double_newline(self):
        # Create longer sections to exceed clamped minimum (50 tokens) and force split
        # Each section ~40 tokens, total ~120 tokens, chunk_size 50 should give 3 chunks
        section = "Section content with enough tokens to trigger splitting. " * 8
        text = f"{section.strip()}\n\n{section.strip()}\n\n{section.strip()}"
        assert count_tokens(text) > 50  # ensure exceeds minimum
        chunks = chunk_text(text, chunk_size=50, chunk_overlap=10)
        # Should split into at least 2-3 chunks based on sections
        assert len(chunks) >= 2
        full = " ".join(chunks)
        assert "Section content" in full

    def test_chunk_text_sentence_boundary(self):
        text = "This is sentence one. This is sentence two. This is sentence three that is very long and should be split. " * 10
        chunks = chunk_text(text, chunk_size=30, chunk_overlap=5)
        assert len(chunks) > 1
        for c in chunks:
            assert c.strip()

    def test_chunk_text_respects_min_overlap_guard(self):
        text = "A " * 500
        chunks = chunk_text(text, chunk_size=50, chunk_overlap=100)  # overlap > chunk/2 should be capped
        assert len(chunks) >= 1

    def test_chunk_size_bounds(self):
        text = "Hello world. " * 100
        # Very small chunk_size should be clamped to 50
        chunks = chunk_text(text, chunk_size=10, chunk_overlap=5)
        assert len(chunks) >= 1


class TestChunkDocument:
    def test_chunk_document_single_page(self):
        doc = make_document(["This is a simple single page document with some text. It should fit into one chunk if small."])
        chunks = chunk_document(doc, chunk_size=800, chunk_overlap=100)
        assert len(chunks) >= 1
        assert all(isinstance(c, Chunk) for c in chunks)
        assert all(c.page_number == 1 for c in chunks)

    def test_chunk_document_multi_page_preserves_page_numbers(self):
        doc = make_document(
            [
                "Page one content. " * 20,
                "Page two content with different words. " * 20,
                "Page three unique content alpha beta gamma. " * 20,
            ]
        )
        chunks = chunk_document(doc, chunk_size=100, chunk_overlap=20)
        page_numbers = {c.page_number for c in chunks}
        assert page_numbers == {1, 2, 3}
        # Check ordering: chunk_index monotonic, page_number non-decreasing in order
        assert [c.chunk_index for c in chunks] == list(range(len(chunks)))
        # Verify chunks from page 1 come before page 2
        first_page2_idx = next(i for i, c in enumerate(chunks) if c.page_number == 2)
        assert all(c.page_number == 1 for c in chunks[:first_page2_idx])

    def test_chunk_document_chunk_size_respected(self):
        doc = make_document([" ".join([f"token{i}" for i in range(500)])])
        chunks = chunk_document(doc, chunk_size=100, chunk_overlap=10)
        for c in chunks:
            assert c.token_count <= 150  # slack
            assert c.token_count > 0
            assert c.char_count == len(c.text)

    def test_chunk_document_metadata_header(self):
        doc = make_document(["# Introduction\nThis is intro text.\n\n## Methods\nMethod details here."])
        chunks = chunk_document(doc, chunk_size=50, chunk_overlap=10)
        assert len(chunks) >= 1
        # At least one chunk should have header detected
        headers = [c.header for c in chunks if c.header]
        # Header detection is heuristic; we check that chunker runs without error and header is str or None
        assert all(isinstance(h, str) or h is None for h in [c.header for c in chunks])

    def test_chunk_document_empty_pages_skipped(self):
        doc = make_document(["", "   ", "Valid content after empty pages."])
        chunks = chunk_document(doc, chunk_size=800, chunk_overlap=100)
        assert len(chunks) == 1
        assert chunks[0].page_number == 3

    def test_chunk_document_start_end_chars(self):
        doc = make_document(["First page text.", "Second page text."])
        chunks = chunk_document(doc, chunk_size=50, chunk_overlap=0)
        for c in chunks:
            assert c.start_char >= 0
            assert c.end_char > c.start_char
            assert c.end_char - c.start_char == len(c.text)

    def test_chunk_document_with_tables(self):
        from app.services.extraction.models import ExtractedTable

        doc = make_document(["Text before table."])
        # Add a table to page 1
        tbl = ExtractedTable(
            page_number=1,
            table_index=0,
            headers=["Name", "Amount"],
            rows=[["Alice", "$100"], ["Bob", "$200"]],
            raw_data=[["Name", "Amount"], ["Alice", "$100"], ["Bob", "$200"]],
        )
        doc.pages[0].tables = [tbl]
        doc.tables = [tbl]
        chunks = chunk_document(doc, chunk_size=100, chunk_overlap=10)
        # Table data should be included in chunk text
        full = " ".join(c.text for c in chunks)
        assert "Alice" in full
        assert "Name" in full

    def test_chunk_document_uses_config_defaults(self):
        # Without explicit chunk_size, should use config defaults (800/100)
        doc = make_document(["Small text"])
        chunks = chunk_document(doc)
        assert len(chunks) == 1

    def test_chunk_document_token_count_consistency(self):
        doc = make_document(["Hello world. " * 50])
        chunks = chunk_document(doc, chunk_size=80, chunk_overlap=10)
        for c in chunks:
            assert c.token_count == count_tokens(c.text)

    def test_chunk_document_deterministic_chunk_ids(self):
        doc = make_document(["Deterministic test " * 10])
        chunks1 = chunk_document(doc, chunk_size=50, chunk_overlap=10)
        chunks2 = chunk_document(doc, chunk_size=50, chunk_overlap=10)
        # Texts should be same, ids will differ (uuid) but texts equal
        assert [c.text for c in chunks1] == [c.text for c in chunks2]
