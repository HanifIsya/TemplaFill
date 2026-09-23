"""PDF table extraction using pdfplumber.

Responsibility: Structured table extraction per
docs/2-architecture/ARCHITECTURE.md Section 1.

pdfplumber is preferred over camelot because:
 - no Java/Ghostscript dependency
 - good layout analysis, bbox support
 - detects tables via lines or text alignment

See also: text_extractor.py for text/layout extraction.
"""

from __future__ import annotations

import io
from pathlib import Path
from typing import List, Optional, Union

import pdfplumber

from app.services.extraction.exceptions import PdfCorruptError, PdfPasswordProtectedError
from app.services.extraction.models import ExtractedTable

PdfSource = Union[str, Path, bytes, bytearray, io.BytesIO]


def _load_pdf_bytes(source: PdfSource) -> bytes:
    if isinstance(source, (bytes, bytearray)):
        return bytes(source)
    if isinstance(source, io.BytesIO):
        return source.getvalue()
    if isinstance(source, (str, Path)):
        path = Path(source)
        if not path.exists():
            raise PdfCorruptError(f"File not found: {path}")
        return path.read_bytes()
    raise PdfCorruptError(f"Unsupported PDF source type: {type(source).__name__}")


def _clean_cell(value: Optional[str]) -> str:
    """Normalize cell value: strip, collapse whitespace, handle None."""
    if value is None:
        return ""
    # Replace newlines with space, collapse multiple spaces
    cleaned = " ".join(str(value).split())
    return cleaned


def _table_to_extracted(
    raw_table: List[List[Optional[str]]],
    *,
    page_number: int,
    table_index: int,
    bbox: Optional[tuple[float, float, float, float]] = None,
) -> Optional[ExtractedTable]:
    """Convert pdfplumber raw table (list-of-lists) to ExtractedTable.

    Returns None if table is empty or trivial (e.g., single cell with no data).
    """
    if not raw_table or not any(any(c for c in row) for row in raw_table):
        return None

    # Clean all cells
    cleaned: List[List[Optional[str]]] = []
    for row in raw_table:
        # row may be None for malformed tables
        if row is None:
            continue
        cleaned_row = [_clean_cell(c) if c is not None else "" for c in row]
        # Keep row even if all empty? Filter out completely empty rows at end?
        cleaned.append(cleaned_row)

    if not cleaned:
        return None

    # Remove fully empty trailing/leading rows
    # Keep at least header
    # Filter: keep rows that have at least one non-empty cell
    non_empty_rows = [r for r in cleaned if any(cell.strip() for cell in r)]
    if not non_empty_rows:
        return None

    # Use first non-empty row as header
    headers = non_empty_rows[0]
    data_rows = non_empty_rows[1:] if len(non_empty_rows) > 1 else []

    # If table has only one row, treat as headers with no data rows
    return ExtractedTable(
        page_number=page_number,
        table_index=table_index,
        headers=headers,
        rows=data_rows,
        raw_data=non_empty_rows,
        bbox=bbox,
        extraction_method="pdfplumber",
    )


def extract_tables_from_pdf(
    source: PdfSource,
    *,
    table_settings: Optional[dict] = None,
) -> List[ExtractedTable]:
    """Extract all tables from a PDF using pdfplumber.

    Args:
        source: PDF bytes, file path, or BytesIO
        table_settings: Optional pdfplumber table extraction settings
            (see https://github.com/jsvine/pdfplumber#table-extraction-settings)
            If None, uses text-based fallback first, then line-based strategy.

    Returns:
        List of ExtractedTable, ordered by page then table index.
        Empty list if no tables found (not an error).

    Raises:
        PdfCorruptError: if file is invalid
        PdfPasswordProtectedError: if PDF is encrypted
    """
    pdf_bytes = _load_pdf_bytes(source)
    if not pdf_bytes:
        raise PdfCorruptError("Empty file (0 bytes)")

    # Basic header check
    stripped = pdf_bytes.lstrip(b"\x00 \n\r\t\xef\xbb\xbf")
    if not stripped.startswith(b"%PDF"):
        raise PdfCorruptError("File does not appear to be a PDF (missing %PDF header)")

    tables: List[ExtractedTable] = []

    try:
        # pdfplumber expects a file-like object
        pdf_file = io.BytesIO(pdf_bytes)
        with pdfplumber.open(pdf_file) as pdf:
            for page_idx, page in enumerate(pdf.pages):
                page_number = page_idx + 1
                # Strategy:
                # 1) Use find_tables with text/line strategies for bbox
                # 2) Fallback to extract_tables() for raw data
                try:
                    # find_tables returns Table objects with bbox
                    found_tables = page.find_tables(table_settings=table_settings or {})
                except Exception:  # noqa: BLE001
                    found_tables = []

                if found_tables:
                    for t_idx, tbl in enumerate(found_tables):
                        try:
                            raw = tbl.extract()
                            bbox = tuple(tbl.bbox) if hasattr(tbl, "bbox") and tbl.bbox else None  # type: ignore[assignment]
                            extracted = _table_to_extracted(
                                raw, page_number=page_number, table_index=t_idx, bbox=bbox  # type: ignore[arg-type]
                            )
                            if extracted:
                                tables.append(extracted)
                        except Exception:  # noqa: BLE001
                            continue
                    # If find_tables succeeded, don't also run extract_tables to avoid duplicates
                    continue

                # Fallback: extract_tables (no bbox)
                try:
                    raw_tables = page.extract_tables(table_settings=table_settings or {})
                except Exception:  # noqa: BLE001
                    raw_tables = None

                if raw_tables:
                    for t_idx, raw in enumerate(raw_tables):
                        extracted = _table_to_extracted(
                            raw, page_number=page_number, table_index=t_idx, bbox=None
                        )
                        if extracted:
                            tables.append(extracted)

    except PdfCorruptError:
        raise
    except PdfPasswordProtectedError:
        raise
    except Exception as exc:  # noqa: BLE001
        msg = str(exc).lower()
        if "password" in msg or "encrypted" in msg:
            raise PdfPasswordProtectedError() from exc
        raise PdfCorruptError(f"Failed to extract tables: {exc}") from exc

    return tables


def extract_tables_with_fallback(
    source: PdfSource,
    *,
    try_lattice: bool = True,
    try_text: bool = True,
) -> List[ExtractedTable]:
    """Try multiple pdfplumber strategies to maximize table recall.

    Lattice (lines) strategy works for bordered tables.
    Text strategy works for whitespace-aligned tables.

    Returns the best non-empty result, or empty list if none found.
    """
    # Use pdfplumber's built-in strategies via table_settings
    strategies = []
    if try_lattice:
        strategies.append({"vertical_strategy": "lines", "horizontal_strategy": "lines"})
    if try_text:
        strategies.append({"vertical_strategy": "text", "horizontal_strategy": "text"})
    # Default (lines + text mixed) is also tried implicitly
    strategies.append({})

    for settings in strategies:
        try:
            tables = extract_tables_from_pdf(source, table_settings=settings)
            if tables:
                return tables
        except PdfCorruptError:
            raise
        except Exception:  # noqa: BLE001
            continue
    return []


__all__ = ["extract_tables_from_pdf", "extract_tables_with_fallback"]
