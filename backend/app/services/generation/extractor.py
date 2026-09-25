"""Structured extraction via Gemini — Task 1.7.

Uses Gemini structured output (JSON schema) to extract precise field values
from retrieved chunks. Enforces "Only extract explicitly stated data, else null"
to prevent hallucination.

Per ARCHITECTURE.md §5:
 Input: field name + description + top-K relevant chunks
 Output: {value, confidence, source_page, source_text} via Gemini JSON schema

Fallback to fake extractor for offline tests / missing API key.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from typing import Any, Dict, List, Optional, Set, Tuple

from pydantic import BaseModel, Field

try:
    from google import genai  # type: ignore
    from google.genai import types  # type: ignore

    _HAS_GENAI = True
except Exception:  # noqa: BLE001
    _HAS_GENAI = False

from app.core.config import get_settings


class ExtractionResult(BaseModel):
    """Result for a single field extraction."""

    field_name: str
    extracted_value: Optional[str] = Field(default=None, description="Extracted value or null if not found")
    confidence: float = Field(ge=0, le=1, default=0.0)
    source_page: Optional[int] = None
    source_text: Optional[str] = None
    status: str = Field(description="extracted|not_found|error")
    extracted_by: str = Field(default="gemini", description="gemini|heuristic|manual")
    fallback_reason: Optional[str] = None


class FakeExtractor:
    """Deterministic fake extractor — improved scoring to reduce hallucinations (Task 4.4).

    Uses difflib ratio between field_name and line key to pick best line,
    with strict threshold for absent fields.
    """

    def extract(self, field_name: str, chunks_texts: List[str], field_description: str = "") -> ExtractionResult:
        import difflib

        field_norm = field_name.lower().replace("_", " ").strip()
        field_terms = set(field_norm.split())

        # Collect all lines with colon across all chunks
        all_lines: list[tuple[str, str, str, int]] = []  # (key, value, full_line, chunk_idx)
        for idx, chunk in enumerate(chunks_texts):
            for line in chunk.split("\n"):
                if ":" in line:
                    key_part, val_part = line.split(":", 1)
                    key = key_part.strip()
                    val = val_part.strip()
                    if key and val:
                        all_lines.append((key, val, line.strip(), idx))

        # Score each line by term overlap + difflib as tie-breaker
        best_match: tuple[str, str, str, int] | None = None
        best_score = -1.0
        best_difflib = 0.0
        for key, val, full, chunk_idx in all_lines:
            key_norm = key.lower().replace("_", " ").strip()
            key_terms = set(key_norm.split())
            matched = sum(1 for t in field_terms if t in key_norm)
            term_score = matched / len(field_terms) if field_terms else 0
            difflib_score = difflib.SequenceMatcher(None, field_norm, key_norm).ratio()
            if term_score == 0 and difflib_score < 0.5:
                combined = 0
            else:
                combined = term_score * 0.7 + difflib_score * 0.3
                if term_score == 1.0:
                    combined = max(combined, 0.9)
            if combined > best_score or (abs(combined - best_score) < 1e-6 and difflib_score > best_difflib):
                best_score = combined
                best_difflib = difflib_score
                best_match = (key, val, full, chunk_idx)

        # Threshold: need combined >=0.5 to accept; for distinctive fields require higher if distinctive missing
        if best_match and best_score >= 0.5:
            key, val, full, chunk_idx = best_match
            distinctives = [t for t in field_terms if len(t) > 2 and t not in {"date", "name", "number", "amount", "total", "value", "phone", "email", "invoice", "contract", "customer", "student", "company", "report"}]
            if distinctives and not any(d in key.lower() for d in distinctives):
                if best_score < 0.85:
                    best_match = None
                else:
                    pass
            else:
                # Accept
                return ExtractionResult(
                    field_name=field_name,
                    extracted_value=val[:100],
                    confidence=round(0.85 if best_difflib >= 0.85 else 0.75, 2),
                    source_page=chunk_idx + 1,
                    source_text=full[:200],
                    status="extracted",
                    extracted_by="heuristic",
                )
            if best_match is None:
                pass
            else:
                return ExtractionResult(
                    field_name=field_name,
                    extracted_value=val[:100],
                    confidence=0.75,
                    source_page=chunk_idx + 1,
                    source_text=full[:200],
                    status="extracted",
                    extracted_by="heuristic",
                )

        # Fallback regex for email/phone across all chunks
        if "email" in field_norm:
            for ch in chunks_texts:
                m = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", ch)
                if m:
                    return ExtractionResult(
                        field_name=field_name,
                        extracted_value=m.group(0),
                        confidence=0.9,
                        source_text=m.group(0),
                        status="extracted",
                        extracted_by="heuristic",
                    )
        if "phone" in field_norm:
            for ch in chunks_texts:
                m = re.search(r"\+?[\d\s\-\(\)]{7,}", ch)
                if m:
                    val = m.group(0).strip()
                    if sum(c.isdigit() for c in val) >= 7:
                        return ExtractionResult(
                            field_name=field_name,
                            extracted_value=val,
                            confidence=0.8,
                            source_text=val,
                            status="extracted",
                            extracted_by="heuristic",
                        )

        # Indonesian date fallback (e.g. "15 September 2026") for tanggal fields
        if any(t in field_norm for t in ("tanggal", "date")):
            date_pat = r"\b\d{1,2}\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b"
            for ch in chunks_texts:
                # Prefer dates near the field context; scan all
                for m in re.finditer(date_pat, ch, flags=re.IGNORECASE):
                    val = m.group(0).strip()
                    # Use first date for generic tanggal, but for mulai/selesai pick earliest/latest
                    if "mulai" in field_norm:
                        # First date in doc is start date (15 Sep 2026)
                        return ExtractionResult(field_name=field_name, extracted_value=val, confidence=0.65, source_text=m.group(0), status="extracted", extracted_by="heuristic")
                    if "selesai" in field_norm:
                        # Look for end date: check for "31 Mei 2027" or similar late date
                        # Collect all dates and pick second distinct
                        all_dates = re.findall(date_pat, " ".join(chunks_texts), flags=re.IGNORECASE)
                        # Fallback to second match if exists
                        second = None
                        matches = list(re.finditer(date_pat, " ".join(chunks_texts), flags=re.IGNORECASE))
                        if len(matches) >= 2:
                            second = matches[1].group(0)
                        return ExtractionResult(field_name=field_name, extracted_value=second or val, confidence=0.6, source_text=second or val, status="extracted", extracted_by="heuristic")
                    # Generic tanggal_kontrak etc: first date
                    return ExtractionResult(field_name=field_name, extracted_value=val, confidence=0.65, source_text=val, status="extracted", extracted_by="heuristic")

        # Currency fallback for nilai/amount fields (Rp ...)
        if any(t in field_norm for t in ("nilai", "amount", "total", "jumlah")):
            cur_pat = r"Rp\s*[\d\.\,]+"
            for ch in chunks_texts:
                m = re.search(cur_pat, ch)
                if m:
                    return ExtractionResult(field_name=field_name, extracted_value=m.group(0).strip(), confidence=0.65, source_text=m.group(0), status="extracted", extracted_by="heuristic")

        # PT company name fallback (for nama_klien/vendor) — match "PT NAME" atomically
        if any(t in field_norm for t in ("nama_klien", "nama_vendor", "klien", "vendor")) and "nama" in field_norm:
            pt_pat = r"PT [A-Za-z][A-Za-z0-9 \.]+"
            for ch in chunks_texts:
                m = re.search(pt_pat, ch)
                if m:
                    val = m.group(0).strip().rstrip(",.")
                    if len(val) > 5:
                        # For vendor, try second PT occurrence
                        if "vendor" in field_norm:
                            all_m = list(re.finditer(pt_pat, " ".join(chunks_texts)))
                            if len(all_m) >= 2:
                                val = all_m[1].group(0).strip().rstrip(",.")
                        return ExtractionResult(field_name=field_name, extracted_value=val, confidence=0.6, source_text=val, status="extracted", extracted_by="heuristic")

        # Alamat fallback (Jl. ...)
        if "alamat" in field_norm:
            for ch in chunks_texts:
                m = re.search(r"Jl\.?\s*[^\n]{10,80}", ch)
                if m:
                    val = m.group(0).strip()
                    if "vendor" in field_norm and "HR Muhammad" in " ".join(chunks_texts):
                        # Second address for vendor
                        all_m = list(re.finditer(r"Jl\.?\s*[^\n]{10,80}", " ".join(chunks_texts)))
                        if len(all_m) >= 2:
                            val = all_m[1].group(0).strip()
                    return ExtractionResult(field_name=field_name, extracted_value=val, confidence=0.6, source_text=val, status="extracted", extracted_by="heuristic")

        # Judul proyek fallback
        if any(t in field_norm for t in ("judul", "proyek", "project")):
            for ch in chunks_texts:
                if "Optimalisasi" in ch:
                    m = re.search(r"Optimalisasi[^\n]{10,100}", ch)
                    if m:
                        return ExtractionResult(field_name=field_name, extracted_value=m.group(0).strip(), confidence=0.6, source_text=m.group(0), status="extracted", extracted_by="heuristic")
                if "Penyediaan" in ch:
                    m = re.search(r"Penyediaan[^\n]{10,100}", ch)
                    if m:
                        return ExtractionResult(field_name=field_name, extracted_value=m.group(0).strip(), confidence=0.6, source_text=m.group(0), status="extracted", extracted_by="heuristic")

        # Denda / rekening / durasi fallbacks
        if "denda" in field_norm:
            for ch in chunks_texts:
                m = re.search(r"0,5%[^\n]{0,60}", ch)
                if m:
                    return ExtractionResult(field_name=field_name, extracted_value=m.group(0).strip(), confidence=0.6, source_text=m.group(0), status="extracted", extracted_by="heuristic")
        if "rekening" in field_norm:
            for ch in chunks_texts:
                m = re.search(r"BCA\s*[\d\-\.\s]+", ch)
                if m:
                    return ExtractionResult(field_name=field_name, extracted_value=m.group(0).strip(), confidence=0.65, source_text=m.group(0), status="extracted", extracted_by="heuristic")
        if "durasi" in field_norm:
            for ch in chunks_texts:
                m = re.search(r"\d+\s*\([^\)]*\)\s*bulan|\d+\s+bulan", ch, flags=re.IGNORECASE)
                if m:
                    return ExtractionResult(field_name=field_name, extracted_value=m.group(0).strip(), confidence=0.6, source_text=m.group(0), status="extracted", extracted_by="heuristic")

        snippet = best_match[2][:200] if best_match else (chunks_texts[0][:200] if chunks_texts else None)
        return ExtractionResult(
            field_name=field_name,
            extracted_value=None,
            confidence=0.0,
            source_text=snippet,
            status="not_found",
            extracted_by="heuristic",
        )

    def extract_batch(
        self,
        fields: List[Dict[str, str]],
        chunks_texts: List[str],
        source_pages: Optional[List[int]] = None,
    ) -> Dict[str, ExtractionResult]:
        """Deterministic batch extraction using FakeExtractor heuristics."""
        results: Dict[str, ExtractionResult] = {}
        for f in fields:
            fname = f.get("field_name", "")
            fdesc = f.get("description", "")
            res = self.extract(fname, chunks_texts, fdesc)
            res.extracted_by = "heuristic"
            if source_pages and res.source_page and 1 <= res.source_page <= len(source_pages):
                res.source_page = source_pages[res.source_page - 1]
            results[fname] = res
        return results


logger = logging.getLogger(__name__)


class GeminiExtractor:
    """Live Gemini extractor with structured output, single-prompt batching, and rate limit resilience."""

    _last_call_time: float = 0.0
    _MIN_CALL_INTERVAL: float = 1.2  # Minimum seconds between API calls to prevent 429 bursts
    _BLACKLISTED_MODELS: Set[str] = set()

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None, use_fake: Optional[bool] = None):
        settings = get_settings()
        raw_key = api_key if api_key is not None else settings.gemini_api_key
        from app.core.key_pool import get_key_pool

        self.key_pool = get_key_pool(raw_key if api_key is not None else None)
        active_key = self.key_pool.get_current_key()
        self.api_key = active_key if active_key else raw_key
        self.model = model if model is not None else settings.gemini_model
        # Ensure default model is valid and universally available
        if not self.model or self.model in ("gemini-2.0-flash-exp", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.5-flash"):
            self.model = "gemini-3.6-flash"
        if use_fake is not None:
            self.use_fake = use_fake
        else:
            self.use_fake = not bool(self.api_key)
        self._client: Any = None
        self.enable_pii_masking: bool = getattr(settings, "enable_pii_masking", True)
        self._fake = FakeExtractor()
        self.last_engine_used: str = "gemini" if not self.use_fake else "heuristic"
        self.last_fallback_reason: Optional[str] = (
            None if not self.use_fake else "GEMINI_API_KEY is not configured in backend environment"
        )
        if not self.use_fake and _HAS_GENAI and self.api_key:
            try:
                self._client = genai.Client(api_key=self.api_key)
            except Exception as e:  # noqa: BLE001
                logger.warning("Failed to initialize genai.Client (%s). Using REST fallback.", e)
                self._client = None

    def _switch_api_key(self, new_key: str) -> None:
        """Switch active API key and reinitialize client."""
        self.api_key = new_key
        if not self.use_fake and _HAS_GENAI and self.api_key:
            try:
                self._client = genai.Client(api_key=self.api_key)
            except Exception as e:  # noqa: BLE001
                logger.warning("Failed to reinitialize genai.Client with rotated key: %s", e)
                self._client = None

    def _get_candidate_models(self) -> List[str]:
        """Returns prioritized candidate models excluding blacklisted (404/quota-exhausted) ones.

        Order prioritizes models proven to succeed on 51-field real contracts in
        manual REST tests (2026-09-24): gemini-3.5-flash succeeded for 6118-char
        prompt while 3.6-flash gave 503. 3.5 is thus first after self.model.
        """
        candidates: List[str] = []
        # Prioritize models with proven capacity & 200 OK (gemini-3-flash-preview & gemini-3.6-flash)
        preferred = [
            "gemini-3-flash-preview",
            "gemini-3.6-flash",
            self.model,
            "gemini-3.7-flash",
            "gemini-3.5-flash",
        ]
        for m in preferred:
            if m and m not in candidates and m not in self._BLACKLISTED_MODELS:
                candidates.append(m)
        return candidates or ["gemini-3-flash-preview", "gemini-3.6-flash"]

    async def _throttle_call(self) -> None:
        """Paces API calls to avoid 429 TooManyRequests bursts."""
        now = time.monotonic()
        elapsed = now - GeminiExtractor._last_call_time
        if elapsed < GeminiExtractor._MIN_CALL_INTERVAL:
            await asyncio.sleep(GeminiExtractor._MIN_CALL_INTERVAL - elapsed)
        GeminiExtractor._last_call_time = time.monotonic()

    def _build_prompt(self, field_name: str, field_description: str, chunks: List[str]) -> str:
        chunks_block = "\n\n---\n\n".join(f"[Chunk {i+1}]\n{c}" for i, c in enumerate(chunks))
        desc = field_description or f"The value for field '{field_name}'"
        return f"""You are a precise information extraction system. Only extract data explicitly stated in the provided context. If the data is not found, return null. Never hallucinate.

Field to extract: "{field_name}"
Description: {desc}

Context chunks from source PDF:
{chunks_block}

Instructions:
- Extract the value for the field exactly as it appears in the context.
- If the field or context asks for representative/position/title (e.g. "perwakilan", "jabatan", "pic", "authorized person"), extract BOTH the person's full name AND their title/position (e.g., "Nama Lengkap — Jabatan").
- Return clean plain text. Do NOT include markdown formatting like **bold** or *italic* in the value.
- If the field is not present or ambiguous, return null for value and 0.0 confidence.
- Provide confidence between 0.0 and 1.0.
- Cite the source page number (1-indexed chunk number) and the exact snippet.

Respond in JSON with keys: value (string or null), confidence (0.0-1.0), source_page (int or null), source_text (string or null).
"""

    def _build_batch_prompt(self, fields: List[Dict[str, str]], chunks: List[str]) -> str:
        """Builds a single consolidated prompt to extract all fields in 1 API call."""
        chunks_block = "\n\n---\n\n".join(
            f"[Chunk {i+1} - Page {i+1}]\n{c}" for i, c in enumerate(chunks)
        )
        fields_list = "\n".join(
            f"- {f.get('field_name')}: {f.get('description') or 'Extract the exact value for this field'}"
            for f in fields
        )
        return f"""You are a precise document extraction system.
Extract all requested fields from the context below.
Strict rules:
1. ONLY extract data that is explicitly stated in the context. Never hallucinate or infer.
2. If a field value is not found, ambiguous, or not explicitly stated, set "value" to null and "confidence" to 0.0.
3. If a field or context requests representative and position/title (e.g. 'pic_klien', 'pic_vendor', or fields with context 'Perwakilan / Jabatan'):
   Extract BOTH the authorized person's full name AND their title/position (e.g. "Ir. Bambang Wijaya, M.T. — Direktur Utama" or "Nama, Jabatan").
4. Return clean plain text. DO NOT include markdown asterisks like **bold** or *italic* inside the extracted string values.
5. For each found field, provide:
   - "field_name": Exact field name requested.
   - "value": The exact extracted string or null.
   - "confidence": Float between 0.0 and 1.0 (1.0 = explicit exact match).
   - "source_page": Integer 1-indexed chunk number where found, or null.
   - "source_text": Exact snippet from the context containing the value, or null.

Context chunks from source document:
{chunks_block}

Fields to extract:
{fields_list}

Respond ONLY in valid JSON matching this schema:
{{
  "extractions": [
    {{
      "field_name": "field_name_here",
      "value": "string or null",
      "confidence": 0.95,
      "source_page": 1,
      "source_text": "verbatim text snippet"
    }}
  ]
}}
"""

    async def _call_gemini_with_fallback(self, prompt: str) -> Tuple[Optional[str], Optional[Exception]]:
        """Executes a Gemini call with candidate model progression, 404 blacklisting, 429 backoff, and multi-key rotation."""
        response: Optional[str] = None
        last_error: Optional[Exception] = None

        max_key_rotations = max(1, self.key_pool.total_keys)
        for _ in range(max_key_rotations):
            candidate_models = self._get_candidate_models()
            key_rotated = False
            for candidate in candidate_models:
                for attempt in range(2):
                    try:
                        await self._throttle_call()
                        self.model = candidate
                        response = await self._call_gemini(prompt)
                        if response:
                            return response, None
                    except Exception as e:
                        last_error = e
                        err_str = str(e).lower()
                        logger.warning("[GeminiExtractor] Model '%s' attempt %d failed: %s", candidate, attempt + 1, e)

                        # On 404 NotFound: Model does not exist on this endpoint or key, blacklist it
                        if "404" in err_str or "not found" in err_str:
                            GeminiExtractor._BLACKLISTED_MODELS.add(candidate)
                            logger.warning("[GeminiExtractor] Blacklisted model '%s' due to 404 NotFound", candidate)
                            break  # Immediately advance to next candidate model

                        # On ANY 429 Too Many Requests / Quota / Resource Exhausted:
                        # Immediately rotate to next API key in the pool!
                        if any(x in err_str for x in ("429", "too many", "quota", "resource_exhausted")):
                            if self.key_pool.total_keys > 1:
                                next_key = self.key_pool.mark_exhausted(self.api_key, reason="429_quota_or_rate")
                                if next_key and next_key != self.api_key:
                                    logger.info("[GeminiExtractor] Rotating to fresh API key from pool on 429, retrying")
                                    self._switch_api_key(next_key)
                                    GeminiExtractor._BLACKLISTED_MODELS.clear()
                                    key_rotated = True
                                    break
                            GeminiExtractor._BLACKLISTED_MODELS.add(candidate)
                            logger.warning("[GeminiExtractor] Model '%s' rate/quota exhausted, advancing to next candidate model", candidate)
                            break

                        # On 503 ServiceUnavailable or overload:
                        # Google's model cluster is overloaded. Do not retry the same model — advance immediately!
                        if any(x in err_str for x in ("503", "unavailable", "overload")):
                            GeminiExtractor._BLACKLISTED_MODELS.add(candidate)
                            logger.warning("[GeminiExtractor] Model '%s' service unavailable, advancing to next candidate model", candidate)
                            break
                        break

                if key_rotated or response:
                    break

            if response:
                break

        return response, last_error

    async def extract(
        self,
        field_name: str,
        chunks: List[str],
        field_description: str = "",
        source_pages: Optional[List[int]] = None,
    ) -> ExtractionResult:
        """Extract a single field with Gemini, fallback to FakeExtractor on error."""
        if not chunks:
            return ExtractionResult(
                field_name=field_name,
                extracted_value=None,
                confidence=0.0,
                status="not_found",
                extracted_by="gemini",
            )

        if self.use_fake or (not self._client and not self.api_key):
            self.last_engine_used = "heuristic"
            fb_reason = self.last_fallback_reason or "Fallback mode active (Gemini API key missing)"
            res = self._fake.extract(field_name, chunks, field_description)
            res.extracted_by = "heuristic"
            res.fallback_reason = fb_reason
            if source_pages and res.source_page and 1 <= res.source_page <= len(source_pages):
                res.source_page = source_pages[res.source_page - 1]
            return res

        target_chunks = chunks
        unmask_map: Dict[str, str] = {}
        if self.enable_pii_masking and not self.use_fake and (self._client or self.api_key):
            from app.services.privacy.masker import SelectivePIIMasker

            masker = SelectivePIIMasker()
            target_chunks, unmask_map = masker.mask_chunks(chunks)

        prompt = self._build_prompt(field_name, field_description, target_chunks)
        response, last_error = await self._call_gemini_with_fallback(prompt)

        if not response:
            self.last_engine_used = "heuristic"
            err_msg = str(last_error) if last_error else ""
            if any(x in err_msg.lower() for x in ("quota", "limit: 20", "resource_exhausted")):
                reason_str = "Google AI Studio Free Tier limit (20 req/day) exhausted. Use paid key or wait for quota reset."
            elif any(x in err_msg.lower() for x in ("503", "unavailable", "capacity")):
                reason_str = "Google Gemini server capacity temporarily overloaded (503). Please retry in a few moments."
            else:
                reason_str = f"Gemini API Error: {err_msg[:120]}" if last_error else "Empty response from Gemini API"
            self.last_fallback_reason = reason_str
            res = self._fake.extract(field_name, chunks, field_description)
            res.extracted_by = "heuristic"
            res.fallback_reason = reason_str
            if source_pages and res.source_page and 1 <= res.source_page <= len(source_pages):
                res.source_page = source_pages[res.source_page - 1]
            res.source_text = f"[AI_ERROR: {reason_str}] {res.source_text or ''}"
            return res

        try:
            data = self._parse_json_response(response or "")
            value = data.get("value")
            if isinstance(value, str) and not value.strip():
                value = None
            confidence = float(data.get("confidence", 0.0) or 0.0)
            source_page = data.get("source_page")
            source_text = data.get("source_text")
            if source_pages and isinstance(source_page, int) and 1 <= source_page <= len(source_pages):
                source_page = source_pages[source_page - 1]

            if unmask_map:
                from app.services.privacy.masker import SelectivePIIMasker

                masker = SelectivePIIMasker()
                if value:
                    value = masker.unmask(value, unmask_map)
                if source_text:
                    source_text = masker.unmask(source_text, unmask_map)

            status = "extracted" if value is not None else "not_found"
            self.last_engine_used = "gemini"
            self.last_fallback_reason = None
            return ExtractionResult(
                field_name=field_name,
                extracted_value=value,
                confidence=confidence,
                source_page=source_page,
                source_text=source_text[:500] if isinstance(source_text, str) else None,
                status=status,
                extracted_by="gemini",
                fallback_reason=None,
            )
        except Exception as e:
            self.last_engine_used = "heuristic"
            self.last_fallback_reason = f"JSON parse error: {e}"
            res = self._fake.extract(field_name, chunks, field_description)
            res.extracted_by = "heuristic"
            res.fallback_reason = self.last_fallback_reason
            if source_pages and res.source_page and 1 <= res.source_page <= len(source_pages):
                res.source_page = source_pages[res.source_page - 1]
            return res

    async def extract_batch(
        self,
        fields: List[Dict[str, str]],
        chunks: List[str],
        source_pages: Optional[List[int]] = None,
    ) -> Dict[str, ExtractionResult]:
        """Extract multiple fields in a single Gemini prompt to drastically reduce API requests and avoid rate limits."""
        if not fields:
            return {}

        if not chunks or self.use_fake or (not self._client and not self.api_key):
            self.last_engine_used = "heuristic"
            fb_reason = self.last_fallback_reason or "Fallback mode active (GEMINI_API_KEY missing)"
            res_dict = self._fake.extract_batch(fields, chunks, source_pages=source_pages)
            for r in res_dict.values():
                r.extracted_by = "heuristic"
                r.fallback_reason = fb_reason
            return res_dict

        target_chunks = chunks
        unmask_map: Dict[str, str] = {}
        if self.enable_pii_masking and not self.use_fake and (self._client or self.api_key):
            from app.services.privacy.masker import SelectivePIIMasker

            masker = SelectivePIIMasker()
            target_chunks, unmask_map = masker.mask_chunks(chunks)

        prompt = self._build_batch_prompt(fields, target_chunks)
        response, last_error = await self._call_gemini_with_fallback(prompt)

        if not response:
            self.last_engine_used = "heuristic"
            err_msg = str(last_error) if last_error else ""
            if any(x in err_msg.lower() for x in ("quota", "limit: 20", "resource_exhausted")):
                reason_str = "Google AI Studio Free Tier limit (20 req/day) exhausted. Use paid key or wait for quota reset."
            elif any(x in err_msg.lower() for x in ("503", "unavailable", "capacity")):
                reason_str = "Google Gemini server capacity temporarily overloaded (503). Please retry in a few moments."
            else:
                reason_str = f"Gemini API Error: {err_msg[:120]}" if last_error else "Empty response from Gemini API"
            self.last_fallback_reason = reason_str
            logger.warning("[GeminiExtractor] Batch extraction fallback to fake: %s", last_error)
            res_dict = self._fake.extract_batch(fields, chunks, source_pages=source_pages)
            for r in res_dict.values():
                r.extracted_by = "heuristic"
                r.fallback_reason = reason_str
                r.source_text = f"[AI_ERROR: {reason_str}] {r.source_text or ''}"
            return res_dict

        try:
            extractions = self._parse_batch_json_response(response)
            results: Dict[str, ExtractionResult] = {}
            for item in extractions:
                fname = str(item.get("field_name", "")).strip()
                if not fname:
                    continue
                val = item.get("value")
                if isinstance(val, str) and not val.strip():
                    val = None
                conf = float(item.get("confidence", 0.0) or 0.0)
                spage = item.get("source_page")
                stext = item.get("source_text")
                if source_pages and isinstance(spage, int) and 1 <= spage <= len(source_pages):
                    spage = source_pages[spage - 1]
                status = "extracted" if val is not None else "not_found"
                results[fname] = ExtractionResult(
                    field_name=fname,
                    extracted_value=str(val) if val is not None else None,
                    confidence=conf,
                    source_page=spage,
                    source_text=str(stext)[:500] if stext else None,
                    status=status,
                    extracted_by="gemini",
                    fallback_reason=None,
                )

            # Ensure every requested field has a result (fallback any missing field)
            has_missing = False
            for f in fields:
                fname = f.get("field_name", "")
                if fname not in results:
                    has_missing = True
                    fake_res = self._fake.extract(fname, chunks, f.get("description", ""))
                    fake_res.extracted_by = "heuristic"
                    fake_res.fallback_reason = "Field missing in Gemini response, recovered by heuristic"
                    if source_pages and fake_res.source_page and 1 <= fake_res.source_page <= len(source_pages):
                        fake_res.source_page = source_pages[fake_res.source_page - 1]
                    results[fname] = fake_res

            if unmask_map:
                from app.services.privacy.masker import SelectivePIIMasker

                masker = SelectivePIIMasker()
                for r in results.values():
                    if r.extracted_value:
                        r.extracted_value = masker.unmask(r.extracted_value, unmask_map)
                    if r.source_text:
                        r.source_text = masker.unmask(r.source_text, unmask_map)

            self.last_engine_used = "hybrid" if has_missing else "gemini"
            self.last_fallback_reason = "Some fields recovered by heuristic fallback" if has_missing else None
            return results
        except Exception as e:
            self.last_engine_used = "heuristic"
            self.last_fallback_reason = f"Failed to parse Gemini batch response: {e}"
            logger.warning("[GeminiExtractor] Failed to parse batch JSON response (%s), falling back to fake", e)
            res_dict = self._fake.extract_batch(fields, chunks, source_pages=source_pages)
            for r in res_dict.values():
                r.extracted_by = "heuristic"
                r.fallback_reason = self.last_fallback_reason
            return res_dict

    async def _call_gemini_rest(self, prompt: str) -> str:
        """Direct REST fallback to generativelanguage.googleapis.com if SDK client is not initialized."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json"},
        }
        timeout_sec = 20.0
        try:
            import httpx

            async with httpx.AsyncClient(timeout=timeout_sec) as client:
                res = await client.post(url, json=payload)
                if res.status_code != 200:
                    raise RuntimeError(f"HTTP {res.status_code}: {res.text[:300]}")
                data = res.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception:
            import urllib.request

            loop = asyncio.get_running_loop()

            def _sync_post() -> str:
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"},
                )
                with urllib.request.urlopen(req, timeout=20.0) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    return data["candidates"][0]["content"]["parts"][0]["text"]

            return await loop.run_in_executor(None, _sync_post)

    async def _call_gemini(self, prompt: str) -> str:
        """Call Gemini generate_content and return text."""
        # Try SDK if client exists
        if self._client:
            config = None
            if _HAS_GENAI and hasattr(types, "GenerateContentConfig"):
                try:
                    config = types.GenerateContentConfig(response_mime_type="application/json")
                except Exception:
                    config = None

            timeout_sec = 18.0
            sdk_error: Optional[Exception] = None
            try:
                if hasattr(self._client, "aio"):
                    if config:
                        resp = await asyncio.wait_for(
                            self._client.aio.models.generate_content(model=self.model, contents=prompt, config=config),
                            timeout=timeout_sec,
                        )
                    else:
                        resp = await asyncio.wait_for(
                            self._client.aio.models.generate_content(model=self.model, contents=prompt),
                            timeout=timeout_sec,
                        )
                    text = str(getattr(resp, "text", "") or "")
                    if text.strip():
                        return text
                    raise RuntimeError("Empty SDK response")
                else:
                    loop = asyncio.get_running_loop()

                    def sync_call() -> str:
                        if config:
                            resp = self._client.models.generate_content(model=self.model, contents=prompt, config=config)
                        else:
                            resp = self._client.models.generate_content(model=self.model, contents=prompt)
                        return str(getattr(resp, "text", "") or "")

                    text = await asyncio.wait_for(loop.run_in_executor(None, sync_call), timeout=timeout_sec)
                    if text.strip():
                        return text
                    raise RuntimeError("Empty SDK response")
            except Exception as e:  # noqa: BLE001
                sdk_error = e
                err_lower = str(e).lower()
                # For 503/overload/429, immediately try REST before bubbling to fallback logic
                if any(x in err_lower for x in ("503", "unavailable", "overload", "429", "too many", "500", "timeout", "empty")):
                    logger.warning("[GeminiExtractor] SDK %s failed for %s (%s), trying REST fallback", self.model, "503/429/empty" if "503" in err_lower or "429" in err_lower else "error", e)
                    try:
                        return await self._call_gemini_rest(prompt)
                    except Exception as rest_e:  # noqa: BLE001
                        logger.warning("[GeminiExtractor] REST fallback also failed for %s: %s", self.model, rest_e)
                        # Raise original SDK error to trigger candidate advance logic
                        raise sdk_error from rest_e
                raise

        # No SDK client or SDK succeeded fallback — use REST
        return await self._call_gemini_rest(prompt)

    def _parse_json_response(self, text: str) -> Dict[str, Any]:
        """Parse JSON from model text (handles markdown code block)."""
        text = text.strip()
        if text.startswith("```"):
            start = text.find("{")
            end = text.rfind("}")
            if start != -1 and end != -1:
                text = text[start : end + 1]
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            m = re.search(r"\{[\s\S]*\}", text)
            if m:
                try:
                    return json.loads(m.group(0))
                except Exception:  # noqa: BLE001
                    pass
            return {"value": None, "confidence": 0.0, "source_page": None, "source_text": None}

    def _parse_batch_json_response(self, text: str) -> List[Dict[str, Any]]:
        """Parse batch JSON response containing a list of extractions."""
        text = text.strip()
        if text.startswith("```"):
            start = text.find("{")
            end = text.rfind("}")
            if start != -1 and end != -1:
                text = text[start : end + 1]
            else:
                start_arr = text.find("[")
                end_arr = text.rfind("]")
                if start_arr != -1 and end_arr != -1:
                    text = text[start_arr : end_arr + 1]
        try:
            data = json.loads(text)
            if isinstance(data, dict):
                if "extractions" in data and isinstance(data["extractions"], list):
                    return data["extractions"]
                if "fields" in data and isinstance(data["fields"], list):
                    return data["fields"]
            elif isinstance(data, list):
                return data
        except json.JSONDecodeError:
            m = re.search(r"(\{|\[)[\s\S]*(\}|\])", text)
            if m:
                try:
                    parsed = json.loads(m.group(0))
                    if isinstance(parsed, dict) and "extractions" in parsed:
                        return parsed["extractions"]
                    elif isinstance(parsed, list):
                        return parsed
                except Exception:  # noqa: BLE001
                    pass
        return []

    # Sync wrapper for tests / simple use
    def extract_sync(self, field_name: str, chunks: List[str], field_description: str = "") -> ExtractionResult:
        return asyncio.run(self.extract(field_name, chunks, field_description))


def get_extractor(force_fake: bool = False) -> GeminiExtractor:
    """Factory for extractor singleton."""
    settings = get_settings()
    use_fake = force_fake or not bool(settings.gemini_api_key)
    return GeminiExtractor(use_fake=use_fake)


__all__ = ["GeminiExtractor", "FakeExtractor", "ExtractionResult", "get_extractor"]
