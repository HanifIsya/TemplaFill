"""PDF text extraction using PyMuPDF (fitz).

Responsibility: Fast text extraction with position data,
per docs/2-architecture/ARCHITECTURE.md Section 1.

 - Extracts per-page text, block-level bbox, dimensions
 - Extracts document metadata
 - Handles encrypted / corrupt / empty PDFs with explicit exceptions

See also: table_extractor.py for structured table extraction.
"""

from __future__ import annotations

import io
from pathlib import Path
from typing import Union

import fitz  # PyMuPDF

from app.services.extraction.exceptions import (
    PdfCorruptError,
    PdfEmptyError,
    PdfPasswordProtectedError,
    PdfTooLargeError,
)
from app.services.extraction.models import ExtractedDocument, PageContent, PdfMetadata, TextBlock

# Allow bytes, bytes-like, path, or file-like
PdfSource = Union[str, Path, bytes, bytearray, io.BytesIO]


def _load_pdf_bytes(source: PdfSource) -> tuple[bytes, str]:
    """Normalize source to raw bytes and filename hint."""
    if isinstance(source, (bytes, bytearray)):
        return bytes(source), ""
    if isinstance(source, io.BytesIO):
        return source.getvalue(), ""
    if isinstance(source, (str, Path)):
        path = Path(source)
        if not path.exists():
            raise PdfCorruptError(f"File not found: {path}")
        return path.read_bytes(), path.name
    raise PdfCorruptError(f"Unsupported PDF source type: {type(source).__name__}")


def _parse_metadata(doc: fitz.Document, file_size_bytes: int | None) -> PdfMetadata:
    """Extract PdfMetadata from a PyMuPDF Document."""
    meta = doc.metadata or {}
    # doc.is_encrypted already checked; needs_auth indicates password required
    return PdfMetadata(
        title=meta.get("title") or None,
        author=meta.get("author") or None,
        subject=meta.get("subject") or None,
        creator=meta.get("creator") or None,
        producer=meta.get("producer") or None,
        creation_date=meta.get("creationDate") or None,
        mod_date=meta.get("modDate") or None,
        page_count=doc.page_count,
        file_size_bytes=file_size_bytes,
        is_encrypted=bool(doc.is_encrypted),
    )


def extract_text_from_pdf(
    source: PdfSource,
    *,
    filename: str = "",
    max_pages: int | None = None,
    include_blocks: bool = True,
) -> ExtractedDocument:
    """Extract text and metadata from a PDF using PyMuPDF.

    Args:
        source: PDF bytes, file path, or BytesIO
        filename: Optional filename hint (used when source is raw bytes)
        max_pages: Optional hard limit; raises PdfTooLargeError if exceeded
        include_blocks: Whether to populate per-block bbox data

    Returns:
        ExtractedDocument with pages, metadata, full_text

    Raises:
        PdfPasswordProtectedError: if PDF requires a password
        PdfCorruptError: if file is invalid / not a PDF
        PdfTooLargeError: if page count exceeds max_pages
        PdfEmptyError: if no text could be extracted (optional, caller can check has_text)
    """
    pdf_bytes, inferred_name = _load_pdf_bytes(source)
    effective_filename = filename or inferred_name
    file_size_bytes = len(pdf_bytes)

    if not pdf_bytes:
        raise PdfCorruptError("Empty file (0 bytes)")

    # Basic PDF magic check
    if not pdf_bytes[:5].startswith(b"%PDF"):
        # Some PDFs start with BOM or whitespace; be lenient but warn
        stripped = pdf_bytes.lstrip(b"\x00 \n\r\t\xef\xbb\xbf")
        if not stripped.startswith(b"%PDF"):
            raise PdfCorruptError("File does not appear to be a PDF (missing %PDF header)")

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except RuntimeError as exc:
        msg = str(exc).lower()
        if "password" in msg or "encrypted" in msg or "auth" in msg:
            raise PdfPasswordProtectedError() from exc
        raise PdfCorruptError(f"Failed to open PDF: {exc}") from exc
    except Exception as exc:  # noqa: BLE001
        # PyMuPDF may raise various exceptions for corrupt files
        raise PdfCorruptError(f"Failed to open PDF: {exc}") from exc

    try:
        # Encrypted check (PyMuPDF sets needs_pass)
        if doc.needs_pass or doc.is_encrypted:
            # Try empty password; if still needs auth then it's protected
            if doc.needs_pass:
                raise PdfPasswordProtectedError()

        if max_pages is not None and doc.page_count > max_pages:
            raise PdfTooLargeError(
                f"PDF has {doc.page_count} pages, exceeds limit of {max_pages}"
            )

        metadata = _parse_metadata(doc, file_size_bytes=file_size_bytes)
        pages: list[PageContent] = []
        full_text_parts: list[str] = []
        has_any_text = False

        for idx in range(doc.page_count):
            page = doc[idx]
            rect = page.rect
            width = float(rect.width)
            height = float(rect.height)

            # Full text
            page_text: str = page.get_text("text") or ""
            # Blocks: list of (x0, y0, x1, y1, text, block_no, block_type)
            blocks: list[TextBlock] = []
            if include_blocks:
                try:
                    raw_blocks = page.get_text("blocks")  # type: ignore[assignment]
                    for b in raw_blocks:
                        # b: (x0, y0, x1, y1, text, block_no, block_type)
                        if len(b) >= 7:
                            x0, y0, x1, y1, text, _, btype = b[0], b[1], b[2], b[3], b[4], b[5], b[6]
                            if text and text.strip():
                                blocks.append(
                                    TextBlock(
                                        text=text.strip(),
                                        bbox=(float(x0), float(y0), float(x1), float(y1)),
                                        block_type=int(btype),
                                    )
                                )
                except Exception:  # noqa: BLE001
                    # Block extraction is best-effort; ignore failures
                    blocks = []

            stripped = page_text.strip()
            if stripped:
                has_any_text = True
                full_text_parts.append(stripped)
            else:
                full_text_parts.append("")

            page_content = PageContent(
                page_number=idx + 1,
                text=page_text,
                width=width,
                height=height,
                blocks=blocks,
                tables=[],  # Populated by table_extractor or combined extractor
                char_count=len(page_text),
                has_text=bool(stripped),
            )
            pages.append(page_content)

        full_text = "\n\n".join(p for p in full_text_parts if p)

        metadata.has_text = has_any_text

        document = ExtractedDocument(
            filename=effective_filename,
            metadata=metadata,
            pages=pages,
            tables=[],  # filled by table extractor if used
            full_text=full_text,
        )
        return document

    finally:
        doc.close()


def extract_text_simple(pdf_bytes: bytes, *, filename: str = "") -> str:
    """Convenience: return concatenated text only (for quick usage)."""
    doc = extract_text_from_pdf(pdf_bytes, filename=filename, include_blocks=False)
    return doc.full_text


__all__ = ["extract_text_from_pdf", "extract_text_simple"]
