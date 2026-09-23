"""PDF extraction services — text & table extraction (Task 1.1 & 1.2)."""

from app.services.extraction.exceptions import (
    PdfCorruptError,
    PdfEmptyError,
    PdfExtractionError,
    PdfPasswordProtectedError,
    PdfTooLargeError,
)
from app.services.extraction.models import (
    ExtractedDocument,
    ExtractedTable,
    PageContent,
    PdfMetadata,
    TextBlock,
)
from app.services.extraction.pdf_extractor import extract_pdf, extract_document, extract_pdf_content
from app.services.extraction.table_extractor import (
    extract_tables_from_pdf,
    extract_tables_with_fallback,
)
from app.services.extraction.text_extractor import extract_text_from_pdf, extract_text_simple

__all__ = [
    # Orchestrator
    "extract_pdf",
    "extract_pdf_content",
    "extract_document",
    # Text
    "extract_text_from_pdf",
    "extract_text_simple",
    # Tables
    "extract_tables_from_pdf",
    "extract_tables_with_fallback",
    # Models
    "ExtractedDocument",
    "ExtractedTable",
    "PageContent",
    "PdfMetadata",
    "TextBlock",
    # Exceptions
    "PdfExtractionError",
    "PdfCorruptError",
    "PdfPasswordProtectedError",
    "PdfTooLargeError",
    "PdfEmptyError",
]
