"""TemplaFill FastAPI application entry point.

CORS is configured to allow the Next.js frontend (default http://localhost:3000).
Health check lives at GET /api/health per docs/2-architecture/API.md.
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.api.health import router as health_router
from app.api.jobs import router as jobs_router
from app.api.upload import router as upload_router
from app.core.config import get_settings
from app.core.security import (
    RequestIdMiddleware,
    SecurityHeadersMiddleware,
    SizeLimitedMiddleware,
)

logger = logging.getLogger(__name__)
settings = get_settings()


async def _retention_cleanup_loop(interval_seconds: int = 900) -> None:
    """Periodically purge expired jobs to bound memory (VULN-02)."""
    from app.services.jobs.manager import get_job_manager

    manager = get_job_manager()
    while True:
        try:
            await asyncio.sleep(interval_seconds)
            removed = await manager.evict_expired()
            if removed:
                logger.info("Retention cleanup evicted %d expired job(s)", removed)
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001
            logger.exception("Retention cleanup iteration failed")


@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[no-untyped-def]
    cleanup_task = asyncio.create_task(_retention_cleanup_loop())
    try:
        yield
    finally:
        cleanup_task.cancel()
        try:
            await cleanup_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="TemplaFill API — AI-powered PDF to Template extractor & filler",
    lifespan=lifespan,
    # Disable interactive docs unless explicitly enabling DEBUG (VULN-09)
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
)

# ----- Performance: GZip (Task 5.2) -----
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ----- Request body size limit (VULN-03): reject oversize bodies early -----
app.add_middleware(
    SizeLimitedMiddleware,
    max_body_bytes=settings.max_request_body_mb * 1024 * 1024,
)

# ----- Security headers + request ID (Task 5.1) -----
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestIdMiddleware)

# ----- CORS: explicit allow-list only (VULN-08).
# The permissive `https://*.vercel.app` regex was removed because any party can
# register such a subdomain, which combined with allow_credentials would let an
# attacker origin read authenticated responses. Add exact origins to CORS_ORIGINS.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Session-Token", "X-Request-ID"],
    expose_headers=["Content-Disposition", "X-Request-ID"],
)

# ----- Routers -----
# Health check at /api/health and /health (supports UptimeRobot and load balancer probes)
app.include_router(health_router, prefix="/api", tags=["health"])
app.include_router(health_router, prefix="", tags=["health"])
# Upload & Jobs under /api
app.include_router(upload_router, prefix="/api", tags=["upload"])
app.include_router(jobs_router, prefix="/api", tags=["jobs"])


# ----- Sanitized error handling (VULN-07/VULN-09: no raw internal messages) -----
@app.exception_handler(RequestValidationError)
async def _validation_error_handler(request: Request, exc: RequestValidationError):
    # SizeLimitedMiddleware tags oversized bodies with a stable error type.
    errors = exc.errors()
    if any(e.get("type") == "body_too_large" for e in errors):
        return JSONResponse(
            status_code=413,
            content={
                "success": False,
                "error": {
                    "code": "FILE_TOO_LARGE",
                    "message": f"Request body exceeds the {settings.max_request_body_mb}MB limit",
                    "details": {},
                },
            },
        )
    # Do not echo raw validation internals (may include input values).
    sanitized = [
        {"loc": list(e.get("loc", [])), "msg": e.get("msg", "invalid value"), "type": e.get("type", "value_error")}
        for e in errors
    ]
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": {"code": "VALIDATION_ERROR", "message": "Request validation failed", "details": {"errors": sanitized}},
        },
    )


@app.exception_handler(asyncio.TimeoutError)
async def _timeout_handler(request: Request, exc: asyncio.TimeoutError):
    return JSONResponse(
        status_code=504,
        content={"success": False, "error": {"code": "TIMEOUT", "message": "Request timed out", "details": {}}},
    )


@app.exception_handler(Exception)
async def _unhandled_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", None)
    logger.exception("Unhandled error on %s %s (request_id=%s)", request.method, request.url.path, request_id)
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": {"code": "INTERNAL_ERROR", "message": "An internal error occurred", "details": {}}},
    )


@app.get("/", include_in_schema=False)
async def root():
    """Root — redirect hint to docs."""
    return {
        "success": True,
        "data": {
            "name": settings.app_name,
            "version": settings.app_version,
            "docs": "/docs",
            "health": "/api/health",
        },
    }
