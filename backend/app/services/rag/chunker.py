"""Text chunking service — Task 1.3.

Implements recursive semantic chunking per ARCHITECTURE.md §2:
 - Primary split: section headers / double newline (\n\n)
 - Secondary: paragraphs / single newline (\n)
 - Tertiary: sentence boundaries (.!? + space)
 - Chunk size: 500-1000 tokens (configurable, default 800) with 100-token overlap
 - Each chunk retains: source page number, position, preceding header

Tokens are approximated as ~4 chars per token if tiktoken not available;
falls back to exact counting via tiktoken if installed.

Usage:
    from app.services.rag.chunker import chunk_document, chunk_text
    from app.services.extraction import extract_pdf

    doc = extract_pdf(pdf_bytes)
    chunks = chunk_document(doc)  # List[Chunk]
"""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, field
from typing import List, Optional

from pydantic import BaseModel, Field

try:
    import tiktoken  # type: ignore

    _HAS_TIKTOKEN = True
except Exception:  # noqa: BLE001
    _HAS_TIKTOKEN = False

# Import ExtractedDocument lazily to avoid circular deps at import time
# We'll use TYPE_CHECKING or string annotation

# ---------------------------------------------------------------------------
# Chunk model
# ---------------------------------------------------------------------------


class Chunk(BaseModel):
    """A semantic chunk with metadata for RAG retrieval."""

    chunk_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    page_number: int = Field(description="Source page (1-indexed)")
    chunk_index: int = Field(description="0-indexed order in document")
    start_char: int = Field(description="Global char offset in concatenated doc")
    end_char: int
    token_count: int
    header: Optional[str] = Field(default=None, description="Preceding section header if detected")
    # Additional metadata for debugging / eval
    char_count: int = 0
    overlap_with_previous: int = Field(default=0, description="Token overlap with previous chunk")

    model_config = {"frozen": False}

    def to_dict(self) -> dict:
        return self.model_dump()


# ---------------------------------------------------------------------------
# Token counting
# ---------------------------------------------------------------------------

_ENCODER = None
if _HAS_TIKTOKEN:
    try:
        _ENCODER = tiktoken.get_encoding("cl100k_base")
    except Exception:  # noqa: BLE001
        _ENCODER = None
        _HAS_TIKTOKEN = False


def count_tokens(text: str) -> int:
    """Count tokens in text."""
    if not text or not text.strip():
        return 0
    if _HAS_TIKTOKEN and _ENCODER is not None:
        return len(_ENCODER.encode(text))
    # Fallback heuristic: ~4 chars per token, plus word-based correction
    char_est = len(text) / 4.0
    word_est = len(text.split()) * 1.3
    # Weighted average favours char for CJK, word for spaced languages
    return max(1, int((char_est + word_est) / 2))


def _tokens_to_chars(tokens: int) -> int:
    """Inverse estimate: tokens -> chars for slicing heuristics."""
    return int(tokens * 4)


# ---------------------------------------------------------------------------
# Recursive splitter
# ---------------------------------------------------------------------------

# Regex patterns
_RE_DOUBLE_NEWLINE = re.compile(r"\n\s*\n")
_RE_SINGLE_NEWLINE = re.compile(r"\n")
_RE_SENTENCE = re.compile(r"(?<=[.!?])\s+")
_RE_HEADER = re.compile(
    r"^(#{1,6}\s+.+|[A-Z][A-Z0-9 _-]{3,80}$|.+:\s*$)",
    re.MULTILINE,
)

# Heuristics for header-like lines: short, Title Case or UPPER, or ends with :
def _is_header_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped or len(stripped) > 80:
        return False
    # Markdown header
    if stripped.startswith("#"):
        return True
    # Ends with colon
    if stripped.endswith(":"):
        return True
    # All upper case (with allowance for numbers/spaces)
    if stripped.isupper() and len(stripped.split()) <= 8:
        return True
    # Title Case short line with 1-6 words and no period
    words = stripped.split()
    if 1 <= len(words) <= 6 and "." not in stripped and stripped.istitle():
        # Check that next char after title check? Simplify
        return True
    return False


def _detect_header(text: str) -> Optional[str]:
    """Return most recent header-like line in text, or None."""
    lines = text.strip().split("\n")
    for line in reversed(lines):
        if _is_header_line(line):
            return line.strip().lstrip("#").strip()
    # Also try regex find
    matches = list(_RE_HEADER.finditer(text))
    if matches:
        return matches[-1].group(0).strip().lstrip("#").strip()
    return None


def _split_recursive(text: str, chunk_size: int, chunk_overlap: int) -> List[str]:
    """Recursively split text into raw pieces <= chunk_size tokens.

    Hierarchy:
      1. double newline (\n\n) → sections
      2. single newline (\n) → paragraphs
      3. sentence boundaries → sentences
      4. character window (fallback)
    """
    if not text or not text.strip():
        return []

    if count_tokens(text) <= chunk_size:
        return [text.strip()]

    # Level 1: split by double newline
    sections = _RE_DOUBLE_NEWLINE.split(text)
    if len(sections) > 1:
        result: List[str] = []
        for sec in sections:
            sec = sec.strip()
            if not sec:
                continue
            if count_tokens(sec) <= chunk_size:
                result.append(sec)
            else:
                # Recurse to next level
                result.extend(_split_by_single_newline(sec, chunk_size, chunk_overlap))
        if result:
            return result

    # Level 2 was already tried inside; if still single section or still too large, try paragraph
    return _split_by_single_newline(text, chunk_size, chunk_overlap)


def _split_by_single_newline(text: str, chunk_size: int, chunk_overlap: int) -> List[str]:
    if count_tokens(text) <= chunk_size:
        return [text.strip()]
    paras = _RE_SINGLE_NEWLINE.split(text)
    if len(paras) > 1:
        result: List[str] = []
        for para in paras:
            para = para.strip()
            if not para:
                continue
            if count_tokens(para) <= chunk_size:
                result.append(para)
            else:
                result.extend(_split_by_sentence(para, chunk_size, chunk_overlap))
        if result:
            return result
    return _split_by_sentence(text, chunk_size, chunk_overlap)


def _split_by_sentence(text: str, chunk_size: int, chunk_overlap: int) -> List[str]:
    if count_tokens(text) <= chunk_size:
        return [text.strip()]
    sentences = _RE_SENTENCE.split(text)
    if len(sentences) > 1:
        # Greedily pack sentences into chunks <= chunk_size
        chunks: List[str] = []
        current = ""
        current_tokens = 0
        for sent in sentences:
            sent = sent.strip()
            if not sent:
                continue
            sent_tokens = count_tokens(sent)
            if sent_tokens > chunk_size:
                # Sentence itself too long → character fallback
                if current:
                    chunks.append(current.strip())
                    current = ""
                    current_tokens = 0
                chunks.extend(_split_by_chars(sent, chunk_size, chunk_overlap))
                continue
            if current_tokens + sent_tokens <= chunk_size:
                current = f"{current} {sent}".strip() if current else sent
                current_tokens += sent_tokens
                # Add 1 for space approx? ignore
            else:
                if current:
                    chunks.append(current.strip())
                current = sent
                current_tokens = sent_tokens
        if current:
            chunks.append(current.strip())
        if chunks:
            return chunks
    # Fallback: char window
    return _split_by_chars(text, chunk_size, chunk_overlap)


def _split_by_chars(text: str, chunk_size: int, chunk_overlap: int) -> List[str]:
    """Fallback: sliding window over characters (token-based)."""
    if count_tokens(text) <= chunk_size:
        return [text.strip()]
    # Estimate chars per chunk
    chars_per_chunk = max(100, _tokens_to_chars(chunk_size))
    overlap_chars = max(20, _tokens_to_chars(chunk_overlap))
    step = max(1, chars_per_chunk - overlap_chars)
    result: List[str] = []
    start = 0
    while start < len(text):
        end = min(len(text), start + chars_per_chunk)
        piece = text[start:end].strip()
        if piece:
            result.append(piece)
        if end >= len(text):
            break
        start += step
        # Avoid infinite loop when step is 0
        if step <= 0:
            break
    return result


def _apply_overlap(chunks: List[str], chunk_size: int, chunk_overlap: int) -> List[str]:
    """Post-process: ensure overlap between consecutive chunks.

    Our recursive splitter already produces non-overlapping pieces.
    We now add overlap by prepending suffix of previous chunk (token-based).
    If tiktoken available, we use token slicing; else char slicing.
    """
    if chunk_overlap <= 0 or len(chunks) <= 1:
        return chunks

    overlapped: List[str] = [chunks[0]]
    for i in range(1, len(chunks)):
        prev = overlapped[-1]
        curr = chunks[i]
        # Get overlap suffix from prev (chunk_overlap tokens)
        overlap_text = _tail_tokens(prev, chunk_overlap)
        # Only prepend if not already prefix of curr (avoid duplication)
        if overlap_text and overlap_text not in curr[: len(overlap_text) + 50]:
            # Prepend with space
            new_curr = f"{overlap_text} {curr}".strip()
            # If new_curr exceeds chunk_size, truncate overlap slightly
            # Keep at least 1 sentence of curr intact
            if count_tokens(new_curr) > chunk_size + chunk_overlap:
                # Trim overlap to fit
                # Keep curr intact, shrink overlap
                # Estimate max overlap tokens that fit
                curr_tokens = count_tokens(curr)
                allowed_overlap = max(0, chunk_size - curr_tokens + chunk_overlap // 2)
                if allowed_overlap > 10:
                    overlap_text = _tail_tokens(prev, allowed_overlap)
                    new_curr = f"{overlap_text} {curr}".strip()
                else:
                    new_curr = curr
            overlapped.append(new_curr)
        else:
            overlapped.append(curr)
    return overlapped


def _tail_tokens(text: str, n_tokens: int) -> str:
    """Return last n_tokens of text."""
    if n_tokens <= 0 or not text:
        return ""
    if _HAS_TIKTOKEN and _ENCODER is not None:
        tokens = _ENCODER.encode(text)
        if len(tokens) <= n_tokens:
            return text
        tail = tokens[-n_tokens:]
        return _ENCODER.decode(tail).strip()
    # Char heuristic
    approx_chars = _tokens_to_chars(n_tokens)
    if len(text) <= approx_chars:
        return text
    return text[-approx_chars:].strip()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def chunk_text(
    text: str,
    *,
    chunk_size: int = 800,
    chunk_overlap: int = 100,
    header: Optional[str] = None,
) -> List[str]:
    """Chunk a single text string into overlapping pieces.

    Args:
        text: Raw text to chunk
        chunk_size: Max tokens per chunk (500-1000 per spec)
        chunk_overlap: Tokens to overlap between chunks
        header: Optional pre-detected header for metadata (not used for splitting)

    Returns:
        List of chunk texts (strings), each <= chunk_size tokens (approx),
        consecutive chunks overlap by ~chunk_overlap tokens.
    """
    if not text or not text.strip():
        return []
    chunk_size = max(50, chunk_size)
    chunk_overlap = max(0, min(chunk_overlap, chunk_size // 2))

    raw = _split_recursive(text.strip(), chunk_size, chunk_overlap)
    overlapped = _apply_overlap(raw, chunk_size, chunk_overlap)
    return [c for c in overlapped if c.strip()]


def chunk_document(
    document,  # ExtractedDocument (duck-typed to avoid import cycle)
    *,
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> List[Chunk]:
    """Chunk an ExtractedDocument into RAG-ready pieces.

    Each page is chunked separately but chunks retain global ordering and
    page number metadata. Tables are included as markdown rows appended to
    page text before chunking (so tabular data is retrievable).

    Args:
        document: ExtractedDocument from pdf_extractor
        chunk_size: Tokens per chunk (defaults to config CHUNK_SIZE)
        chunk_overlap: Overlap tokens (defaults to config CHUNK_OVERLAP)

    Returns:
        List[Chunk] with metadata (page_number, header, token_count, etc.)
    """
    # Resolve defaults from config
    if chunk_size is None or chunk_overlap is None:
        try:
            from app.core.config import get_settings

            settings = get_settings()
            if chunk_size is None:
                chunk_size = settings.chunk_size
            if chunk_overlap is None:
                chunk_overlap = settings.chunk_overlap
        except Exception:  # noqa: BLE001
            chunk_size = chunk_size or 800
            chunk_overlap = chunk_overlap or 100

    chunk_size = max(50, int(chunk_size))
    chunk_overlap = max(0, min(int(chunk_overlap), chunk_size // 2))

    chunks: List[Chunk] = []
    global_char_offset = 0
    chunk_index = 0

    for page in document.pages:
        page_text = page.text or ""
        # Append tables as text for retrieval (markdown-ish)
        if page.tables:
            table_texts: List[str] = []
            for tbl in page.tables:
                # Convert table to lines: header | row
                header_line = " | ".join(tbl.headers) if tbl.headers else ""
                row_lines = [" | ".join(row) for row in tbl.rows]
                tbl_block = "\n".join([header_line] + row_lines) if header_line else "\n".join(row_lines)
                if tbl_block.strip():
                    table_texts.append(f"[Table {tbl.table_index + 1}]\n{tbl_block}")
            if table_texts:
                page_text = f"{page_text.strip()}\n\n" + "\n\n".join(table_texts)

        if not page_text.strip():
            continue

        # Detect header for this page (last header before page text)
        page_header = _detect_header(page_text)

        texts = chunk_text(page_text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)

        for i, txt in enumerate(texts):
            token_count = count_tokens(txt)
            # Determine overlap with previous chunk (if same page continuity)
            overlap = 0
            if chunks and i > 0:
                # Estimate overlap tokens between this and previous chunk from same page
                # Simple: count common prefix tokens up to chunk_overlap
                prev_text = chunks[-1].text
                # tail of prev vs head of curr
                overlap_suffix = _tail_tokens(prev_text, chunk_overlap)
                if overlap_suffix and curr_starts_with(txt, overlap_suffix):
                    overlap = min(chunk_overlap, count_tokens(overlap_suffix))
                else:
                    overlap = 0
            elif chunks and i == 0:
                # First chunk of new page: no overlap across pages (clean boundary)
                overlap = 0

            chunk = Chunk(
                chunk_id=str(uuid.uuid4()),
                text=txt,
                page_number=page.page_number,
                chunk_index=chunk_index,
                start_char=global_char_offset,
                end_char=global_char_offset + len(txt),
                token_count=token_count,
                header=page_header,
                char_count=len(txt),
                overlap_with_previous=overlap,
            )
            chunks.append(chunk)
            global_char_offset += len(txt) + 2  # +2 for separator \n\n approx
            chunk_index += 1

    # Second pass: if document is tiny and we produced 1 chunk but text was huge table-heavy, fine.
    return chunks


def curr_starts_with(text: str, prefix: str) -> bool:
    """Check if text starts with prefix (allowing whitespace differences)."""
    if not prefix:
        return False
    # Normalize whitespace for comparison
    norm_text = " ".join(text.split())
    norm_prefix = " ".join(prefix.split())
    return norm_text.startswith(norm_prefix[:50])  # check first 50 chars to avoid full compare


# Re-export for convenience
__all__ = ["Chunk", "chunk_document", "chunk_text", "count_tokens"]
