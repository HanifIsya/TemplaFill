"""Account-tier auth endpoints (Phase 6, ADR-020) — /api/auth/*.

One fixed shared credential (TIER_ACCOUNT_USERNAME + scrypt hash of the
password) grants a signed account-tier token. There is no self-registration
and no per-user record — history/results stay in the browser (localStorage).
"""

from __future__ import annotations

from fastapi import APIRouter, Body, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.api.dependencies import rate_limit
from app.core.config import get_settings
from app.core.security import (
    create_tier_token,
    extract_tier_token,
    get_client_ip,
    get_rate_limiter,
    verify_tier_token,
)
from app.core.tier_auth import verify_password

router = APIRouter()


class LoginPayload(BaseModel):
    username: str
    password: str


def _error(code: str, message: str, status: int, details: dict | None = None) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"success": False, "error": {"code": code, "message": message, "details": details or {}}},
    )


@router.post("/auth/login", summary="Log in with shared account credentials")
async def login(request: Request, payload: LoginPayload):
    settings = get_settings()

    # 5 login attempts/minute per IP (shared-password brute-force guard)
    rl = rate_limit(request, "auth")
    if rl:
        return rl

    if not settings.tier_account_password_hash:
        return _error(
            "TIER_NOT_CONFIGURED",
            "Account tier is not enabled on this deployment",
            status=503,
        )

    import hmac as _hmac

    username_ok = _hmac.compare_digest(
        payload.username.strip().encode("utf-8"),
        settings.tier_account_username.strip().encode("utf-8"),
    )
    password_ok = verify_password(payload.password, settings.tier_account_password_hash)

    if not (username_ok and password_ok):
        # Generic message: never reveal which credential was wrong.
        return _error("INVALID_CREDENTIALS", "Invalid username or password", status=401)

    token = create_tier_token(tier="pro")
    response = JSONResponse(
        status_code=200,
        content={
            "success": True,
            "data": {
                "tier": "pro",
                "token": token,
                "expires_in": settings.tier_token_expire_days * 86_400,
            },
        },
    )
    response.set_cookie(
        key=settings.tier_cookie_name,
        value=token,
        max_age=settings.tier_token_expire_days * 86_400,
        httponly=True,
        samesite=settings.session_cookie_samesite,
        secure=settings.session_cookie_secure,
        path="/",
    )
    return response


@router.post("/auth/logout", summary="Clear the account-tier cookie")
async def logout(request: Request):
    settings = get_settings()
    response = JSONResponse(status_code=200, content={"success": True, "data": {"tier": "free"}})
    response.delete_cookie(settings.tier_cookie_name, path="/")
    return response


@router.get("/auth/quota", summary="Quota usage for the caller's tier")
async def quota(request: Request):
    settings = get_settings()
    tier = verify_tier_token(extract_tier_token(request) or "") or "free"
    ip = get_client_ip(request)
    limiter = get_rate_limiter()

    free_used = limiter.usage(ip, "free_upload")
    pro_used = limiter.usage(ip, "pro_upload")
    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "data": {
                "tier": tier,
                "free_used_today": free_used,
                "free_limit": settings.free_jobs_per_day,
                "pro_used_today": pro_used,
                "pro_limit": settings.pro_jobs_per_day,
            },
        },
    )


__all__ = ["router"]
