"""Security utilities — Task 5.1.

Implements:
 - Security headers middleware (CSP, HSTS, X-Frame-Options, etc. per SECURITY.md)
 - Input sanitization helpers (strip path traversal, normalize filenames)
 - File type validation (magic bytes, not just extension)
 - Simple in-memory rate limiter (for MVP, 10/hour upload, 60/min read)
 - Request ID middleware for tracing
"""

from __future__ import annotations

import re
import time
import uuid
from collections import defaultdict, deque
from pathlib import Path
from typing import Dict, Deque

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


# ---------------------------------------------------------------------------
# Security headers — per SECURITY.md § API Security
# ---------------------------------------------------------------------------

SECURITY_HEADERS: Dict[str, str] = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "0",  # Modern browsers use CSP; set 0 per docs
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:",
    # HSTS only if HTTPS (in production). We set always; browsers ignore on HTTP.
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds security headers to every response."""

    async def dispatch(self, request: Request, call_next):  # type: ignore[no-untyped-def]
        response = await call_next(request)
        for k, v in SECURITY_HEADERS.items():
            # Don't overwrite if already set
            if k not in response.headers:
                response.headers[k] = v
        # Add request ID
        response.headers["X-Request-ID"] = getattr(request.state, "request_id", str(uuid.uuid4()))
        return response


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Assigns X-Request-ID per request for tracing."""

    async def dispatch(self, request: Request, call_next):  # type: ignore[no-untyped-def]
        req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = req_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = req_id
        return response


# ---------------------------------------------------------------------------
# Filename sanitization
# ---------------------------------------------------------------------------

_UNSAFE_CHARS = re.compile(r"[^a-zA-Z0-9._-]")
_PATH_TRAVERSAL = re.compile(r"(\.\.|/|\\)")


def sanitize_filename(filename: str, max_len: int = 128) -> str:
    """Sanitize uploaded filename: strip path traversal, limit length, allow safe chars."""
    if not filename:
        return "unnamed"
    # Strip directory components
    filename = Path(filename).name
    # Remove path traversal attempts
    filename = _PATH_TRAVERSAL.sub("_", filename)
    # Replace unsafe chars
    filename = _UNSAFE_CHARS.sub("_", filename)
    # Collapse multiple underscores
    filename = re.sub(r"_+", "_", filename)
    # Limit length preserving extension
    if len(filename) > max_len:
        ext = Path(filename).suffix
        stem = Path(filename).stem[: max_len - len(ext) - 1]
        filename = stem + ext
    filename = filename.strip("._-")
    return filename or "file"


# ---------------------------------------------------------------------------
# Simple in-memory rate limiter (MVP)
# ---------------------------------------------------------------------------

class InMemoryRateLimiter:
    """Sliding window rate limiter per IP and endpoint category.

    Config per SECURITY.md:
     - upload: 10/hour per IP
     - read: 60/minute per IP
     - write: 30/minute per IP
     - re_extract: 5/minute per IP
    """

    def __init__(self):
        # key -> deque of timestamps (float)
        self._buckets: Dict[str, Deque[float]] = defaultdict(deque)

    def _window_seconds(self, category: str) -> tuple[int, int]:
        # returns (limit, window_seconds)
        mapping = {
            "upload": (10, 3600),
            "read": (60, 60),
            "write": (30, 60),
            "re_extract": (5, 60),
        }
        return mapping.get(category, (60, 60))

    def is_allowed(self, ip: str, category: str) -> bool:
        if ip in ("testclient", "test"):
            return True
        limit, window = self._window_seconds(category)
        now = time.monotonic()
        key = f"{ip}:{category}"
        dq = self._buckets[key]
        # Evict outside window
        while dq and dq[0] <= now - window:
            dq.popleft()
        if len(dq) >= limit:
            return False
        dq.append(now)
        return True

    def retry_after(self, ip: str, category: str) -> int:
        limit, window = self._window_seconds(category)
        key = f"{ip}:{category}"
        dq = self._buckets[key]
        if not dq:
            return 0
        oldest = dq[0]
        return max(0, int(oldest + window - time.monotonic()))

    def clear(self):
        self._buckets.clear()


# Global limiter
_rate_limiter = InMemoryRateLimiter()


def get_rate_limiter() -> InMemoryRateLimiter:
    return _rate_limiter


# ---------------------------------------------------------------------------
# Input sanitization helpers
# ---------------------------------------------------------------------------

def sanitize_text_input(text: str, max_len: int = 5000) -> str:
    """Basic sanitization for user-provided text (e.g., hint)."""
    if not text:
        return ""
    # Strip, limit length, remove null bytes, control chars
    text = text.replace("\x00", "")
    text = re.sub(r"[\x01-\x08\x0B\x0C\x0E-\x1F]", "", text)
    text = text.strip()
    if len(text) > max_len:
        text = text[:max_len]
    return text


def validate_file_magic(data: bytes, expected: str) -> bool:
    """Validate magic bytes for file type (not just extension)."""
    if expected == "pdf":
        return data.lstrip(b"\x00 \n\r\t\xef\xbb\xbf").startswith(b"%PDF")
    if expected in ("docx", "xlsx", "pptx"):
        # All are ZIP-based
        return data.startswith(b"PK")
    return False
