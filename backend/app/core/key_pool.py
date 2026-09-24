"""Gemini API Key Pool with Automatic Failover and Rotation.

Allows configuring multiple comma-separated Gemini API keys:
  GEMINI_API_KEY="key1,key2,key3"

When an API key exhausts its quota (HTTP 429), the pool automatically
marks it exhausted and switches to the next available API key,
effectively multiplying the daily free tier capacity by the number of keys.
"""

from __future__ import annotations

import logging
import re
import time
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class GeminiKeyPool:
    """Manages a pool of Gemini API keys with automatic failover upon 429 quota exhaustion."""

    def __init__(self, raw_keys: Optional[str] = None):
        self._keys: List[str] = []
        self._exhausted_until: Dict[str, float] = {}  # key -> monotonic timestamp
        self._current_index: int = 0
        if raw_keys:
            self.set_keys(raw_keys)

    def set_keys(self, raw_keys: str) -> None:
        """Parse comma or whitespace separated keys."""
        if not raw_keys:
            self._keys = []
            self._current_index = 0
            self._exhausted_until = {}
            return
        parsed = [k.strip() for k in re.split(r"[,;\n\s]+", raw_keys) if k.strip()]
        # Preserve unique keys in order
        seen = set()
        self._keys = [k for k in parsed if not (k in seen or seen.add(k))]
        self._current_index = 0
        self._exhausted_until = {}

    @property
    def total_keys(self) -> int:
        return len(self._keys)

    def get_current_key(self) -> Optional[str]:
        """Returns the currently active, non-exhausted key."""
        if not self._keys:
            return None

        now = time.monotonic()
        # Find first non-exhausted key starting from current index
        for offset in range(len(self._keys)):
            idx = (self._current_index + offset) % len(self._keys)
            key = self._keys[idx]
            exhausted_until = self._exhausted_until.get(key, 0.0)
            if now >= exhausted_until:
                self._current_index = idx
                return key

        # If all keys are marked exhausted, fallback to current key (in case quota reset)
        return self._keys[self._current_index % len(self._keys)]

    def mark_exhausted(
        self,
        key: str,
        duration_seconds: float = 3600.0,
        reason: str = "quota_exhausted",
    ) -> Optional[str]:
        """Mark a specific key as exhausted for duration_seconds and switch to next available key."""
        if not key or key not in self._keys:
            return self.get_current_key()

        self._exhausted_until[key] = time.monotonic() + duration_seconds
        available_count = sum(1 for k in self._keys if time.monotonic() >= self._exhausted_until.get(k, 0.0))

        key_mask = f"...{key[-6:]}" if len(key) >= 6 else "***"
        logger.warning(
            "[GeminiKeyPool] API key %s marked exhausted (%s). %d/%d keys currently available in pool.",
            key_mask,
            reason,
            available_count,
            len(self._keys),
        )

        # Advance to next available key
        next_key = self.get_current_key()
        if next_key and next_key != key:
            next_mask = f"...{next_key[-6:]}" if len(next_key) >= 6 else "***"
            logger.info("[GeminiKeyPool] Automatically switched active API key to %s", next_mask)
        return next_key

    def get_all_keys(self) -> List[str]:
        return list(self._keys)

    def is_exhausted(self, key: str) -> bool:
        return time.monotonic() < self._exhausted_until.get(key, 0.0)


_global_pool: Optional[GeminiKeyPool] = None


def get_key_pool(raw_keys: Optional[str] = None) -> GeminiKeyPool:
    """Singleton getter for global GeminiKeyPool."""
    global _global_pool
    if _global_pool is None:
        from app.core.config import get_settings

        settings = get_settings()
        keys_str = raw_keys if raw_keys is not None else settings.gemini_api_key
        _global_pool = GeminiKeyPool(keys_str)
    elif raw_keys is not None:
        _global_pool.set_keys(raw_keys)
    return _global_pool


__all__ = ["GeminiKeyPool", "get_key_pool"]
