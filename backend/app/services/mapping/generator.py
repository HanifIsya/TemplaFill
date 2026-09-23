"""Document generator — Task 1.12.

Fills template placeholders with mapped values, preserving formatting.

Supported formats per TECH_STACK.md:
 - .docx via python-docx
 - .xlsx via openpyxl
 - .pptx via python-pptx

Process per ARCHITECTURE.md §8:
 1. Clone original template (in memory)
 2. Replace all placeholders with their mapped values
 3. Preserve original formatting (fonts, styles, colors, layouts)
 4. Return filled file bytes

Usage:
    from app.services.mapping.generator import generate_filled_document

    filled_bytes = generate_filled_document(template_bytes, "template.docx", mapped_dict)
    # mapped_dict: {raw_placeholder -> value} OR {field_name -> value}
    # e.g., {"{{full_name}}": "John Doe", "full_name": "John Doe"}
"""

from __future__ import annotations

import io
import re
from pathlib import Path
from typing import Dict, Union

from app.services.mapping.parser import _find_placeholders


def _build_replacement_map(mapped: Dict[str, str]) -> Dict[str, str]:
    """Normalize mapped dict to handle both raw placeholder and field_name keys.

    The mapper returns both; generator should handle either.
    We build a map that can replace any placeholder pattern that normalizes to a known field.
    """
    # Direct map for raw placeholders
    direct: Dict[str, str] = {}
    # Normalized field_name -> value for flexible substitution
    normalized_to_value: Dict[str, str] = {}
    for k, v in mapped.items():
        if not isinstance(k, str):
            continue
        val = str(v) if v is not None else ""
        direct[k] = val
        # Also store normalized version if k looks like field name (no braces/brackets)
        # Detect if k is raw placeholder vs field name
        placeholders = _find_placeholders(k)
        if placeholders:
            # k is a raw placeholder; extract normalized
            for raw, norm, _ in placeholders:
                normalized_to_value[norm] = val
        else:
            # k is likely a normalized field name
            # Normalize it similarly to parser
            norm = re.sub(r"[\s.\-]+", "_", k.strip()).strip("_").lower()
            norm = re.sub(r"__+", "_", norm)
            if norm:
                normalized_to_value[norm] = val
                # Also allow direct replacement of normalized name alone? For templates that use plain name without braces?
                # We don't auto-replace plain words to avoid false positives

    return direct, normalized_to_value


def _replace_in_text(text: str, direct_map: Dict[str, str], norm_map: Dict[str, str]) -> str:
    """Replace placeholders in a single text string.

    Strategy:
     1. Direct string replacement for raw placeholders (longest first to avoid substring issues)
     2. For remaining placeholders found via regex, replace using norm_map
    """
    if not text:
        return text

    # Step 1: direct raw replacement (exact)
    # Sort by length descending to replace longer placeholders first
    for raw in sorted(direct_map.keys(), key=len, reverse=True):
        if raw in text:
            text = text.replace(raw, direct_map[raw])

    # Step 2: regex-based replacement for any remaining placeholder patterns
    # Find placeholders still present and replace via norm_map
    # We iterate patterns again to catch variants not in direct_map
    placeholders = _find_placeholders(text)
    for raw, norm, _ in placeholders:
        if norm in norm_map:
            text = text.replace(raw, norm_map[norm])
        elif norm in direct_map:
            text = text.replace(raw, direct_map[norm])
        # If not found, leave as is (unmapped field) — generator preserves placeholder

    return text


# ---------------------------------------------------------------------------
# .docx generator
# ---------------------------------------------------------------------------

def _generate_docx(template_bytes: bytes, mapped: Dict[str, str]) -> bytes:
    try:
        from docx import Document  # type: ignore
    except ImportError as e:
        raise ImportError("python-docx not installed") from e

    direct_map, norm_map = _build_replacement_map(mapped)

    doc = Document(io.BytesIO(template_bytes))

    # Helper to replace in paragraph while preserving runs where possible
    def replace_in_paragraph(paragraph):
        # paragraph.text is concatenated runs; replacing via text assignment will reset formatting
        # To preserve formatting, we need to handle runs: replace in each run's text
        # Simpler for MVP: if placeholder spans multiple runs, paragraph.text replacement will merge runs but preserve paragraph style
        # We do run-level replacement for better formatting preservation

        full_text = paragraph.text
        if not full_text:
            return
        # Check if any placeholder present in full paragraph text
        if not any(raw in full_text for raw in direct_map) and not _find_placeholders(full_text):
            # Also check norm-based placeholders
            found = _find_placeholders(full_text)
            if not found or not any(norm in norm_map for _, norm, _ in found):
                return

        new_text = _replace_in_text(full_text, direct_map, norm_map)
        if new_text == full_text:
            return

        # If paragraph has runs, try to preserve first run's formatting and clear others
        # Approach: save style of first run, clear paragraph, add new run with new_text and style
        if len(paragraph.runs) == 0:
            paragraph.text = new_text
            return

        # Preserve formatting from first run
        first_run = paragraph.runs[0]
        # Save formatting attributes
        # Clear all runs
        # We need to keep paragraph element but remove runs
        # Use paragraph.clear() which keeps style?
        p = paragraph._p  # type: ignore[attr-defined]
        # Remove all r elements
        # Alternative simpler: set paragraph.text = new_text and reapply bold/italic from first_run
        # But this loses per-run formatting for mixed formatting paragraphs (acceptable for MVP)

        # Save
        bold = first_run.bold
        italic = first_run.italic
        underline = first_run.underline
        color = first_run.font.color.rgb if first_run.font.color else None
        name = first_run.font.name
        size = first_run.font.size

        paragraph.text = new_text
        # Reapply to first run
        if paragraph.runs:
            run = paragraph.runs[0]
            run.bold = bold
            run.italic = italic
            run.underline = underline
            if color:
                run.font.color.rgb = color
            if name:
                run.font.name = name
            if size:
                run.font.size = size

    # Paragraphs
    for para in doc.paragraphs:
        replace_in_paragraph(para)

    # Tables
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for para in cell.paragraphs:
                    replace_in_paragraph(para)

    # Headers & Footers
    for section in doc.sections:
        if section.header:
            for para in section.header.paragraphs:
                replace_in_paragraph(para)
            for table in section.header.tables:
                for row in table.rows:
                    for cell in row.cells:
                        for para in cell.paragraphs:
                            replace_in_paragraph(para)
        if section.footer:
            for para in section.footer.paragraphs:
                replace_in_paragraph(para)

    out = io.BytesIO()
    doc.save(out)
    return out.getvalue()


# ---------------------------------------------------------------------------
# .xlsx generator
# ---------------------------------------------------------------------------

def _generate_xlsx(template_bytes: bytes, mapped: Dict[str, str]) -> bytes:
    try:
        import openpyxl  # type: ignore
    except ImportError as e:
        raise ImportError("openpyxl not installed") from e

    direct_map, norm_map = _build_replacement_map(mapped)

    wb = openpyxl.load_workbook(io.BytesIO(template_bytes))
    for ws in wb.worksheets:
        for row in ws.iter_rows():
            for cell in row:
                if cell.value is None or not isinstance(cell.value, str):
                    continue
                orig = cell.value
                new_val = _replace_in_text(orig, direct_map, norm_map)
                if new_val != orig:
                    cell.value = new_val
                    # Preserve cell style automatically (openpyxl keeps style on value change)
    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()


# ---------------------------------------------------------------------------
# .pptx generator
# ---------------------------------------------------------------------------

def _generate_pptx(template_bytes: bytes, mapped: Dict[str, str]) -> bytes:
    try:
        from pptx import Presentation  # type: ignore
    except ImportError as e:
        raise ImportError("python-pptx not installed") from e

    direct_map, norm_map = _build_replacement_map(mapped)

    prs = Presentation(io.BytesIO(template_bytes))

    def replace_in_text_frame(text_frame):
        for para in text_frame.paragraphs:
            # Build full paragraph text from runs
            full = "".join(run.text for run in para.runs) if para.runs else para.text
            if not full:
                continue
            new_text = _replace_in_text(full, direct_map, norm_map)
            if new_text == full:
                continue
            # Preserve first run formatting
            if para.runs:
                first = para.runs[0]
                bold = first.font.bold
                italic = first.font.italic
                size = first.font.size
                name = first.font.name
                try:
                    color = first.font.color.rgb if first.font.color else None  # type: ignore[union-attr]
                except Exception:  # noqa: BLE001  pptx _NoneColor raises
                    color = None
                # Clear runs
                # For pptx, we can set paragraph text and reapply
                para.text = new_text
                if para.runs:
                    run = para.runs[0]
                    run.font.bold = bold
                    run.font.italic = italic
                    run.font.size = size
                    run.font.name = name
                    if color:
                        try:
                            run.font.color.rgb = color
                        except Exception:  # noqa: BLE001
                            pass
            else:
                para.text = new_text

    for slide in prs.slides:
        for shape in slide.shapes:
            if shape.has_text_frame:
                replace_in_text_frame(shape.text_frame)
            if shape.has_table:
                for row in shape.table.rows:
                    for cell in row.cells:
                        if cell.text_frame:
                            replace_in_text_frame(cell.text_frame)
            if shape.shape_type == 6:  # group
                try:
                    for g_shape in shape.shapes:  # type: ignore[attr-defined]
                        if g_shape.has_text_frame:
                            replace_in_text_frame(g_shape.text_frame)
                except Exception:  # noqa: BLE001
                    pass

    out = io.BytesIO()
    prs.save(out)
    return out.getvalue()


# ---------------------------------------------------------------------------
# Public dispatch
# ---------------------------------------------------------------------------

def generate_filled_document(
    template_bytes: bytes,
    template_filename: str,
    mapped: Dict[str, str],
) -> bytes:
    """Generate filled document for any supported format.

    Args:
        template_bytes: Original template file bytes
        template_filename: Filename with ext to determine format
        mapped: Dict of placeholder->value (as returned by mapper.mapped or values_by_field)

    Returns:
        Bytes of filled document (same format as template)
    """
    if not template_bytes:
        raise ValueError("Empty template file")
    if not template_filename or "." not in template_filename:
        raise ValueError("Filename with extension required")
    ext = Path(template_filename).suffix.lower()
    if ext == ".docx":
        return _generate_docx(template_bytes, mapped)
    if ext == ".xlsx":
        return _generate_xlsx(template_bytes, mapped)
    if ext == ".pptx":
        return _generate_pptx(template_bytes, mapped)
    raise ValueError(f"Unsupported template format: {ext} — expected .docx/.xlsx/.pptx")


def generate_filled_docx(template_bytes: bytes, mapped: Dict[str, str]) -> bytes:
    return _generate_docx(template_bytes, mapped)


def generate_filled_xlsx(template_bytes: bytes, mapped: Dict[str, str]) -> bytes:
    return _generate_xlsx(template_bytes, mapped)


def generate_filled_pptx(template_bytes: bytes, mapped: Dict[str, str]) -> bytes:
    return _generate_pptx(template_bytes, mapped)


__all__ = [
    "generate_filled_document",
    "generate_filled_docx",
    "generate_filled_xlsx",
    "generate_filled_pptx",
]
