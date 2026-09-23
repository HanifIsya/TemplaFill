"""Combined PDF extraction orchestrator.

Merges text extraction (PyMuPDF) + table extraction (pdfplumber)
into a single ExtractedDocument as described in ARCHITECTURE.md.

Usage:
    from app.services.extraction.pdf_extractor import extract_pdf

    doc = extract_pdf(pdf_bytes, filename="contract.pdf")
    print(doc.full_text)
    print(doc.tables)
    print(doc.pages[0].text)
"""

from __future__ import annotations

import io
from pathlib import Path
from typing import Optional, Union

from app.services.extraction.exceptions import PdfCorruptError
from app.services.extraction.models import ExtractedDocument
from app.services.extraction.table_extractor import extract_tables_from_pdf
from app.services.extraction.text_extractor import extract_text_from_pdf

PdfSource = Union[str, Path, bytes, bytearray, io.BytesIO]


def extract_pdf(
    source: PdfSource,
    *,
    filename: str = "",
    max_pages: Optional[int] = None,
    include_tables: bool = True,
    include_blocks: bool = True,
    table_settings: Optional[dict] = None,
) -> ExtractedDocument:
    """End-to-end PDF extraction: text + tables + metadata.

    This is the primary entry point for the extraction pipeline
    (Task 1.1 + 1.2). It delegates text to PyMuPDF and tables to
    pdfplumber, then merges results into one ExtractedDocument.

    Args:
        source: PDF bytes, file path, or BytesIO
        filename: Filename hint when source is raw bytes
        max_pages: Optional max page count guard (uses config default if set)
        include_tables: Whether to run pdfplumber table extraction
        include_blocks: Whether to include block-level bbox in text extraction
        table_settings: Optional pdfplumber table extraction settings

    Returns:
        ExtractedDocument with pages enriched with tables, plus flattened tables.

    Raises:
        Pdf* exceptions on failure
    """
    # Check config guard if not explicitly passed
    if max_pages is None:
        try:
            from app.core.config import get_settings

            max_pages = get_settings().max_source_pages
        except Exception:  # noqa: BLE001
            max_pages = 500  # fallback default per API.md

    # Step 1: Text extraction (also validates PDF, checks password, page count)
    document = extract_text_from_pdf(
        source,
        filename=filename,
        max_pages=max_pages,
        include_blocks=include_blocks,
    )

    if not include_tables:
        return document

    # Step 2: Table extraction (best-effort; empty list on failure is OK)
    # We need raw bytes for pdfplumber; handle both path and bytes input
    try:
        # Normalize to bytes for table extractor
        if isinstance(source, (bytes, bytearray)):
            pdf_bytes = bytes(source)
        elif isinstance(source, io.BytesIO):
            pdf_bytes = source.getvalue()
        elif isinstance(source, (str, Path)):
            pdf_bytes = Path(source).read_bytes()
        else:
            pdf_bytes = b""

        if not pdf_bytes:
            # If source was bytes-like but we couldn't get bytes, fallback to document's filename path?
            # For BytesIO/path cases we already handled. For raw bytes we have it.
            # If source was path string that failed, text extraction already raised.
            pass

        # Use bytes directly for pdfplumber
        # If original source was path, pdf_bytes contains file content, reuse
        # Determine effective source for table extractor: prefer bytes
        table_source: PdfSource = pdf_bytes if pdf_bytes else source
        tables = extract_tables_from_pdf(table_source, table_settings=table_settings)

    except PdfCorruptError:
        # If table extraction fails due to corrupt PDF, text extraction already succeeded,
        # so we should not fail entire pipeline — just return text-only document
        # But if the PDF was truly corrupt, text extraction would have already raised.
        # Here we treat table extraction as non-critical.
        tables = []
    except Exception:  # noqa: BLE001
        tables = []

    # Step 3: Merge tables into per-page and flattened lists
    # Group tables by page_number
    from collections import defaultdict

    tables_by_page: dict[int, list] = defaultdict(list)
    for tbl in tables:
        tables_by_page[tbl.page_number].append(tbl)

    for page in document.pages:
        page.tables = tables_by_page.get(page.page_number, [])

    document.tables = tables

    return document


# Backwards-compat aliases
extract_pdf_content = extract_pdf
extract_document = extract_pdf

__all__ = ["extract_pdf", "extract_pdf_content", "extract_document"]
