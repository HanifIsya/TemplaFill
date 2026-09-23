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

import json
import re
from typing import Any, Dict, List, Optional

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


class GeminiExtractor:
    """Live Gemini extractor (structured output)."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None, use_fake: Optional[bool] = None):
        settings = get_settings()
        self.api_key = api_key if api_key is not None else settings.gemini_api_key
        self.model = model if model is not None else settings.gemini_model
        # Sanitize deprecated / inactive models that return 404 in Google AI Studio
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
            except Exception:  # noqa: BLE001
                self.use_fake = True

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

    async def extract(
        self,
        field_name: str,
        chunks: List[str],
        field_description: str = "",
        source_pages: Optional[List[int]] = None,
    ) -> ExtractionResult:
        if not chunks:
            return ExtractionResult(field_name=field_name, extracted_value=None, confidence=0.0, status="not_found")

        if self.use_fake or self._client is None:
            # Delegate to fake
            res = self._fake.extract(field_name, chunks, field_description)
            # Map fake page to real source_pages if provided
            if source_pages and res.source_page and 1 <= res.source_page <= len(source_pages):
                res.source_page = source_pages[res.source_page - 1]
            return res

        # Live Gemini call with candidate model progression (Gemini 3.7 Flash & 3.8 Flash)
        prompt = self._build_prompt(field_name, field_description, chunks)
        response: Optional[str] = None

        candidate_models: list[str] = []
        for m in [self.model, "gemini-3.7-flash", "gemini-3.8-flash"]:
            if m and m not in candidate_models and m not in ("gemini-2.0-flash", "gemini-1.5-flash"):
                candidate_models.append(m)

        last_error: Optional[Exception] = None
        for candidate in candidate_models:
            for attempt in range(2):
                try:
                    self.model = candidate
                    response = await self._call_gemini(prompt)
                    if response:
                        break
                except Exception as e:
                    last_error = e
                    err_str = str(e).lower()
                    # On 503 ServiceUnavailable or 429 RateLimit, backoff briefly and retry
                    if any(x in err_str for x in ("503", "unavailable", "overload", "429", "rate")):
                        if attempt < 1:
                            import asyncio
                            await asyncio.sleep(1.5)
                            continue
                    # On 404 NotFound, advance directly to next candidate model
                    if "404" in err_str or "not found" in err_str:
                        break
                    break
            if response:
                break

        if not response:
            res = self._fake.extract(field_name, chunks, field_description)
            if source_pages and res.source_page and 1 <= res.source_page <= len(source_pages):
                res.source_page = source_pages[res.source_page - 1]
            res.source_text = f"[AI_ERROR: {str(last_error)[:120]}] {res.source_text or ''}"
            return res

        try:
            data = self._parse_json_response(response or "")
            value = data.get("value")
            # Normalize empty string to None
            if isinstance(value, str) and not value.strip():
                value = None
            confidence = float(data.get("confidence", 0.0))
            source_page = data.get("source_page")
            source_text = data.get("source_text")
            # Map source_page via source_pages if provided
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
            if source_pages and res.source_page and 1 <= source_page <= len(source_pages):
                res.source_page = source_pages[res.source_page - 1]
            return res

    async def _call_gemini(self, prompt: str) -> str:
        """Call Gemini generate_content and return text."""
        if not self._client:
            raise RuntimeError("Gemini client is not initialized")

        config = None
        if _HAS_GENAI and hasattr(types, "GenerateContentConfig") and hasattr(types, "ThinkingConfig"):
            try:
                config = types.GenerateContentConfig(
                    thinking_config=types.ThinkingConfig(thinking_level="low")
                )
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
            import asyncio

            loop = asyncio.get_running_loop()

            def sync_call() -> str:
                if config:
                    resp = self._client.models.generate_content(model=self.model, contents=prompt, config=config)
                else:
                    resp = self._client.models.generate_content(model=self.model, contents=prompt)
                return str(getattr(resp, "text", "") or "")

            return await loop.run_in_executor(None, sync_call)

    def _parse_json_response(self, text: str) -> Dict[str, Any]:
        """Parse JSON from model text (handle markdown code block)."""
        text = text.strip()
        # Remove ```json ... ``` wrapper if present
        if text.startswith("```"):
            # Find first { and last }
            start = text.find("{")
            end = text.rfind("}")
            if start != -1 and end != -1:
                text = text[start : end + 1]
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try to extract JSON object via regex
            m = re.search(r"\{[\s\S]*\}", text)
            if m:
                try:
                    return json.loads(m.group(0))
                except Exception:  # noqa: BLE001
                    pass
            return {"value": None, "confidence": 0.0, "source_page": None, "source_text": None}

    # Sync wrapper for tests / simple use
    def extract_sync(self, field_name: str, chunks: List[str], field_description: str = "") -> ExtractionResult:
        import asyncio

        return asyncio.run(self.extract(field_name, chunks, field_description))


def get_extractor(force_fake: bool = False) -> GeminiExtractor:
    """Factory for extractor singleton."""
    settings = get_settings()
    use_fake = force_fake or not bool(settings.gemini_api_key) or not _HAS_GENAI
    return GeminiExtractor(use_fake=use_fake)


__all__ = ["GeminiExtractor", "FakeExtractor", "ExtractionResult", "get_extractor"]
