"""API routers package."""

from app.api.health import router as health_router
from app.api.upload import router as upload_router
from app.api.jobs import router as jobs_router

__all__ = ["health_router", "upload_router", "jobs_router"]
