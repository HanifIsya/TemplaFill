"""Selective PII Masker for Zero-Leakage LLM Processing.

Implements the Sanitize -> Store Map -> Call API -> Restore (Unmask) pattern.
Only masks high-entropy, isolated sensitive PII entities:
- NPWP (Indonesian tax identification numbers)
- NIK (Indonesian citizen identification numbers)
- Bank Account Numbers (preceded or labeled by bank/rekening keywords)
- Email Addresses
- Phone Numbers

Explicitly preserves for 100% semantic accuracy:
- Company names (PT/CV/Firma) to preserve client vs vendor roles
- Representative names and titles (e.g. Ir. Bambang Wijaya, M.T. — Direktur Utama)
- Contract numbers, project titles, scopes, and narrative clauses
- Dates, financial amounts, and payment percentages
"""

from __future__ import annotations

import re
from typing import Dict, List, Optional, Tuple


class SelectivePIIMasker:
    """Masks sensitive PII with surrogate tokens before sending to LLM,

    and restores real values on extraction response.
    """

    # Precompiled regex patterns
    _RE_EMAIL = re.compile(
        r"\b[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\b"
    )
    _RE_NPWP_FORMATTED = re.compile(
        r"\b\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}\b"
    )
    _RE_NPWP_16 = re.compile(
        r"\b\d{4}\.\d{4}\.\d{4}\.\d{4}\b"
    )
    _RE_NPWP_PREFIXED = re.compile(
        r"(?i)\b(npwp[:\s]+)(\d{15,16})\b"
    )
    _RE_NIK = re.compile(
        r"(?i)\b((?:nik|no\.?\s*ktp|ktp)(?:\s+[a-zA-Z]+){0,2}[:\s]+)([1-9]\d{15})\b"
    )
    _RE_REKENING = re.compile(
        r"(?i)\b(rekening\s+(?:bank\s+)?[a-zA-Z]{3,12}\s+|rekening\s+|rek\.?\s*(?:bank\s+)?[a-zA-Z]{0,12}\s+|no\.?\s*rek(?:ening)?[:\s]+)(\d{3,5}[-\s]\d{2,5}[-\s]\d{3,8}(?:[-\s]\d{1,4})?|\d{9,18})\b"
    )
    _RE_PHONE_PREFIXED = re.compile(
        r"(?i)\b((?:telepon|telp|hp|wa|whatsapp|handphone|mobile)[:\s]+)(\(?\+?62\)?[\s-]?\d{2,4}[\s-]?\d{3,8}|\(?0\d{2,3}\)?[\s-]?\d{3,8})\b"
    )
    _RE_PHONE_STANDALONE = re.compile(
        r"\b(?:\+62|62|0)8[1-9]\d{1,2}[\s-]?\d{3,4}[\s-]?\d{3,4}\b"
    )

    def __init__(self) -> None:
        self.counters: Dict[str, int] = {
            "NPWP": 0,
            "NIK": 0,
            "REK": 0,
            "EMAIL": 0,
            "PHONE": 0,
        }
        self.entity_to_token: Dict[str, str] = {}
        self.token_to_entity: Dict[str, str] = {}

    def _get_token(self, category: str, original_val: str) -> str:
        clean_val = original_val.strip()
        if clean_val in self.entity_to_token:
            return self.entity_to_token[clean_val]

        self.counters[category] = self.counters.get(category, 0) + 1
        idx = self.counters[category]
        token = f"[TOKEN_{category}_{idx}]"
        self.entity_to_token[clean_val] = token
        self.token_to_entity[token] = clean_val
        return token

    def mask_text(self, text: str) -> Tuple[str, Dict[str, str]]:
        """Masks PII in a single text string."""
        if not text:
            return text, {}

        masked = text

        # 1. Mask Emails
        def _replace_email(m: re.Match) -> str:
            val = m.group(0)
            return self._get_token("EMAIL", val)

        masked = self._RE_EMAIL.sub(_replace_email, masked)

        # 2. Mask Formatted NPWP
        def _replace_npwp_fmt(m: re.Match) -> str:
            val = m.group(0)
            return self._get_token("NPWP", val)

        masked = self._RE_NPWP_FORMATTED.sub(_replace_npwp_fmt, masked)
        masked = self._RE_NPWP_16.sub(_replace_npwp_fmt, masked)

        # 3. Mask Prefixed Unformatted NPWP
        def _replace_npwp_prefixed(m: re.Match) -> str:
            prefix = m.group(1)
            val = m.group(2)
            tok = self._get_token("NPWP", val)
            return f"{prefix}{tok}"

        masked = self._RE_NPWP_PREFIXED.sub(_replace_npwp_prefixed, masked)

        # 4. Mask NIK / KTP
        def _replace_nik(m: re.Match) -> str:
            prefix = m.group(1)
            val = m.group(2)
            tok = self._get_token("NIK", val)
            return f"{prefix}{tok}"

        masked = self._RE_NIK.sub(_replace_nik, masked)

        # 5. Mask Bank Accounts (Rekening)
        def _replace_rek(m: re.Match) -> str:
            prefix = m.group(1)
            val = m.group(2)
            tok = self._get_token("REK", val)
            return f"{prefix}{tok}"

        masked = self._RE_REKENING.sub(_replace_rek, masked)

        # 6. Mask Phone numbers
        def _replace_phone_prefixed(m: re.Match) -> str:
            prefix = m.group(1)
            val = m.group(2)
            tok = self._get_token("PHONE", val)
            return f"{prefix}{tok}"

        masked = self._RE_PHONE_PREFIXED.sub(_replace_phone_prefixed, masked)

        def _replace_phone_standalone(m: re.Match) -> str:
            val = m.group(0)
            # Avoid replacing if it's already a token
            if val.startswith("[TOKEN_"):
                return val
            return self._get_token("PHONE", val)

        masked = self._RE_PHONE_STANDALONE.sub(_replace_phone_standalone, masked)

        return masked, dict(self.token_to_entity)

    def mask_chunks(self, chunks: List[str]) -> Tuple[List[str], Dict[str, str]]:
        """Masks PII across a list of text chunks, preserving entity identity across chunks."""
        masked_chunks: List[str] = []
        for c in chunks:
            masked_c, _ = self.mask_text(c)
            masked_chunks.append(masked_c)
        return masked_chunks, dict(self.token_to_entity)

    def unmask(self, text: Optional[str], unmask_map: Optional[Dict[str, str]] = None) -> Optional[str]:
        """Restores surrogate tokens back to their original real values."""
        if not text:
            return text

        mapping = unmask_map if unmask_map is not None else self.token_to_entity
        if not mapping:
            return text

        result = text
        for token, original in mapping.items():
            clean_token = token.strip("[]")
            # 1. Match [TOKEN_X_Y] with potential space variations
            pattern = re.compile(r"\[\s*" + re.escape(clean_token) + r"\s*\]", re.IGNORECASE)
            result = pattern.sub(original, result)
            # 2. Match token if LLM stripped outer brackets
            if clean_token in result:
                result = result.replace(clean_token, original)

        return result
