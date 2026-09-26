"""Account-tier extraction via DeepSeek (Phase 6, ADR-020).

OpenAI-compatible Chat Completions against ``{DEEPSEEK_BASE_URL}/v1/chat/completions``
(model ``deepseek-flash`` by default) with JSON mode. Same interface as
``GeminiExtractor`` (``extract`` / ``extract_batch`` + ``last_engine_used``),
so the job manager can swap providers by ``Job.tier``.

Hard rule: this module must NEVER call Gemini — on any failure it falls back
to the deterministic ``FakeExtractor`` (``extracted_by="heuristic"``). Proven
by tests in ``tests/test_tier_system.py``.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Dict, List, Optional

from app.core.config import get_settings
from app.services.generation.extractor import (
    ExtractionResult,
    FakeExtractor,
    build_batch_prompt,
    clamp_confidence,
    parse_batch_json_response,
)

logger = logging.getLogger(__name__)


class DeepSeekExtractor:
    """DeepSeek Chat Completions extractor with JSON mode and heuristic fallback."""

    _last_call_time: float = 0.0
    _MIN_CALL_INTERVAL: float = 1.2  # Pace calls like GeminiExtractor (429 bursts)
    _TIMEOUT: float = 35.0
    _MAX_ATTEMPTS: int = 3

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None, use_fake: Optional[bool] = None):
        settings = get_settings()
        self.api_key = settings.deepseek_api_key if api_key is None else api_key
        self.model = model if model is not None else settings.deepseek_model
        self.base_url = settings.deepseek_base_url.rstrip("/")
        self.disable_thinking = bool(getattr(settings, "deepseek_disable_thinking", True))
        self.use_fake = (not bool(self.api_key)) if use_fake is None else use_fake
        self.enable_pii_masking: bool = getattr(settings, "enable_pii_masking", True)
        self._fake = FakeExtractor()
        self.last_engine_used: str = "heuristic" if self.use_fake else "deepseek"
        self.last_fallback_reason: Optional[str] = (
            "DEEPSEEK_API_KEY is not configured in backend environment" if self.use_fake else None
        )

    def _build_payload(self, prompt: str, include_reasoning_control: bool) -> dict:
        payload: dict = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a precise document extraction system. Respond ONLY with valid JSON.",
                },
                {"role": "user", "content": prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0,
        }
        if include_reasoning_control and self.disable_thinking:
            # OpenAI/OpenRouter-style reasoning toggle; kenari.id maps it to the
            # provider-native switch. Extraction must not burn output tokens on
            # hidden thinking (cost, latency, 35s-timeout risk on big contracts).
            payload["reasoning"] = {"enabled": False}
        return payload

    async def _throttle(self) -> None:
        now = time.monotonic()
        elapsed = now - DeepSeekExtractor._last_call_time
        if elapsed < DeepSeekExtractor._MIN_CALL_INTERVAL:
            await asyncio.sleep(DeepSeekExtractor._MIN_CALL_INTERVAL - elapsed)
        DeepSeekExtractor._last_call_time = time.monotonic()

    async def _call_deepseek(self, prompt: str) -> str:
        """POST one chat-completions request; returns the message content."""
        import httpx

        url = f"{self.base_url}/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        last_error: Optional[Exception] = None
        # First try with the reasoning toggle; if the provider rejects the
        # unknown field (400), retry once without it so any OpenAI-compatible
        # endpoint keeps working.
        for include_reasoning_control in (True, False):
            payload = self._build_payload(prompt, include_reasoning_control)
            for attempt in range(self._MAX_ATTEMPTS):
                await self._throttle()
                try:
                    async with httpx.AsyncClient(timeout=self._TIMEOUT) as client:
                        res = await client.post(url, json=payload, headers=headers)
                    if res.status_code == 200:
                        data = res.json()
                        content = data["choices"][0]["message"]["content"]
                        if content and str(content).strip():
                            return str(content)
                        raise RuntimeError("Empty response from DeepSeek API")
                    # Do not echo upstream body (may contain request/credential echoes).
                    last_error = RuntimeError(f"HTTP {res.status_code}")
                    if res.status_code == 400 and include_reasoning_control:
                        # Provider may not accept the reasoning field — retry without it.
                        break
                    if res.status_code in (429,) or res.status_code >= 500:
                        # Retry with backoff on rate limit / server errors.
                        await asyncio.sleep(min(2.0 * (attempt + 1), 6.0))
                        continue
                    break  # 4xx (auth, bad request) — no point retrying
                except Exception as e:  # noqa: BLE001
                    last_error = e
                    await asyncio.sleep(min(2.0 * (attempt + 1), 6.0))
        raise last_error if last_error else RuntimeError("DeepSeek API request failed")

    def _mask(self, chunks: List[str]) -> tuple[List[str], Dict[str, str]]:
        if self.enable_pii_masking:
            from app.services.privacy.masker import SelectivePIIMasker

            return SelectivePIIMasker().mask_chunks(chunks)
        return chunks, {}

    def _unmask(self, text: Optional[str], unmask_map: Dict[str, str]) -> Optional[str]:
        if text and unmask_map:
            from app.services.privacy.masker import SelectivePIIMasker

            return SelectivePIIMasker().unmask(text, unmask_map)
        return text

    def _heuristic_batch(
        self,
        fields: List[Dict[str, str]],
        chunks: List[str],
        source_pages: Optional[List[int]],
        reason: str,
    ) -> Dict[str, ExtractionResult]:
        """Deterministic fallback — never Gemini."""
        results = self._fake.extract_batch(fields, chunks, source_pages=source_pages)
        for r in results.values():
            r.extracted_by = "heuristic"
            r.fallback_reason = reason
        return results

    async def extract_batch(
        self,
        fields: List[Dict[str, str]],
        chunks: List[str],
        source_pages: Optional[List[int]] = None,
    ) -> Dict[str, ExtractionResult]:
        if not fields:
            return {}

        if not chunks or self.use_fake:
            self.last_engine_used = "heuristic"
            reason = self.last_fallback_reason or "Fallback mode active (DEEPSEEK_API_KEY missing)"
            return self._heuristic_batch(fields, chunks, source_pages, reason)

        target_chunks, unmask_map = self._mask(list(chunks))
        prompt = build_batch_prompt(fields, target_chunks)

        try:
            response = await self._call_deepseek(prompt)
        except Exception as e:  # noqa: BLE001
            self.last_engine_used = "heuristic"
            reason = f"DeepSeek API Error: {str(e)[:120]}"
            self.last_fallback_reason = reason
            logger.warning("[DeepSeekExtractor] Batch extraction fell back to heuristic: %s", e)
            return self._heuristic_batch(fields, chunks, source_pages, reason)

        try:
            extractions = parse_batch_json_response(response)
            # VULN-07: only accept fields that were actually requested.
            requested = {f.get("field_name", "").strip(): f for f in fields}
            results: Dict[str, ExtractionResult] = {}
            for item in extractions:
                fname = str(item.get("field_name", "")).strip()
                if not fname or fname not in requested:
                    continue
                val = item.get("value")
                if isinstance(val, str) and not val.strip():
                    val = None
                conf = clamp_confidence(item.get("confidence", 0.0))
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
                    extracted_by="deepseek",
                    fallback_reason=None,
                )

            # Ensure every requested field has a result (heuristic recovery).
            has_missing = False
            for f in fields:
                fname = f.get("field_name", "")
                if fname not in results:
                    has_missing = True
                    fake_res = self._fake.extract(fname, chunks, f.get("description", ""))
                    fake_res.extracted_by = "heuristic"
                    fake_res.fallback_reason = "Field missing in DeepSeek response, recovered by heuristic"
                    if source_pages and fake_res.source_page and 1 <= fake_res.source_page <= len(source_pages):
                        fake_res.source_page = source_pages[fake_res.source_page - 1]
                    results[fname] = fake_res

            for r in results.values():
                if r.extracted_value:
                    r.extracted_value = self._unmask(r.extracted_value, unmask_map)
                if r.source_text:
                    r.source_text = self._unmask(r.source_text, unmask_map)

            self.last_engine_used = "hybrid" if has_missing else "deepseek"
            self.last_fallback_reason = "Some fields recovered by heuristic fallback" if has_missing else None
            return results
        except Exception as e:  # noqa: BLE001
            self.last_engine_used = "heuristic"
            self.last_fallback_reason = f"Failed to parse DeepSeek batch response: {e}"
            logger.warning("[DeepSeekExtractor] Failed to parse batch JSON (%s), falling back to heuristic", e)
            return self._heuristic_batch(fields, chunks, source_pages, self.last_fallback_reason)

    async def extract(
        self,
        field_name: str,
        chunks: List[str],
        field_description: str = "",
        source_pages: Optional[List[int]] = None,
    ) -> ExtractionResult:
        """Single-field extraction — delegates to the batch path with one field."""
        fields = [{"field_name": field_name, "description": field_description or field_name}]
        results = await self.extract_batch(fields, chunks, source_pages=source_pages)
        return results.get(
            field_name,
            ExtractionResult(
                field_name=field_name,
                extracted_value=None,
                confidence=0.0,
                status="not_found",
                extracted_by="heuristic",
                fallback_reason=self.last_fallback_reason,
            ),
        )


def get_deepseek_extractor(force_fake: bool = False) -> DeepSeekExtractor:
    """Factory: fake mode when forced (CI) or no key configured."""
    settings = get_settings()
    use_fake = force_fake or not bool(settings.deepseek_api_key)
    return DeepSeekExtractor(use_fake=use_fake)


__all__ = ["DeepSeekExtractor", "get_deepseek_extractor"]
