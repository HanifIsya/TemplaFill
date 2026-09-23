"""Field mapping engine — Task 1.11.

Maps extracted data (from RAG/Gemini) to template placeholder fields.
Features per ARCHITECTURE.md §7:
 - Exact & fuzzy matching (difflib) between extracted keys and placeholder names
 - Synonym/alias handling (nama ↔ name ↔ full_name)
 - Type formatting (dates, numbers, currency)
 - Tracking of unmapped fields

Usage:
    from app.services.mapping.mapper import map_fields
    from app.services.mapping.parser import parse_template_bytes

    parsed = parse_template_bytes(template_bytes, "template.docx")
    extracted = {"full_name": "John Doe", "invoice_date": "2026-09-23"}
    result = map_fields(extracted, parsed)
    # result.mapped: {placeholder -> value}, result.unmapped: [field_names]
"""

from __future__ import annotations

import difflib
import re
from typing import Dict, List, Optional, Tuple

from pydantic import BaseModel, Field

from app.services.mapping.models import ParsedTemplate

# ---------------------------------------------------------------------------
# Synonym map — bidirectional aliases for common fields (ID/EN)
# ---------------------------------------------------------------------------
_SYNONYMS: Dict[str, List[str]] = {
    "full_name": ["nama_lengkap", "nama", "name", "full_name", "client_name", "customer_name"],
    "name": ["nama", "full_name", "client_name"],
    "first_name": ["nama_depan", "first_name", "given_name"],
    "last_name": ["nama_belakang", "last_name", "family_name"],
    "email": ["email", "e_mail", "mail"],
    "phone": ["phone_number", "phone", "tel", "telepon", "no_hp", "mobile"],
    "phone_number": ["phone", "tel", "telepon"],
    "address": ["alamat", "address", "street"],
    "city": ["kota", "city", "kabupaten"],
    "date": ["tanggal", "date", "invoice_date", "signing_date", "due_date"],
    "invoice_date": ["tanggal_faktur", "invoice_date", "date"],
    "signing_date": ["tanggal_tanda_tangan", "signing_date", "date"],
    "total": ["total_amount", "total", "jumlah", "grand_total", "amount"],
    "total_amount": ["total", "jumlah_total", "grand_total"],
    "amount": ["jumlah", "amount", "total", "nominal"],
    "company": ["perusahaan", "company", "organization", "org"],
    "company_name": ["perusahaan", "company_name", "company"],
    "invoice_number": ["no_faktur", "invoice_number", "invoice_no", "inv_no"],
    "contract_number": ["no_kontrak", "contract_number", "contract_no"],
    "id_number": ["nik", "ktp", "id_number", "no_identitas"],
    "signature": ["tanda_tangan", "signature", "sign"],
}

# Reverse index for quick lookup: alias -> canonical
_ALIAS_TO_CANONICAL: Dict[str, str] = {}
for canonical, aliases in _SYNONYMS.items():
    for alias in aliases:
        alias_norm = alias.lower()
        # Prefer canonical itself if conflict? Keep first
        _ALIAS_TO_CANONICAL.setdefault(alias_norm, canonical)


def _canonicalize(name: str) -> str:
    """Map field name to canonical via synonym table."""
    norm = name.strip().lower().replace(" ", "_").replace("-", "_")
    norm = re.sub(r"__+", "_", norm).strip("_")
    return _ALIAS_TO_CANONICAL.get(norm, norm)


def _fuzzy_match(target: str, candidates: List[str], cutoff: float = 0.7) -> Optional[str]:
    """Find best fuzzy match for target in candidates using difflib."""
    if not candidates:
        return None
    # difflib's get_close_matches uses SequenceMatcher
    matches = difflib.get_close_matches(target, candidates, n=1, cutoff=cutoff)
    return matches[0] if matches else None


def _format_value(key: str, value: str) -> str:
    """Apply type-aware formatting based on key hints.

    - Dates: try to normalize to YYYY-MM-DD if recognizable
    - Numbers/currency: keep as is but strip extra spaces
    """
    if value is None:
        return ""
    val = str(value).strip()
    if not val:
        return val

    # Simple date detection: key contains date
    if "date" in key.lower():
        # Try to handle "15th day of August, 2026" -> "2026-08-15" ? Keep original for now
        # For MVP we just return as is; exhaustive date parsing is future work
        return val

    # Currency/amount: ensure no double spaces
    if any(k in key.lower() for k in ["amount", "total", "price", "nominal"]):
        # Remove extra spaces, keep currency symbols
        return " ".join(val.split())

    return val


class FieldMapping(BaseModel):
    """Single field mapping result."""

    field_name: str
    placeholder: str  # raw placeholder like {{full_name}}
    extracted_key: Optional[str] = None  # which extracted key matched
    mapped_value: Optional[str] = None
    status: str = Field(description="mapped|unmapped|fuzzy|synonym")
    confidence: float = Field(default=1.0, ge=0, le=1)
    location: str = ""


class MappingResult(BaseModel):
    """Full mapping result for a template."""

    parsed_template: ParsedTemplate
    mappings: List[FieldMapping] = Field(default_factory=list)
    mapped: Dict[str, str] = Field(default_factory=dict, description="placeholder raw -> value")
    unmapped: List[str] = Field(default_factory=list, description="field_names with no value")
    # Convenience for generator: normalized field_name -> value
    values_by_field: Dict[str, str] = Field(default_factory=dict)


def map_fields(
    extracted_data: Dict[str, Optional[str]],
    parsed_template: ParsedTemplate,
    *,
    fuzzy_cutoff: float = 0.7,
    format_values: bool = True,
) -> MappingResult:
    """Map extracted key-value pairs to template placeholders.

    Args:
        extracted_data: Dict from extraction pipeline, e.g., {"full_name": "John", "phone": null}
        parsed_template: ParsedTemplate from parser
        fuzzy_cutoff: Threshold for fuzzy matching (0-1)
        format_values: Whether to apply type formatting

    Returns:
        MappingResult with per-field status and dicts for generator.
    """
    # Normalize extracted keys: lower, strip, canonicalize for alias search
    # Keep both original normalized and canonical forms
    normalized_extracted: Dict[str, Optional[str]] = {}
    canonical_to_original: Dict[str, str] = {}
    for k, v in extracted_data.items():
        norm = re.sub(r"[\s.\-]+", "_", k.strip()).strip("_").lower()
        norm = re.sub(r"__+", "_", norm)
        normalized_extracted[norm] = v
        # Also store canonical mapping if alias exists
        can = _canonicalize(norm)
        canonical_to_original[can] = norm

    # Also build set of all extracted normalized keys for fuzzy
    extracted_keys = list(normalized_extracted.keys())

    mappings: List[FieldMapping] = []
    mapped: Dict[str, str] = {}
    values_by_field: Dict[str, str] = {}
    unmapped: List[str] = []

    for field in parsed_template.fields:
        tgt = field.field_name  # already normalized lower
        tgt_can = _canonicalize(tgt)

        # Try exact normalized match
        matched_key: Optional[str] = None
        status = "unmapped"
        confidence = 0.0
        value: Optional[str] = None

        if tgt in normalized_extracted:
            matched_key = tgt
            value = normalized_extracted[tgt]
            status = "mapped"
            confidence = 1.0
        elif tgt_can in canonical_to_original:
            # Synonym via canonical
            alias_norm = canonical_to_original[tgt_can]
            # There may be multiple aliases that map to same canonical; find one that exists
            # Check all extracted keys that canonicalize to same
            for ek in extracted_keys:
                if _canonicalize(ek) == tgt_can and normalized_extracted.get(ek) is not None:
                    matched_key = ek
                    value = normalized_extracted[ek]
                    status = "synonym"
                    confidence = 0.9
                    break
            # If alias exists but value is None, treat as not found
            if matched_key is None:
                # Try direct canonical lookup
                if tgt_can in normalized_extracted:
                    matched_key = tgt_can
                    value = normalized_extracted[tgt_can]
                    status = "mapped"
                    confidence = 1.0
        # Try fuzzy across extracted keys
        if matched_key is None:
            fuzzy = _fuzzy_match(tgt, extracted_keys, cutoff=fuzzy_cutoff)
            if fuzzy is not None and normalized_extracted.get(fuzzy) is not None:
                matched_key = fuzzy
                value = normalized_extracted[fuzzy]
                status = "fuzzy"
                # Compute similarity for confidence
                confidence = difflib.SequenceMatcher(None, tgt, fuzzy).ratio() * 0.95
            elif fuzzy is not None and normalized_extracted.get(fuzzy) is None:
                # Fuzzy matched but value is None -> treat as unmapped
                matched_key = None

        # Handle value presence and formatting
        final_value: Optional[str] = None
        if matched_key is not None:
            raw_val = value
            if raw_val is None or (isinstance(raw_val, str) and not raw_val.strip()):
                # Extracted key exists but no value
                status = "unmapped"
                confidence = 0.0
                unmapped.append(field.field_name)
            else:
                final_value = _format_value(field.field_name, raw_val) if format_values else str(raw_val)
                mapped[field.placeholder] = final_value
                values_by_field[field.field_name] = final_value
                # Also map normalized placeholder -> value for flexible generator
                values_by_field[field.normalized_placeholder] = final_value
        else:
            unmapped.append(field.field_name)
            final_value = None
            status = "unmapped"
            confidence = 0.0

        mappings.append(
            FieldMapping(
                field_name=field.field_name,
                placeholder=field.placeholder,
                extracted_key=matched_key,
                mapped_value=final_value,
                status=status,
                confidence=confidence,
                location=field.location,
            )
        )

    return MappingResult(
        parsed_template=parsed_template,
        mappings=mappings,
        mapped=mapped,
        unmapped=unmapped,
        values_by_field=values_by_field,
    )


# Helper for pipeline: extract -> map in one step
def map_extracted_to_template(
    extracted: Dict[str, Optional[str]],
    template_bytes: bytes,
    template_filename: str,
    **kwargs,
) -> MappingResult:
    """Convenience: parse template bytes and map in one call."""
    from app.services.mapping.parser import parse_template_bytes

    parsed = parse_template_bytes(template_bytes, template_filename)
    return map_fields(extracted, parsed, **kwargs)


__all__ = ["map_fields", "map_extracted_to_template", "MappingResult", "FieldMapping", "_canonicalize"]
