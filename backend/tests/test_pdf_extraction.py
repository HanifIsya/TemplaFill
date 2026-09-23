"""Unit tests for PDF extraction pipeline — Task 1.1 & 1.2.

Covers docs/5-quality/TESTING.md key cases:
 - single-page / multi-page text extraction
 - metadata extraction
 - tables (present / absent)
 - corrupt / empty / password-protected / too-large PDFs
 - combined extractor merging
 - block bbox presence
 - API-level contract via models

Run: pytest backend/tests/test_pdf_extraction.py -v
"""

from __future__ import annotations

import io
from pathlib import Path

import fitz  # PyMuPDF
import pytest

from app.services.extraction import (
    PdfCorruptError,
    PdfPasswordProtectedError,
    PdfTooLargeError,
    extract_pdf,
    extract_tables_from_pdf,
    extract_text_from_pdf,
)
from app.services.extraction.models import ExtractedDocument

# ---------------------------------------------------------------------------
# Helpers to create synthetic PDFs (no external fixtures needed)
# ---------------------------------------------------------------------------


def create_text_pdf(
    pages_text: list[str],
    *,
    title: str | None = None,
    author: str | None = None,
) -> bytes:
    """Create a PDF with fitz containing given text per page."""
    doc = fitz.open()
    for text in pages_text:
        page = doc.new_page()  # default A4
        # Insert text at top-left with wrapping
        # Use textbox for longer content
        rect = fitz.Rect(50, 50, 550, 800)
        page.insert_textbox(rect, text, fontsize=11, fontname="helv")
    if title or author:
        meta = {}
        if title:
            meta["title"] = title
        if author:
            meta["author"] = author
        doc.set_metadata(meta)
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()


def create_table_pdf_with_reportlab() -> bytes:
    """Create a PDF with a bordered table using reportlab (pdfplumber-detectable)."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter)
    data = [
        ["Name", "Date", "Amount"],
        ["Alice Smith", "2026-01-15", "$5,000"],
        ["Bob Jones", "2026-02-20", "$12,300"],
        ["Charlie Brown", "2026-03-10", "$7,800"],
    ]
    table = Table(data, colWidths=[150, 100, 100])
    style = TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 1, colors.black),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.beige, colors.white]),
        ]
    )
    table.setStyle(style)
    doc.build([table])
    return buf.getvalue()


def create_text_table_mixed_pdf() -> bytes:
    """Create a PDF with text plus a table on second page."""
    text_page = "This is a contract summary.\nApplicant: John Doe\nDate: 2026-09-23"
    # Create base text PDF with 1 page
    base = create_text_pdf([text_page])
    # Create table PDF and merge? Simpler: use reportlab to make 2-page with text + table
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

    buf = io.BytesIO()
    styles = getSampleStyleSheet()
    story = []
    story.append(Paragraph("Contract Summary", styles["Heading1"]))
    story.append(Paragraph("Applicant: John Doe<br/>Date: 2026-09-23<br/>Company: Acme Corp", styles["BodyText"]))
    story.append(Spacer(1, 20))
    data = [
        ["Item", "Quantity", "Price"],
        ["Widget A", "10", "$100"],
        ["Widget B", "5", "$250"],
    ]
    t = Table(data, colWidths=[150, 100, 100])
    t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 1, colors.black), ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey)]))
    story.append(t)
    doc = SimpleDocTemplate(buf, pagesize=letter)
    doc.build(story)
    return buf.getvalue()


def create_empty_text_pdf() -> bytes:
    """Create a PDF with pages but no text (empty)."""
    doc = fitz.open()
    doc.new_page()
    doc.new_page()
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()


def create_encrypted_pdf() -> bytes:
    """Create a password-protected PDF requiring user password 'secret'.

    PyMuPDF encryption: save with encryption.
    """
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), "Secret content", fontsize=12)
    buf = io.BytesIO()
    # permissions and encryption: owner + user password
    # Use newer API: doc.save with encryption flag
    # Fitz: encryption = fitz.PDF_ENCRYPT_AES_256 + need for owner/user pw
    # For compatibility, try simplest:
    try:
        # PyMuPDF >=1.23: use save with encryption
        doc.save(
            buf,
            encryption=fitz.PDF_ENCRYPT_AES_256,
            owner_pw="owner123",
            user_pw="secret",
            permissions=fitz.PDF_PERM_PRINT,
        )
    except TypeError:
        # older fallback
        doc.save(buf, encryption=1, owner_pw="owner123", user_pw="secret")
    doc.close()
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Text Extractor Tests (Task 1.1)
# ---------------------------------------------------------------------------


class TestTextExtractorSinglePage:
    def test_extract_single_page_text(self):
        pdf_bytes = create_text_pdf(["Hello World — TemplaFill test."])
        doc = extract_text_from_pdf(pdf_bytes)
        assert isinstance(doc, ExtractedDocument)
        assert doc.metadata.page_count == 1
        assert len(doc.pages) == 1
        assert "Hello World" in doc.pages[0].text
        assert "Hello World" in doc.full_text
        assert doc.pages[0].page_number == 1
        assert doc.pages[0].has_text is True
        assert doc.metadata.has_text is True

    def test_extract_text_preserves_filename(self):
        pdf_bytes = create_text_pdf(["Filename test"])
        doc = extract_text_from_pdf(pdf_bytes, filename="contract.pdf")
        assert doc.filename == "contract.pdf"

    def test_extract_text_with_blocks(self):
        pdf_bytes = create_text_pdf(["Block A paragraph.\n\nBlock B paragraph."])
        doc = extract_text_from_pdf(pdf_bytes, include_blocks=True)
        # Should have at least one block with bbox
        assert len(doc.pages[0].blocks) >= 1
        for block in doc.pages[0].blocks:
            assert isinstance(block.bbox, tuple)
            assert len(block.bbox) == 4
            assert block.text.strip() != ""

    def test_extract_text_without_blocks(self):
        pdf_bytes = create_text_pdf(["No blocks"])
        doc = extract_text_from_pdf(pdf_bytes, include_blocks=False)
        assert doc.pages[0].blocks == []

    def test_extract_text_page_dimensions(self):
        pdf_bytes = create_text_pdf(["Dimension check"])
        doc = extract_text_from_pdf(pdf_bytes)
        page = doc.pages[0]
        assert page.width > 0
        assert page.height > 0

    def test_extract_from_path(self, tmp_path: Path):
        pdf_bytes = create_text_pdf(["Path based extraction"])
        p = tmp_path / "sample.pdf"
        p.write_bytes(pdf_bytes)
        doc = extract_text_from_pdf(str(p))
        assert "Path based extraction" in doc.full_text
        assert doc.filename == "sample.pdf"

        # Also test Path object
        doc2 = extract_text_from_pdf(p)
        assert "Path based extraction" in doc2.full_text


class TestTextExtractorMultiPage:
    def test_extract_multi_page(self):
        pages = [f"Content of page {i+1} — unique text {i*111}" for i in range(5)]
        pdf_bytes = create_text_pdf(pages)
        doc = extract_text_from_pdf(pdf_bytes)
        assert doc.metadata.page_count == 5
        assert len(doc.pages) == 5
        for i, page in enumerate(doc.pages):
            assert page.page_number == i + 1
            assert f"page {i+1}" in page.text.lower()
        # full_text concatenates all pages
        assert "Content of page 1" in doc.full_text
        assert "Content of page 5" in doc.full_text

    def test_page_numbers_are_one_indexed(self):
        pdf_bytes = create_text_pdf(["A", "B", "C"])
        doc = extract_text_from_pdf(pdf_bytes)
        assert [p.page_number for p in doc.pages] == [1, 2, 3]

    def test_extract_500_pages_guard(self):
        # Don't actually create 500 pages; test max_pages guard with small PDF
        pdf_bytes = create_text_pdf(["P1", "P2", "P3"])
        with pytest.raises(PdfTooLargeError):
            extract_text_from_pdf(pdf_bytes, max_pages=2)


class TestTextExtractorMetadata:
    def test_metadata_extraction(self):
        pdf_bytes = create_text_pdf(["Meta test"], title="Test Title", author="Test Author")
        doc = extract_text_from_pdf(pdf_bytes)
        assert doc.metadata.title == "Test Title"
        assert doc.metadata.author == "Test Author"
        assert doc.metadata.page_count == 1

    def test_metadata_file_size(self):
        pdf_bytes = create_text_pdf(["Size check"])
        doc = extract_text_from_pdf(pdf_bytes)
        assert doc.metadata.file_size_bytes == len(pdf_bytes)

    def test_empty_pdf_has_no_text(self):
        pdf_bytes = create_empty_text_pdf()
        doc = extract_text_from_pdf(pdf_bytes)
        # Empty pages have no extractable text
        assert doc.metadata.has_text is False
        assert doc.full_text == ""
        for page in doc.pages:
            assert page.has_text is False


class TestTextExtractorErrorHandling:
    def test_corrupt_pdf_raises(self):
        with pytest.raises(PdfCorruptError):
            extract_text_from_pdf(b"not a pdf at all")

    def test_empty_bytes_raises(self):
        with pytest.raises(PdfCorruptError):
            extract_text_from_pdf(b"")

    def test_missing_pdf_header_raises(self):
        with pytest.raises(PdfCorruptError):
            extract_text_from_pdf(b"\x00\x01\x02\x03 not pdf")

    def test_nonexistent_file_raises(self):
        with pytest.raises(PdfCorruptError, match="File not found"):
            extract_text_from_pdf("/nonexistent/path/file.pdf")

    def test_encrypted_pdf_raises(self):
        pdf_bytes = create_encrypted_pdf()
        with pytest.raises(PdfPasswordProtectedError):
            extract_text_from_pdf(pdf_bytes)

    def test_bytesio_input(self):
        pdf_bytes = create_text_pdf(["BytesIO test"])
        bio = io.BytesIO(pdf_bytes)
        doc = extract_text_from_pdf(bio)
        assert "BytesIO test" in doc.full_text


# ---------------------------------------------------------------------------
# Table Extractor Tests (Task 1.2)
# ---------------------------------------------------------------------------


class TestTableExtractorNoTables:
    def test_extract_tables_no_tables_returns_empty(self):
        pdf_bytes = create_text_pdf(["Just text, no table here."])
        tables = extract_tables_from_pdf(pdf_bytes)
        assert tables == []

    def test_extract_tables_empty_pdf(self):
        pdf_bytes = create_empty_text_pdf()
        tables = extract_tables_from_pdf(pdf_bytes)
        assert tables == []

    def test_table_extractor_corrupt_pdf_raises(self):
        with pytest.raises(PdfCorruptError):
            extract_tables_from_pdf(b"not a pdf")

    def test_table_extractor_bytesio(self):
        pdf_bytes = create_text_pdf(["Text only"])
        bio = io.BytesIO(pdf_bytes)
        tables = extract_tables_from_pdf(bio)
        assert tables == []


class TestTableExtractorWithTables:
    def test_extract_tables_with_reportlab_table(self):
        pdf_bytes = create_table_pdf_with_reportlab()
        tables = extract_tables_from_pdf(pdf_bytes)
        # Should detect at least one table
        assert len(tables) >= 1
        # Find table with header Row
        table = tables[0]
        assert table.page_number == 1
        # Headers should contain "Name" or "Date" or "Amount"
        header_text = " ".join(table.headers).lower()
        assert "name" in header_text or "date" in header_text
        # Check rows count
        assert table.row_count >= 2
        # Check raw_data includes headers
        assert table.raw_data[0] == table.headers
        # Ensure bbox present or None (both acceptable, but at least structure valid)
        # For lattice tables bbox should be present
        # But we don't hard require bbox

    def test_extract_tables_mixed_content(self):
        pdf_bytes = create_text_table_mixed_pdf()
        tables = extract_tables_from_pdf(pdf_bytes)
        # Mixed doc should have at least one table
        assert len(tables) >= 1
        # Table data should contain "Widget" rows
        found_widget = any(
            "widget" in " ".join(row).lower() for tbl in tables for row in tbl.rows
        )
        assert found_widget

    def test_table_headers_and_rows_structure(self):
        pdf_bytes = create_table_pdf_with_reportlab()
        tables = extract_tables_from_pdf(pdf_bytes)
        tbl = tables[0]
        # Headers should be list of strings
        assert isinstance(tbl.headers, list)
        assert all(isinstance(h, str) for h in tbl.headers)
        # Rows should be list of lists of strings
        assert isinstance(tbl.rows, list)
        for row in tbl.rows:
            assert isinstance(row, list)
            assert len(row) == len(tbl.headers)

    def test_table_with_custom_settings_still_extracts(self):
        pdf_bytes = create_table_pdf_with_reportlab()
        # Try with explicit lattice settings
        tables = extract_tables_from_pdf(
            pdf_bytes,
            table_settings={"vertical_strategy": "lines", "horizontal_strategy": "lines"},
        )
        assert len(tables) >= 1

    def test_table_via_path(self, tmp_path: Path):
        pdf_bytes = create_table_pdf_with_reportlab()
        p = tmp_path / "table.pdf"
        p.write_bytes(pdf_bytes)
        tables = extract_tables_from_pdf(str(p))
        assert len(tables) >= 1

    def test_encrypted_table_pdf_raises(self):
        pdf_bytes = create_encrypted_pdf()
        with pytest.raises((PdfPasswordProtectedError, PdfCorruptError)):
            extract_tables_from_pdf(pdf_bytes)


# ---------------------------------------------------------------------------
# Combined Extractor Tests (Task 1.1 + 1.2 integration)
# ---------------------------------------------------------------------------


class TestCombinedExtractor:
    def test_combined_text_only(self):
        pdf_bytes = create_text_pdf(["Only text here"])
        doc = extract_pdf(pdf_bytes, filename="text.pdf", include_tables=False)
        assert "Only text here" in doc.full_text
        assert doc.tables == []
        assert len(doc.pages) == 1
        assert doc.filename == "text.pdf"

    def test_combined_with_tables_merged(self):
        pdf_bytes = create_table_pdf_with_reportlab()
        doc = extract_pdf(pdf_bytes, filename="table.pdf", include_tables=True)
        # Text extraction should still work (reportlab text)
        assert doc.metadata.page_count == 1
        # Tables should be populated both flattened and per-page
        assert len(doc.tables) >= 1
        assert len(doc.pages[0].tables) >= 1
        # Flattened tables == page tables for single page
        assert doc.tables[0].page_number == 1

    def test_combined_multi_page_with_mixed(self):
        pdf_bytes = create_text_table_mixed_pdf()
        doc = extract_pdf(pdf_bytes, include_tables=True)
        assert doc.page_count >= 1
        # At least one table found across document
        assert len(doc.tables) >= 1
        # Document full_text should contain contract summary
        assert "John Doe" in doc.full_text or "Contract" in doc.full_text

    def test_combined_empty_pdf(self):
        pdf_bytes = create_empty_text_pdf()
        doc = extract_pdf(pdf_bytes, include_tables=True)
        assert doc.full_text == ""
        assert doc.metadata.has_text is False
        assert len(doc.pages) == 2
        assert doc.tables == []

    def test_combined_respects_max_pages(self):
        pdf_bytes = create_text_pdf(["A", "B", "C", "D"])
        with pytest.raises(PdfTooLargeError):
            extract_pdf(pdf_bytes, max_pages=2)

    def test_combined_handles_bytesio(self):
        pdf_bytes = create_text_pdf(["BytesIO combined"])
        bio = io.BytesIO(pdf_bytes)
        doc = extract_pdf(bio, include_tables=True)
        assert "BytesIO combined" in doc.full_text

    def test_combined_table_extraction_best_effort_on_text_only(self):
        # Text-only PDF should not fail when include_tables True, just empty tables
        pdf_bytes = create_text_pdf(["Text only, no tables expected"])
        doc = extract_pdf(pdf_bytes, include_tables=True)
        assert doc.tables == []
        assert doc.pages[0].tables == []

    def test_document_model_helpers(self):
        pdf_bytes = create_text_pdf(["Page 1", "Page 2"])
        doc = extract_pdf(pdf_bytes)
        # get_page helper
        assert doc.get_page(1) is not None
        assert doc.get_page(1).page_number == 1
        assert doc.get_page(99) is None
        # to_dict serialization
        d = doc.to_dict()
        assert d["metadata"]["page_count"] == 2
        assert "pages" in d
        # page_count property
        assert doc.page_count == 2

    def test_page_tables_consistency(self):
        pdf_bytes = create_table_pdf_with_reportlab()
        doc = extract_pdf(pdf_bytes)
        # Flattened tables should equal sum of per-page tables
        per_page_count = sum(len(p.tables) for p in doc.pages)
        assert per_page_count == len(doc.tables)
