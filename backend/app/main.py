"""TemplaFill FastAPI application entry point.

CORS is configured to allow the Next.js frontend (default http://localhost:3000).
Health check lives at GET /api/health per docs/2-architecture/API.md.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.jobs import router as jobs_router
from app.api.upload import router as upload_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="TemplaFill API — AI-powered PDF to Template extractor & filler",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# ----- CORS -----
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----- Routers -----
# Health check at /api/health
app.include_router(health_router, prefix="/api", tags=["health"])
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
