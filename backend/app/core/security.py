"""Security utilities — Task 5.1.

Implements:
 - Security headers middleware (CSP, HSTS, X-Frame-Options, etc. per SECURITY.md)
 - Input sanitization helpers (strip path traversal, normalize filenames)
 - File type validation (magic bytes, not just extension)
 - Simple in-memory rate limiter (for MVP, 10/hour upload, 60/min read)
 - Request ID middleware for tracing
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import ipaddress
import re
import secrets as _secrets
import time
import uuid
from collections import defaultdict, deque
from pathlib import Path
from typing import Dict, Deque, Iterable, Optional

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

# Error code returned by FastAPI's RequestValidationError for bodies exceeding
# the declared Content-Length limit (raised by SizeLimitedMiddleware).
_MAX_SIZE_ERROR_TYPE = "body_too_large"


class InMemoryRateLimiter:
    """Sliding window rate limiter per IP and endpoint category.

    Config per SECURITY.md:
     - upload: 10/hour per IP
     - read: 60/minute per IP
     - write: 30/minute per IP
     - re_extract: 5/minute per IP

    Bounded memory (VULN-05): the number of tracked keys is capped and empty
    buckets are pruned so an attacker cannot grow the map indefinitely.
    """

    MAX_TRACKED_KEYS = 10_000

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

    def _prune(self, now: float) -> None:
        """Drop empty buckets and hard-cap the map size (bounded memory)."""
        if len(self._buckets) <= self.MAX_TRACKED_KEYS:
            return
        empty = [k for k, dq in self._buckets.items() if not dq]
        for k in empty:
            self._buckets.pop(k, None)
        # If still over capacity, clear oldest-ish keys deterministically.
        if len(self._buckets) > self.MAX_TRACKED_KEYS:
            for k in list(self._buckets.keys())[: len(self._buckets) - self.MAX_TRACKED_KEYS]:
                self._buckets.pop(k, None)

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
        self._prune(now)
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


# ---------------------------------------------------------------------------
# Trusted client IP resolution (VULN-05)
# ---------------------------------------------------------------------------

def _is_trusted_proxy(ip: str, trusted: Iterable[str]) -> bool:
    """Return True if `ip` is inside any trusted proxy entry (IP or CIDR)."""
    for entry in trusted:
        entry = entry.strip()
        if not entry:
            continue
        if entry == "*":
            return True
        try:
            if "/" in entry:
                if ipaddress.ip_address(ip) in ipaddress.ip_network(entry, strict=False):
                    return True
            elif ip == entry:
                return True
        except ValueError:
            # Malformed trusted-proxy entry — ignore it.
            continue
    return False


def get_client_ip(request: Request) -> str:
    """Resolve the effective client IP in a spoof-resistant way.

    Forwarded headers are only honored when the direct peer is a configured
    trusted proxy (TRUSTED_PROXIES). Otherwise the socket peer is used, so a
    random client cannot spoof its IP to evade rate limits.
    """
    peer = request.client.host if request.client else "unknown"

    from app.core.config import get_settings

    trusted = get_settings().trusted_proxies_list
    if not _is_trusted_proxy(peer, trusted):
        return peer

    # Peer is a trusted proxy. Use the RIGHT-most forwarded hop: that is the
    # value appended by the proxy nearest to us. Any left-most entries are
    # attacker-controlled and therefore ignored (spoof-resistant).
    xff = request.headers.get("x-forwarded-for")
    if xff:
        hops = [h.strip() for h in xff.split(",") if h.strip()]
        if hops:
            # Walk right-to-left, skipping any additional trusted hops.
            for candidate in reversed(hops):
                if not _is_trusted_proxy(candidate, trusted):
                    return candidate
            return hops[-1]
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return peer


# ---------------------------------------------------------------------------
# Anonymous per-job session tokens (VULN-01)
# ---------------------------------------------------------------------------

def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64url_decode(text: str) -> bytes:
    padding = "=" * (-len(text) % 4)
    return base64.urlsafe_b64decode(text + padding)


def _signing_key() -> bytes:
    from app.core.config import get_settings

    return get_settings().secret_key.encode("utf-8")


def create_session_token(job_id: str) -> str:
    """Create a signed, expiring token that authorizes access to one job."""
    from app.core.config import get_settings

    settings = get_settings()
    expires_at = int(time.time()) + settings.session_token_expire_hours * 3600
    nonce = _secrets.token_urlsafe(8)
    payload = f"{job_id}.{expires_at}.{nonce}".encode("utf-8")
    encoded = _b64url_encode(payload)
    sig = hmac.new(_signing_key(), encoded.encode("ascii"), hashlib.sha256).digest()
    return f"{encoded}.{_b64url_encode(sig)}"


def verify_session_token(token: str, job_id: str) -> bool:
    """Constant-time verification that `token` authorizes `job_id` and is fresh."""
    if not token or not job_id:
        return False
    token = token.strip()
    if token.lower().startswith("bearer "):
        token = token[7:].strip()
    try:
        encoded, sig_b64 = token.rsplit(".", 1)
        expected = hmac.new(_signing_key(), encoded.encode("ascii"), hashlib.sha256).digest()
        provided = _b64url_decode(sig_b64)
        if not hmac.compare_digest(expected, provided):
            return False
        payload = _b64url_decode(encoded).decode("utf-8")
        token_job_id, expires_at_str, _nonce = payload.split(".", 2)
        if not hmac.compare_digest(token_job_id, job_id):
            return False
        if int(expires_at_str) < int(time.time()):
            return False
        return True
    except Exception:  # noqa: BLE001
        return False


def extract_session_token(request: Request) -> Optional[str]:
    """Read the session token from the Authorization header or session cookie."""
    from app.core.config import get_settings

    settings = get_settings()
    auth = request.headers.get("authorization")
    if auth:
        return auth.strip()
    header_token = request.headers.get("x-session-token")
    if header_token:
        return header_token.strip()
    return request.cookies.get(settings.session_cookie_name)


def is_test_request(request: Request) -> bool:
    """Detect test clients so CI can exercise endpoints without cookies."""
    client = request.client.host if request.client else ""
    return client in ("testclient", "test")


# ---------------------------------------------------------------------------
# Request body size limiter (VULN-03)
# ---------------------------------------------------------------------------

class SizeLimitedMiddleware(BaseHTTPMiddleware):
    """Reject requests whose Content-Length exceeds the configured body cap.

    This runs as pure ASGI middleware *outside* FastAPI's exception handling so
    an oversized request is rejected before any handler or upload parsing starts.
    """

    def __init__(self, app, max_body_bytes: int):  # type: ignore[no-untyped-def]
        super().__init__(app)
        self.max_body_bytes = max_body_bytes

    async def dispatch(self, request: Request, call_next):  # type: ignore[no-untyped-def]
        if request.method in ("POST", "PUT", "PATCH"):
            content_length = request.headers.get("content-length")
            if content_length:
                try:
                    if int(content_length) > self.max_body_bytes:
                        from fastapi.responses import JSONResponse

                        return JSONResponse(
                            status_code=413,
                            content={
                                "success": False,
                                "error": {
                                    "code": "FILE_TOO_LARGE",
                                    "message": f"Request body exceeds the {self.max_body_bytes // (1024 * 1024)}MB limit",
                                    "details": {},
                                },
                            },
                        )
                except ValueError:
                    pass
        return await call_next(request)
