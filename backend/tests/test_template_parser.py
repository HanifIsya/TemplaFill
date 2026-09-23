"""Tests for template parser — Tasks 1.8-1.10."""

import io

import pytest
from docx import Document
import openpyxl
from pptx import Presentation
from pptx.util import Inches

from app.services.mapping.parser import (
    _find_placeholders,
    _normalize_field_name,
    parse_template_bytes,
)


def create_docx_with_placeholders(placeholders: list[str], with_table: bool = False) -> bytes:
    doc = Document()
    for ph in placeholders:
        doc.add_paragraph(f"Field: {ph} is here.")
    if with_table:
        table = doc.add_table(rows=1, cols=2)
        row = table.rows[0]
        row.cells[0].text = f"Table field {placeholders[0]}"
        row.cells[1].text = "Value"
        # Also add placeholder in second row
        row2 = table.add_row()
        row2.cells[0].text = f"Another {placeholders[1] if len(placeholders)>1 else placeholders[0]}"
        row2.cells[1].text = "Data"
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def create_xlsx_with_placeholders(cells: dict) -> bytes:  # cells: {coord: value}
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Sheet1"
    for coord, val in cells.items():
        ws[coord] = val
    # Add second sheet with placeholder too
    ws2 = wb.create_sheet("Sheet2")
    ws2["A1"] = "Second sheet {{second_sheet_field}}"
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def create_pptx_with_placeholders(placeholders: list[str]) -> bytes:
    prs = Presentation()
    slide_layout = prs.slide_layouts[1]  # Title and Content
    slide = prs.slides.add_slide(slide_layout)
    title = slide.shapes.title
    title.text = f"Title {placeholders[0]}"
    content = slide.placeholders[1]
    tf = content.text_frame
    tf.text = f"Content with {placeholders[0]} and more"
    # Add second slide with table placeholder
    slide2 = prs.slides.add_slide(prs.slide_layouts[5])  # blank
    left = Inches(1)
    top = Inches(1)
    width = Inches(4)
    height = Inches(1)
    table_shape = slide2.shapes.add_table(2, 2, left, top, width, height)
    table_shape.table.cell(0, 0).text = placeholders[1] if len(placeholders) > 1 else placeholders[0]
    table_shape.table.cell(0, 1).text = "Value"
    buf = io.BytesIO()
    prs.save(buf)
    return buf.getvalue()


class TestPlaceholderRegex:
    def test_double_brace(self):
        found = _find_placeholders("Hello {{full_name}} world")
        assert len(found) == 1
        assert found[0][1] == "full_name"

    def test_single_brace(self):
        found = _find_placeholders("Field {phone_number} here")
        assert found[0][1] == "phone_number"

    def test_square(self):
        found = _find_placeholders("Value [invoice_date] here")
        assert found[0][1] == "invoice_date"

    def test_angle(self):
        found = _find_placeholders("<<contract_date>>")
        assert found[0][1] == "contract_date"

    def test_underscore(self):
        found = _find_placeholders("__signature__")
        assert found[0][1] == "signature"

    def test_mixed_patterns(self):
        text = "{{name}} and [date] and <<total>> and __sign__ and {phone}"
        found = _find_placeholders(text)
        norms = {n for _, n, _ in found}
        assert "name" in norms
        assert "date" in norms
        assert "total" in norms
        assert "sign" in norms
        assert "phone" in norms

    def test_normalize(self):
        assert _normalize_field_name("Full Name") == "full_name"
        assert _normalize_field_name("invoice-date") == "invoice_date"
        assert _normalize_field_name("  Phone Number  ") == "phone_number"
        assert _normalize_field_name("amount.total") == "amount_total"

    def test_avoid_double_counting(self):
        # {{name}} contains {name} inside; should only count double_brace once
        found = _find_placeholders("{{full_name}}")
        assert len(found) == 1
        assert found[0][0] == "{{full_name}}"


class TestDocxParser:
    def test_detect_double_brace(self):
        data = create_docx_with_placeholders(["{{full_name}}", "{{address}}"])
        result = parse_template_bytes(data, filename="template.docx")
        assert result.format == "docx"
        assert result.has_placeholders
        assert "full_name" in result.field_names
        assert "address" in result.field_names
        assert result.total_placeholders == 2

    def test_detect_all_pattern_types(self):
        placeholders = ["{{name}}", "{phone}", "[date]", "<<amount>>", "__sig__"]
        data = create_docx_with_placeholders(placeholders)
        result = parse_template_bytes(data, filename="template.docx")
        assert len(result.fields) == 5
        assert "name" in result.field_names

    def test_detect_in_table(self):
        data = create_docx_with_placeholders(["{{field1}}", "<<field2>>"], with_table=True)
        result = parse_template_bytes(data, filename="template.docx")
        # Should detect placeholders in paragraphs and table cells
        assert len(result.fields) >= 2

    def test_detect_in_header(self):
        # Create docx with header placeholder
        doc = Document()
        section = doc.sections[0]
        header = section.header
        header.paragraphs[0].text = "Header {{header_field}}"
        doc.add_paragraph("Body {{body_field}}")
        buf = io.BytesIO()
        doc.save(buf)
        result = parse_template_bytes(buf.getvalue(), filename="template.docx")
        assert "header_field" in result.field_names
        assert "body_field" in result.field_names

    def test_no_placeholders_warning(self):
        doc = Document()
        doc.add_paragraph("No placeholders here")
        buf = io.BytesIO()
        doc.save(buf)
        result = parse_template_bytes(buf.getvalue(), filename="template.docx")
        assert not result.has_placeholders
        assert len(result.warnings) > 0

    def test_duplicate_placeholder_counts(self):
        data = create_docx_with_placeholders(["{{dup}}", "{{dup}}", "{{dup}}"])
        result = parse_template_bytes(data, filename="template.docx")
        # Deduped to 1 field but occurrences 3
        assert len(result.fields) == 1
        assert result.fields[0].occurrences == 3
        assert result.total_placeholders == 3


class TestXlsxParser:
    def test_detect_in_cells(self):
        cells = {"A1": "Name: {{full_name}}", "B2": "Date: [invoice_date]", "C3": "<<total_amount>>"}
        data = create_xlsx_with_placeholders(cells)
        result = parse_template_bytes(data, filename="template.xlsx")
        assert result.format == "xlsx"
        assert "full_name" in result.field_names
        assert "invoice_date" in result.field_names
        assert "total_amount" in result.field_names

    def test_detect_across_sheets(self):
        cells = {"A1": "{{sheet1_field}}"}
        data = create_xlsx_with_placeholders(cells)
        result = parse_template_bytes(data, filename="template.xlsx")
        # Sheet2 has second_sheet_field
        assert "sheet1_field" in result.field_names
        assert "second_sheet_field" in result.field_names

    def test_xlsx_no_placeholders(self):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws["A1"] = "Just value"
        ws["B2"] = 123
        buf = io.BytesIO()
        wb.save(buf)
        result = parse_template_bytes(buf.getvalue(), filename="template.xlsx")
        assert not result.has_placeholders


class TestPptxParser:
    def test_detect_in_slide_text(self):
        data = create_pptx_with_placeholders(["{{slide_title}}", "<<amount>>"])
        result = parse_template_bytes(data, filename="template.pptx")
        assert result.format == "pptx"
        assert "slide_title" in result.field_names

    def test_detect_in_table(self):
        data = create_pptx_with_placeholders(["{{field1}}", "{{field2}}"])
        result = parse_template_bytes(data, filename="template.pptx")
        assert len(result.fields) >= 2

    def test_pptx_no_placeholders(self):
        prs = Presentation()
        slide = prs.slides.add_slide(prs.slide_layouts[5])
        left = Inches(1)
        top = Inches(1)
        width = Inches(2)
        height = Inches(1)
        textbox = slide.shapes.add_textbox(left, top, width, height)
        textbox.text_frame.text = "No placeholders"
        buf = io.BytesIO()
        prs.save(buf)
        result = parse_template_bytes(buf.getvalue(), filename="template.pptx")
        assert not result.has_placeholders


class TestParserDispatch:
    def test_auto_detect_by_extension(self):
        data = create_docx_with_placeholders(["{{auto}}"])
        result = parse_template_bytes(data, filename="my_template.docx")
        assert result.format == "docx"

        x_cells = {"A1": "{{auto_x}}"}
        x_data = create_xlsx_with_placeholders(x_cells)
        result2 = parse_template_bytes(x_data, filename="data.xlsx")
        assert result2.format == "xlsx"

    def test_missing_extension_raises(self):
        data = create_docx_with_placeholders(["{{field}}"])
        with pytest.raises(ValueError, match="extension"):
            parse_template_bytes(data, filename="no_extension")

    def test_empty_file_raises(self):
        with pytest.raises(ValueError, match="Empty"):
            parse_template_bytes(b"", filename="template.docx")

    def test_unsupported_format_raises(self):
        with pytest.raises(ValueError):
            parse_template_bytes(b"PK fake", filename="template.pdf")
