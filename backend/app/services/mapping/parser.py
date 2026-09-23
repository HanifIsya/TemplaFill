"""Template parser — Tasks 1.8-1.10 (docx, xlsx, pptx).

Detects placeholder fields using regex patterns per ARCHITECTURE.md §6:
 - {{field}}, {field}, [field], <<field>>, __field__

Scans:
 - .docx: paragraphs, tables, headers, footers (python-docx)
 - .xlsx: all cells across all sheets (openpyxl)
 - .pptx: all text frames across all slides/shapes/tables (python-pptx)

Usage:
    from app.services.mapping.parser import parse_template

    result = parse_template("template.docx")  # auto-detect by ext
    # or
    result = parse_template_bytes(data, filename="template.xlsx")
"""

from __future__ import annotations

import io
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

from app.services.mapping.models import ParsedTemplate, TemplateField

# ---------------------------------------------------------------------------
# Regex patterns — ordered from most specific to generic
# ---------------------------------------------------------------------------
# Each pattern captures inner field name in group 1
_PLACEHOLDER_PATTERNS: List[Tuple[str, re.Pattern]] = [
    ("double_brace", re.compile(r"\{\{\s*([a-zA-Z0-9_\-.\s]+?)\s*\}\}")),
    ("angle", re.compile(r"<<\s*([a-zA-Z0-9_\-.\s]+?)\s*>>")),
    ("square", re.compile(r"\[\s*([a-zA-Z0-9_\-.\s]+?)\s*\]")),
    ("single_brace", re.compile(r"\{\s*([a-zA-Z0-9_\-.\s]+?)\s*\}")),
    ("underscore", re.compile(r"__\s*([a-zA-Z0-9_\-.\s]+?)\s*__")),
]

# For dedup, normalize field name: strip, lower, replace spaces/dots/hyphens with _
def _normalize_field_name(raw: str) -> str:
    raw = raw.strip()
    # Replace spaces, dots, hyphens with underscore, collapse multiple underscores
    norm = re.sub(r"[\s.\-]+", "_", raw)
    norm = re.sub(r"__+", "_", norm)
    norm = norm.strip("_")
    # Lowercase for consistency but preserve original case for display? Use lower
    return norm.lower()


def _find_placeholders(text: str) -> List[Tuple[str, str, str]]:
    """Find all placeholders in text.

    Returns list of (raw_placeholder, normalized_name, pattern_name)
    """
    found: List[Tuple[str, str, str]] = []
    # Avoid double-counting: track spans already matched by higher-priority patterns
    used_spans: List[Tuple[int, int]] = []

    for pat_name, pat in _PLACEHOLDER_PATTERNS:
        for m in pat.finditer(text):
            start, end = m.span()
            # Check overlap with already used spans
            overlapped = False
            for us, ue in used_spans:
                if start < ue and end > us:  # overlap
                    overlapped = True
                    break
            if overlapped:
                continue
            raw_placeholder = m.group(0)
            inner = m.group(1)
            if not inner or not inner.strip():
                continue
            # Filter very short or numeric-only placeholders that are likely not fields
            inner_stripped = inner.strip()
            if len(inner_stripped) < 1 or inner_stripped.isdigit():
                continue
            norm = _normalize_field_name(inner_stripped)
            if not norm:
                continue
            found.append((raw_placeholder, norm, pat_name))
            used_spans.append((start, end))
    return found


def _aggregate_fields(
    found: List[Tuple[str, str, str, str, str]],  # raw, norm, pat, location, context
    fmt: str,
) -> List[TemplateField]:
    """Deduplicate by normalized name, keep occurrences count."""
    agg: Dict[str, TemplateField] = {}
    for raw, norm, _pat, location, context in found:
        if norm in agg:
            agg[norm].occurrences += 1
            # Keep first placeholder raw, but append location to help debug
            # We keep location as first occurrence; could store list
        else:
            agg[norm] = TemplateField(
                field_name=norm,
                placeholder=raw,
                normalized_placeholder=norm,
                location=location,
                format=fmt,
                occurrences=1,
                context=context[:120] if context else None,
            )
    return list(agg.values())


# ---------------------------------------------------------------------------
# .docx parser
# ---------------------------------------------------------------------------

def _parse_docx(file_bytes: bytes, filename: str = "") -> ParsedTemplate:
    try:
        from docx import Document  # type: ignore
    except ImportError as e:
        raise ImportError("python-docx not installed") from e

    doc = Document(io.BytesIO(file_bytes))
    found: List[Tuple[str, str, str, str, str]] = []
    warnings: List[str] = []

    def scan_text(text: str, location: str):
        if not text:
            return
        for raw, norm, pat in _find_placeholders(text):
            found.append((raw, norm, pat, location, text))

    # Paragraphs
    for idx, para in enumerate(doc.paragraphs):
        scan_text(para.text, f"paragraph:{idx}")

    # Tables
    for t_idx, table in enumerate(doc.tables):
        for r_idx, row in enumerate(table.rows):
            for c_idx, cell in enumerate(row.cells):
                for p_idx, para in enumerate(cell.paragraphs):
                    loc = f"table:{t_idx} row:{r_idx} col:{c_idx} para:{p_idx}"
                    scan_text(para.text, loc)

    # Headers / Footers
    for s_idx, section in enumerate(doc.sections):
        # Header
        if section.header:
            for p_idx, para in enumerate(section.header.paragraphs):
                scan_text(para.text, f"section:{s_idx} header para:{p_idx}")
            # Header tables
            for t_idx, table in enumerate(section.header.tables):
                for r_idx, row in enumerate(table.rows):
                    for c_idx, cell in enumerate(row.cells):
                        for p_idx, para in enumerate(cell.paragraphs):
                            scan_text(para.text, f"section:{s_idx} header table:{t_idx} r:{r_idx} c:{c_idx}")
        if section.footer:
            for p_idx, para in enumerate(section.footer.paragraphs):
                scan_text(para.text, f"section:{s_idx} footer para:{p_idx}")

    fields = _aggregate_fields(found, "docx")
    field_names = [f.field_name for f in fields]
    total = sum(f.occurrences for f in fields)

    if not fields:
        warnings.append("No placeholders detected. Expected patterns: {{field}}, {field}, [field], <<field>>, __field__")

    # Detect duplicate placeholder names (case-insensitive) — already deduped, but warn if raw differs
    # Check for suspicious fields like very long names
    for f in fields:
        if len(f.field_name) > 50:
            warnings.append(f"Unusually long field name: {f.field_name}")

    return ParsedTemplate(
        filename=filename or "template.docx",
        format="docx",
        fields=fields,
        field_names=field_names,
        has_placeholders=len(fields) > 0,
        total_placeholders=total,
        warnings=warnings,
    )


# ---------------------------------------------------------------------------
# .xlsx parser
# ---------------------------------------------------------------------------

def _parse_xlsx(file_bytes: bytes, filename: str = "") -> ParsedTemplate:
    try:
        import openpyxl  # type: ignore
    except ImportError as e:
        raise ImportError("openpyxl not installed") from e

    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=False, read_only=False)
    found: List[Tuple[str, str, str, str, str]] = []
    warnings: List[str] = []

    for sheet in wb.worksheets:
        for row in sheet.iter_rows():
            for cell in row:
                if cell.value is None:
                    continue
                # Only string cells can contain placeholders; but numeric cells could be formatted as placeholder?
                text = str(cell.value) if cell.value is not None else ""
                if not text:
                    continue
                coord = cell.coordinate  # e.g., A1
                loc = f"sheet:{sheet.title} cell:{coord}"
                for raw, norm, pat in _find_placeholders(text):
                    found.append((raw, norm, pat, loc, text))

    fields = _aggregate_fields(found, "xlsx")
    field_names = [f.field_name for f in fields]
    total = sum(f.occurrences for f in fields)

    if not fields:
        warnings.append("No placeholders detected in any sheet.")

    return ParsedTemplate(
        filename=filename or "template.xlsx",
        format="xlsx",
        fields=fields,
        field_names=field_names,
        has_placeholders=len(fields) > 0,
        total_placeholders=total,
        warnings=warnings,
    )


# ---------------------------------------------------------------------------
# .pptx parser
# ---------------------------------------------------------------------------

def _parse_pptx(file_bytes: bytes, filename: str = "") -> ParsedTemplate:
    try:
        from pptx import Presentation  # type: ignore
    except ImportError as e:
        raise ImportError("python-pptx not installed") from e

    prs = Presentation(io.BytesIO(file_bytes))
    found: List[Tuple[str, str, str, str, str]] = []
    warnings: List[str] = []

    def scan_text(text: str, location: str):
        for raw, norm, pat in _find_placeholders(text):
            found.append((raw, norm, pat, location, text))

    for s_idx, slide in enumerate(prs.slides):
        for shape_idx, shape in enumerate(slide.shapes):
            loc_base = f"slide:{s_idx+1} shape:{shape_idx}"
            # Text frame
            if shape.has_text_frame:
                for p_idx, para in enumerate(shape.text_frame.paragraphs):
                    text = "".join(run.text for run in para.runs) if para.runs else para.text
                    if text:
                        scan_text(text, f"{loc_base} para:{p_idx}")
            # Table
            if shape.has_table:
                table = shape.table
                for r_idx, row in enumerate(table.rows):
                    for c_idx, cell in enumerate(row.cells):
                        text = cell.text or ""
                        if text:
                            scan_text(text, f"{loc_base} table r:{r_idx} c:{c_idx}")
            # Group shapes: recurse? For MVP, handle group via shapes
            if shape.shape_type == 6:  # msoGroup
                try:
                    for g_idx, g_shape in enumerate(shape.shapes):  # type: ignore[attr-defined]
                        if g_shape.has_text_frame:
                            for p_idx, para in enumerate(g_shape.text_frame.paragraphs):
                                text = "".join(run.text for run in para.runs) if para.runs else para.text
                                if text:
                                    scan_text(text, f"{loc_base} group:{g_idx} para:{p_idx}")
                except Exception:  # noqa: BLE001
                    pass

    fields = _aggregate_fields(found, "pptx")
    field_names = [f.field_name for f in fields]
    total = sum(f.occurrences for f in fields)

    if not fields:
        warnings.append("No placeholders detected in any slide.")

    return ParsedTemplate(
        filename=filename or "template.pptx",
        format="pptx",
        fields=fields,
        field_names=field_names,
        has_placeholders=len(fields) > 0,
        total_placeholders=total,
        warnings=warnings,
    )


# ---------------------------------------------------------------------------
# Public dispatch
# ---------------------------------------------------------------------------

def _detect_format(filename: str, file_bytes: bytes) -> str:
    ext = Path(filename).suffix.lower() if filename else ""
    if ext in (".docx", ".xlsx", ".pptx"):
        return ext.lstrip(".")
    # Magic fallback: check zip header (all three are zip-based)
    if file_bytes[:2] == b"PK":
        # Could be any of them; try to guess via extension-less? default to docx
        # For templafill, template_file must be .docx/.xlsx/.pptx per API.md
        # So filename extension is authoritative; if missing, raise
        raise ValueError(f"Cannot detect template format without filename extension (got {ext})")
    raise ValueError(f"Unsupported template format: {ext} — expected .docx, .xlsx, .pptx")


def parse_template(file_path: Union[str, Path], filename: Optional[str] = None) -> ParsedTemplate:
    """Parse template from file path."""
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Template not found: {path}")
    data = path.read_bytes()
    fname = filename or path.name
    return parse_template_bytes(data, filename=fname)


def parse_template_bytes(file_bytes: bytes, filename: str) -> ParsedTemplate:
    """Parse template from bytes + filename (extension determines parser)."""
    if not file_bytes:
        raise ValueError("Empty template file")
    if not filename or "." not in filename:
        raise ValueError("Filename with extension required (e.g., template.docx)")
    fmt = _detect_format(filename, file_bytes)
    if fmt == "docx":
        return _parse_docx(file_bytes, filename=filename)
    if fmt == "xlsx":
        return _parse_xlsx(file_bytes, filename=filename)
    if fmt == "pptx":
        return _parse_pptx(file_bytes, filename=filename)
    raise ValueError(f"Unsupported format: {fmt}")


# Alias for convenience
parse_template_auto = parse_template_bytes

__all__ = [
    "parse_template",
    "parse_template_bytes",
    "parse_template_auto",
    "_find_placeholders",
    "_normalize_field_name",
]
