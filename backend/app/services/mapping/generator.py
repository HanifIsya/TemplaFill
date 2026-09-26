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
from typing import Any, Dict, Tuple

from app.services.mapping.parser import (
    _PLACEHOLDER_PATTERNS,
    _find_placeholders,
    _normalize_field_name,
)

# XML-illegal control characters that make python-docx/openpyxl raise on write.
# \t (0x09), \n (0x0A) and \r (0x0D) are XML-legal and are kept.
_XML_ILLEGAL = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F]")


def _is_plain_number(rest: str) -> bool:
    """True if `rest` is a plain numeric/currency token (e.g. '500', '12.5', '$500')."""
    candidate = rest.strip().replace(",", "").replace("$", "").replace(" ", "")
    if not candidate:
        return False
    try:
        float(candidate)
        return True
    except ValueError:
        return False


def neutralize_formula(value: Any) -> str:
    """VULN-04: neutralize spreadsheet formula/DDE injection.

    Excel treats a leading '=', '+', '-', '@' (and control chars) as the start
    of a formula. We prefix dangerous values with an apostrophe so Excel stores
    them as literal text, while preserving legitimate numeric values such as
    '-500' or '+12.5'.
    """
    text = "" if value is None else str(value)
    if not text:
        return text
    # Leading control characters (tab/CR/LF) can also trigger formula evaluation.
    if text[0] in ("\t", "\r", "\n"):
        return "'" + text
    # A leading BOM is a known Excel formula-trigger bypass.
    stripped = text.lstrip("\ufeff").lstrip()
    if not stripped:
        return text
    first = stripped[0]
    if first == "=" or first == "@":
        return "'" + text
    if first in ("+", "-"):
        if _is_plain_number(stripped[1:]):
            return text
        return "'" + text
    return text


def _clean_field_value(val: Any, *, spreadsheet: bool = False) -> str:
    if val is None:
        return ""
    text = str(val)
    # Strip markdown bold (**text**) that LLMs may produce. We deliberately do
    # NOT strip single asterisks: `*` is a common arithmetic/invoice character
    # (e.g. "5 * 3 * 2"), and stripping it silently corrupts extracted values.
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    # Remove XML-illegal control characters so docx/xlsx generation cannot crash.
    text = _XML_ILLEGAL.sub("", text)
    # VULN-04: neutralize formula/DDE payloads for spreadsheet output.
    if spreadsheet:
        text = neutralize_formula(text)
    return text


def _build_replacement_map(
    mapped: Dict[str, str], *, spreadsheet: bool = False
) -> Tuple[Dict[str, str], Dict[str, str]]:
    """Normalize mapped dict to handle both raw placeholder and field_name keys.

    The mapper returns both; generator should handle either.
    We build a map that can replace any placeholder pattern that normalizes to a known field.
    """
    direct: Dict[str, str] = {}
    normalized_to_value: Dict[str, str] = {}
    for k, v in mapped.items():
        if not isinstance(k, str):
            continue
        val = _clean_field_value(v, spreadsheet=spreadsheet)
        placeholders = _find_placeholders(k)
        if placeholders:
            # k is a raw placeholder like {{nomor_kontrak}}
            direct[k] = val
            for raw, norm, _ in placeholders:
                normalized_to_value[norm] = val
        else:
            # k is a bare field name like 'nomor_kontrak'
            norm = _normalize_field_name(k)
            if norm:
                normalized_to_value[norm] = val

    return direct, normalized_to_value


def _combined_placeholder_regex() -> "re.Pattern[str]":
    """One alternation of all placeholder patterns.

    Alternatives are ordered longest-regex-first so a nested delimiter like
    `<<<a>>>` matches `<<a>>` (angle) before the single-brace fallback can
    consume a shorter inner span.
    """
    alternatives = sorted(
        (pat.pattern for _name, pat in _PLACEHOLDER_PATTERNS),
        key=len,
        reverse=True,
    )
    return re.compile("|".join(f"(?:{alt})" for alt in alternatives))


_COMBINED_RE = _combined_placeholder_regex()


def _replace_in_text(text: str, direct_map: Dict[str, str], norm_map: Dict[str, str]) -> str:
    """Replace placeholders in a single text string.

    A single left-to-right pass over the ORIGINAL text: matched placeholders are
    substituted once and the replacement text is never re-scanned. This prevents
    the historical double-fill corruption where a value that itself contains
    `{{...}}` (or a shorter placeholder nested in a longer one) was rewritten.

    Exact caller-supplied raw keys are added as alternatives (longest first) so
    a longer enclosing key such as `<<<a>>>` is preferred over the shorter
    standard match `<<a>>`.
    """
    if not text:
        return text

    alternatives = [re.escape(raw) for raw in sorted(direct_map.keys(), key=len, reverse=True) if raw]
    alternatives.extend(pat.pattern for _name, pat in _PLACEHOLDER_PATTERNS)
    pattern = re.compile("|".join(f"(?:{alt})" for alt in alternatives))

    def _sub(match: "re.Match[str]") -> str:
        raw = match.group(0)
        if raw in direct_map:
            return direct_map[raw]
        # Resolve via the normalized name of the inner placeholder.
        inner = None
        for _raw, norm, _pat in _find_placeholders(raw):
            inner = norm
            break
        if inner is not None:
            if inner in norm_map:
                return norm_map[inner]
            if inner in direct_map:
                return direct_map[inner]
        return raw

    return pattern.sub(_sub, text)


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

    def _resolve_placeholder(raw: str) -> str:
        if raw in direct_map:
            return direct_map[raw]
        for _raw, norm, _pat in _find_placeholders(raw):
            if norm in norm_map:
                return norm_map[norm]
            if norm in direct_map:
                return direct_map[norm]
            break
        return raw

    def replace_in_paragraph(paragraph):
        """Replace placeholders while preserving run-level formatting.

        Matches fully inside a single run are replaced in place (keeping the
        run's formatting and any hyperlink element). Only placeholders that span
        multiple runs fall back to rewriting the paragraph text.
        """
        full_text = paragraph.text
        if not full_text:
            return
        if not _COMBINED_RE.search(full_text):
            return

        runs = paragraph.runs
        if not runs:
            paragraph.text = _replace_in_text(full_text, direct_map, norm_map)
            return

        # Map each run to its [start, end) span within the concatenated text.
        spans = []
        pos = 0
        for run in runs:
            spans.append((pos, pos + len(run.text)))
            pos += len(run.text)

        matches = list(_COMBINED_RE.finditer(full_text))
        # Process right-to-left so earlier offsets stay valid as we mutate runs.
        for match in reversed(matches):
            start, end = match.span()
            replacement = _resolve_placeholder(match.group(0))
            if replacement == match.group(0):
                continue
            first_run_idx = next((i for i, (s, e) in enumerate(spans) if s <= start < e), None)
            last_run_idx = next((i for i, (s, e) in enumerate(spans) if s < end <= e), None)
            if first_run_idx is None or last_run_idx is None:
                continue
            if first_run_idx == last_run_idx:
                run = runs[first_run_idx]
                rs, _re = spans[first_run_idx]
                run.text = run.text[: start - rs] + replacement + run.text[end - rs :]
            else:
                # Placeholder spans runs: keep the first run's formatting, drop
                # the remainder of the first run and the whole spanned tail.
                first_run = runs[first_run_idx]
                first_start = spans[first_run_idx][0]
                first_run.text = first_run.text[: start - first_start] + replacement
                for idx in range(first_run_idx + 1, last_run_idx + 1):
                    rs, _re = spans[idx]
                    if idx == last_run_idx:
                        runs[idx].text = runs[idx].text[end - rs :]
                    else:
                        runs[idx].text = ""

    def scan_paragraphs(paragraphs):
        for para in paragraphs:
            replace_in_paragraph(para)

    def scan_tables(tables):
        for table in tables:
            for row in table.rows:
                for cell in row.cells:
                    scan_paragraphs(cell.paragraphs)
                    # M7: recurse into nested tables
                    if cell.tables:
                        scan_tables(cell.tables)

    # Body paragraphs & tables
    scan_paragraphs(doc.paragraphs)
    scan_tables(doc.tables)

    # Headers & Footers (paragraphs + tables, M6)
    for section in doc.sections:
        if section.header:
            scan_paragraphs(section.header.paragraphs)
            scan_tables(section.header.tables)
        if section.footer:
            scan_paragraphs(section.footer.paragraphs)
            scan_tables(section.footer.tables)

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

    direct_map, norm_map = _build_replacement_map(mapped, spreadsheet=True)

    wb = openpyxl.load_workbook(io.BytesIO(template_bytes))
    for ws in wb.worksheets:
        for row in ws.iter_rows():
            for cell in row:
                if cell.value is None or not isinstance(cell.value, str):
                    continue
                orig = cell.value
                is_formula = cell.data_type == "f" or orig.startswith("=")
                # H2: never rewrite an existing formula's structured references
                # (`Table1[Amount]` looks like a [placeholder] and would be
                # corrupted). Only touch a formula cell when it contains an
                # unambiguous multi-char template placeholder ({{ }}, << >>, __).
                if is_formula and not any(d in orig for d in ("{{", "}}", "<<", ">>", "__")):
                    continue
                new_val = _replace_in_text(orig, direct_map, norm_map)
                if new_val != orig:
                    # H3: if the result would be evaluated as a formula, store it
                    # as literal text so an injected value can never execute.
                    if new_val.startswith("="):
                        cell.value = "'" + new_val
                        cell.data_type = "s"
                    else:
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
