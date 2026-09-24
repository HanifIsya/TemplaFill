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
            # Term overlap: how many field_terms appear in key
            matched = sum(1 for t in field_terms if t in key_norm)
            term_score = matched / len(field_terms) if field_terms else 0
            difflib_score = difflib.SequenceMatcher(None, field_norm, key_norm).ratio()
            # Combined score: term_score weighted 0.7, difflib 0.3, but if term_score 0 then overall 0
            if term_score == 0 and difflib_score < 0.5:
                combined = 0
            else:
                combined = term_score * 0.7 + difflib_score * 0.3
                # Boost perfect term match
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
            # For due_date, distinctives = ["due"]; key "Invoice Date" lacks "due" -> penalize
            if distinctives and not any(d in key.lower() for d in distinctives):
                # Require high combined (>=0.85) to accept, else treat as not found
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
                )
            # If penalized (distinctive missing and score <0.85), fall through to not_found
            if best_match is None:
                pass
            else:
                # Was penalized but score high enough (>=0.85) -> still extracted (rare)
                return ExtractionResult(
                    field_name=field_name,
                    extracted_value=val[:100],
                    confidence=0.75,
                    source_page=chunk_idx + 1,
                    source_text=full[:200],
                    status="extracted",
                )

        # Fallback regex for email/phone across all chunks
        if "email" in field_norm:
            for ch in chunks_texts:
                m = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", ch)
                if m:
                    return ExtractionResult(field_name=field_name, extracted_value=m.group(0), confidence=0.9, source_text=m.group(0), status="extracted")
        if "phone" in field_norm:
            for ch in chunks_texts:
                m = re.search(r"\+?[\d\s\-\(\)]{7,}", ch)
                if m:
                    val = m.group(0).strip()
                    if sum(c.isdigit() for c in val) >= 7:
                        return ExtractionResult(field_name=field_name, extracted_value=val, confidence=0.8, source_text=val, status="extracted")

        snippet = best_match[2][:200] if best_match else (chunks_texts[0][:200] if chunks_texts else None)
        return ExtractionResult(field_name=field_name, extracted_value=None, confidence=0.0, source_text=snippet, status="not_found")

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
        self.api_key = api_key if api_key is not None else settings.gemini_api_key
        self.model = model if model is not None else settings.gemini_model
        # Sanitize deprecated / inactive model identifiers
        if self.model in ("gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"):
            self.model = "gemini-3.7-flash"
        if use_fake is not None:
            self.use_fake = use_fake
        else:
            self.use_fake = not bool(self.api_key) or not _HAS_GENAI
        self._client: Any = None
        self._fake = FakeExtractor()
        if not self.use_fake and _HAS_GENAI:
            try:
                self._client = genai.Client(api_key=self.api_key)
            except Exception as e:  # noqa: BLE001
                logger.warning("Failed to initialize genai.Client: %s. Using fake fallback.", e)
                self.use_fake = True

    def _get_candidate_models(self) -> List[str]:
        """Returns prioritized candidate models excluding blacklisted (404) ones."""
        candidates: List[str] = []
        preferred = [self.model, "gemini-3.7-flash", "gemini-2.5-flash", "gemini-3.8-flash"]
        for m in preferred:
            if m and m not in candidates and m not in self._BLACKLISTED_MODELS:
                candidates.append(m)
        return candidates or ["gemini-3.7-flash"]

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
3. For each found field, provide:
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
        """Executes a Gemini call with candidate model progression, 404 blacklisting, and 429 backoff."""
        response: Optional[str] = None
        last_error: Optional[Exception] = None

        candidate_models = self._get_candidate_models()
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

                    # On 429 RateLimit or 503 ServiceUnavailable: backoff exponentially
                    if any(x in err_str for x in ("503", "unavailable", "overload", "429", "too many", "quota", "resource_exhausted")):
                        if attempt < 1:
                            delay = 2.5 * (attempt + 1)
                            logger.info("[GeminiExtractor] Rate limited / service unavailable, backing off %.1fs...", delay)
                            await asyncio.sleep(delay)
                            continue
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
            return ExtractionResult(field_name=field_name, extracted_value=None, confidence=0.0, status="not_found")

        if self.use_fake or self._client is None:
            res = self._fake.extract(field_name, chunks, field_description)
            if source_pages and res.source_page and 1 <= res.source_page <= len(source_pages):
                res.source_page = source_pages[res.source_page - 1]
            return res

        prompt = self._build_prompt(field_name, field_description, chunks)
        response, last_error = await self._call_gemini_with_fallback(prompt)

        if not response:
            res = self._fake.extract(field_name, chunks, field_description)
            if source_pages and res.source_page and 1 <= res.source_page <= len(source_pages):
                res.source_page = source_pages[res.source_page - 1]
            res.source_text = f"[AI_ERROR: {str(last_error)[:120]}] {res.source_text or ''}"
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
            status = "extracted" if value is not None else "not_found"
            return ExtractionResult(
                field_name=field_name,
                extracted_value=value,
                confidence=confidence,
                source_page=source_page,
                source_text=source_text[:500] if isinstance(source_text, str) else None,
                status=status,
            )
        except Exception:
            res = self._fake.extract(field_name, chunks, field_description)
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

        if not chunks or self.use_fake or self._client is None:
            return self._fake.extract_batch(fields, chunks, source_pages=source_pages)

        prompt = self._build_batch_prompt(fields, chunks)
        response, last_error = await self._call_gemini_with_fallback(prompt)

        if not response:
            logger.warning("[GeminiExtractor] Batch extraction fallback to fake: %s", last_error)
            return self._fake.extract_batch(fields, chunks, source_pages=source_pages)

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
                )

            # Ensure every requested field has a result (fallback any missing field)
            for f in fields:
                fname = f.get("field_name", "")
                if fname not in results:
                    fake_res = self._fake.extract(fname, chunks, f.get("description", ""))
                    if source_pages and fake_res.source_page and 1 <= fake_res.source_page <= len(source_pages):
                        fake_res.source_page = source_pages[fake_res.source_page - 1]
                    results[fname] = fake_res

            return results
        except Exception as e:
            logger.warning("[GeminiExtractor] Failed to parse batch JSON response (%s), falling back to fake", e)
            return self._fake.extract_batch(fields, chunks, source_pages=source_pages)

    async def _call_gemini(self, prompt: str) -> str:
        """Call Gemini generate_content and return text."""
        if not self._client:
            raise RuntimeError("Gemini client is not initialized")

        config = None
        if _HAS_GENAI and hasattr(types, "GenerateContentConfig"):
            try:
                config_kwargs: Dict[str, Any] = {"response_mime_type": "application/json"}
                if hasattr(types, "ThinkingConfig"):
                    try:
                        config_kwargs["thinking_config"] = types.ThinkingConfig(thinking_level="low")
                    except Exception:
                        pass
                config = types.GenerateContentConfig(**config_kwargs)
            except Exception:
                config = None

        # Try async client
        if hasattr(self._client, "aio"):
            if config:
                resp = await self._client.aio.models.generate_content(model=self.model, contents=prompt, config=config)
            else:
                resp = await self._client.aio.models.generate_content(model=self.model, contents=prompt)
            return str(getattr(resp, "text", "") or "")
        else:
            loop = asyncio.get_running_loop()

            def sync_call() -> str:
                if config:
                    resp = self._client.models.generate_content(model=self.model, contents=prompt, config=config)
                else:
                    resp = self._client.models.generate_content(model=self.model, contents=prompt)
                return str(getattr(resp, "text", "") or "")

            return await loop.run_in_executor(None, sync_call)

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
    use_fake = force_fake or not bool(settings.gemini_api_key) or not _HAS_GENAI
    return GeminiExtractor(use_fake=use_fake)


__all__ = ["GeminiExtractor", "FakeExtractor", "ExtractionResult", "get_extractor"]
