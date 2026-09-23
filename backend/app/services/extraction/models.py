"""Pydantic models for PDF extraction output.

Structured Document object as described in docs/2-architecture/ARCHITECTURE.md
Section 1: PDF Extractor — Output: pages, paragraphs, tables, metadata.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from pydantic import BaseModel, Field


class TextBlock(BaseModel):
    """Single text block with position metadata."""

    text: str = Field(description="Block text content")
    bbox: Tuple[float, float, float, float] = Field(description="(x0, y0, x1, y1) in PDF points")
    block_type: int = Field(default=0, description="Block type: 0=text, 1=image")


class ExtractedTable(BaseModel):
    """Structured table extracted from a PDF page."""

    page_number: int = Field(description="1-indexed page number")
    table_index: int = Field(description="0-indexed table order on page")
    headers: List[str] = Field(default_factory=list, description="Header row values (first row)")
    rows: List[List[str]] = Field(default_factory=list, description="Data rows (excl. header)")
    raw_data: List[List[Optional[str]]] = Field(
        default_factory=list, description="Raw 2D table including header row"
    )
    bbox: Optional[Tuple[float, float, float, float]] = Field(
        default=None, description="Bounding box if detected by pdfplumber"
    )
    extraction_method: str = Field(default="pdfplumber", description="Extractor used")

    @property
    def row_count(self) -> int:
        return len(self.rows)

    @property
    def column_count(self) -> int:
        return len(self.headers) if self.headers else (len(self.raw_data[0]) if self.raw_data else 0)


class PageContent(BaseModel):
    """Content extracted from a single PDF page."""

    page_number: int  # 1-indexed
    text: str = Field(description="Full page text (PyMuPDF)")
    width: float = Field(description="Page width in points")
    height: float = Field(description="Page height in points")
    blocks: List[TextBlock] = Field(default_factory=list)
    tables: List[ExtractedTable] = Field(default_factory=list)
    char_count: int = Field(default=0)
    has_text: bool = Field(default=True)


class PdfMetadata(BaseModel):
    """Document-level metadata extracted via PyMuPDF."""

    title: Optional[str] = None
    author: Optional[str] = None
    subject: Optional[str] = None
    creator: Optional[str] = None
    producer: Optional[str] = None
    creation_date: Optional[str] = None
    mod_date: Optional[str] = None
    page_count: int = 0
    file_size_bytes: Optional[int] = None
    is_encrypted: bool = False
    has_text: bool = True  # False if PDF is scanned/image-only with no extractable text


class ExtractedDocument(BaseModel):
    """Top-level container returned by the extraction pipeline."""

    filename: str = Field(default="", description="Original filename if provided")
    metadata: PdfMetadata
    pages: List[PageContent] = Field(default_factory=list)
    tables: List[ExtractedTable] = Field(
        default_factory=list, description="All tables flattened across pages"
    )
    full_text: str = Field(default="", description="Concatenated text across all pages")

    # Convenience helpers
    @property
    def page_count(self) -> int:
        return len(self.pages)

    def get_page(self, page_number: int) -> Optional[PageContent]:
        """Return page by 1-indexed number."""
        for p in self.pages:
            if p.page_number == page_number:
                return p
        return None

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dict (delegates to Pydantic)."""
        return self.model_dump()
