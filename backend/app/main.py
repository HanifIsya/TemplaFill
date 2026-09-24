"""TemplaFill FastAPI application entry point.

CORS is configured to allow the Next.js frontend (default http://localhost:3000).
Health check lives at GET /api/health per docs/2-architecture/API.md.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api.health import router as health_router
from app.api.jobs import router as jobs_router
from app.api.upload import router as upload_router
from app.core.config import get_settings
from app.core.security import RequestIdMiddleware, SecurityHeadersMiddleware

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="TemplaFill API — AI-powered PDF to Template extractor & filler",
    # Disable interactive docs in production to reduce attack surface (VULN-7)
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
)

# ----- Performance: GZip (Task 5.2) -----
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ----- Security headers + request ID (Task 5.1) -----
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestIdMiddleware)

# ----- CORS (VULN-9: restrict methods/headers to only what's needed) -----
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID", "Accept"],
)

# ----- Routers -----
# Health check at /api/health and /health (supports UptimeRobot and load balancer probes)
app.include_router(health_router, prefix="/api", tags=["health"])
app.include_router(health_router, prefix="", tags=["health"])
# Upload & Jobs under /api
app.include_router(upload_router, prefix="/api", tags=["upload"])
app.include_router(jobs_router, prefix="/api", tags=["jobs"])


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
