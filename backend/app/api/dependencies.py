"""Shared API dependencies — authorization & rate limiting (VULN-01, VULN-10).

Every /jobs/{job_id}/* route MUST call `authorize_job_access` so that a caller
can only reach a job if they present the signed session token issued at upload
(or, in test mode, if the request comes from the test client).
"""

from __future__ import annotations

from typing import Optional

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.security import (
    extract_session_token,
    extract_tier_token,
    get_client_ip,
    get_rate_limiter,
    is_test_request,
    verify_session_token,
    verify_tier_token,
)
from app.services.jobs.models import Job


def rate_limit(request: Request, category: str):
    """Return a 429 JSONResponse if the caller exceeded `category`, else None."""
    ip = get_client_ip(request)
    limiter = get_rate_limiter()
    if limiter.is_allowed(ip, category):
        return None
    retry_after = limiter.retry_after(ip, category)
    return JSONResponse(
        status_code=429,
        content={
            "success": False,
            "error": {
                "code": "RATE_LIMITED",
                "message": f"{category} rate limit exceeded. Retry after {retry_after}s.",
                "details": {},
            },
        },
        headers={"Retry-After": str(retry_after)},
    )


def resolve_tier(request: Request) -> str:
    """Return "pro" if the caller presents a valid account-tier token, else "free".

    Invalid/expired/job tokens all degrade to "free" — the safe default (free
    tier still works, just Gemini + its quota).
    """
    token = extract_tier_token(request)
    tier = verify_tier_token(token) if token else None
    return "pro" if tier == "pro" else "free"


def quota_check(request: Request, tier: str) -> Optional[JSONResponse]:
    """Consume one daily-quota slot for `tier`; return 429 QUOTA_EXCEEDED when spent.

    Daily caps are enforced even for logged-in users — the shared password
    makes per-IP daily caps the primary cost/abuse control (ADR-020).
    """
    ip = get_client_ip(request)
    limiter = get_rate_limiter()
    category = "pro_upload" if tier == "pro" else "free_upload"
    if limiter.is_allowed(ip, category):
        return None
    retry_after = limiter.retry_after(ip, category)
    limit = get_settings().pro_jobs_per_day if tier == "pro" else get_settings().free_jobs_per_day
    return JSONResponse(
        status_code=429,
        content={
            "success": False,
            "error": {
                "code": "QUOTA_EXCEEDED",
                "message": f"Daily {tier} upload quota reached ({limit}/day). Retry after {retry_after}s.",
                "details": {"tier": tier, "limit": limit},
            },
        },
        headers={"Retry-After": str(retry_after)},
    )


def authorize_job_access(request: Request, job: Job) -> Optional[JSONResponse]:
    """Return None if the caller may access `job`, otherwise a 404 JSONResponse.

    Returns 404 (not 403) to avoid confirming that a job id exists, which
    prevents enumeration of other users' jobs.
    """
    settings = get_settings()

    # Test client (CI) is trusted so the suite can run without cookie plumbing.
    if is_test_request(request):
        return None

    if not settings.require_session_token:
        return None

    token = extract_session_token(request)
    if token and job.session_token and verify_session_token(token, job.job_id):
        return None

    return JSONResponse(
        status_code=404,
        content={
            "success": False,
            "error": {"code": "NOT_FOUND", "message": "Job not found", "details": {}},
        },
    )


def not_found_response() -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={
            "success": False,
            "error": {"code": "NOT_FOUND", "message": "Job not found", "details": {}},
        },
    )


__all__ = ["rate_limit", "authorize_job_access", "not_found_response", "resolve_tier", "quota_check"]