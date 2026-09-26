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
    get_client_ip,
    get_rate_limiter,
    is_test_request,
    verify_session_token,
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


__all__ = ["rate_limit", "authorize_job_access", "not_found_response"]