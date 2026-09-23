"""File upload endpoint — POST /api/upload (Task 2.1)."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, File, Request, UploadFile
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.security import get_rate_limiter, sanitize_filename
from app.services.jobs.manager import get_job_manager

router = APIRouter()
settings = get_settings()

ALLOWED_TEMPLATE_EXTS = {".docx", ".xlsx", ".pptx"}
MAX_SOURCE_MB = settings.max_source_file_size_mb
MAX_TEMPLATE_MB = settings.max_template_file_size_mb


def _error(code: str, message: str, details: dict | None = None, status: int = 400):
    return JSONResponse(
        status_code=status,
        content={"success": False, "error": {"code": code, "message": message, "details": details or {}}},
    )


@router.post("/upload", summary="Upload source PDF and template", status_code=202)
async def upload_files(
    request: Request,
    background_tasks: BackgroundTasks,
    source_file: UploadFile = File(..., description="Source PDF"),
    template_file: UploadFile = File(..., description="Template .docx/.xlsx/.pptx"),
):
    # Rate limit: 10 uploads/hour per IP
    client_ip = request.client.host if request.client else "unknown"
    limiter = get_rate_limiter()
    if not limiter.is_allowed(client_ip, "upload"):
        retry_after = limiter.retry_after(client_ip, "upload")
        return JSONResponse(
            status_code=429,
            content={"success": False, "error": {"code": "RATE_LIMITED", "message": f"Upload rate limit exceeded. Retry after {retry_after}s."}},
            headers={"Retry-After": str(retry_after)},
        )
    # Validate presence (FastAPI already ensures required, but check filename)
    if not source_file.filename:
        return _error("VALIDATION_ERROR", "source_file is required", status=400)
    if not template_file.filename:
        return _error("VALIDATION_ERROR", "template_file is required", status=400)

    # Validate extensions
    source_ext = Path(source_file.filename).suffix.lower()
    template_ext = Path(template_file.filename).suffix.lower()

    if source_ext != ".pdf":
        return _error("UNSUPPORTED_TYPE", f"source_file must be PDF, got {source_ext}", status=415)
    if template_ext not in ALLOWED_TEMPLATE_EXTS:
        return _error(
            "UNSUPPORTED_TYPE",
            f"template_file must be one of {ALLOWED_TEMPLATE_EXTS}, got {template_ext}",
            status=415,
        )

    # Read bytes and validate size
    source_bytes = await source_file.read()
    template_bytes = await template_file.read()

    source_size = len(source_bytes)
    template_size = len(template_bytes)

    if source_size == 0:
        return _error("VALIDATION_ERROR", "source_file is empty", status=400)
    if template_size == 0:
        return _error("VALIDATION_ERROR", "template_file is empty", status=400)

    max_source_bytes = MAX_SOURCE_MB * 1024 * 1024
    max_template_bytes = MAX_TEMPLATE_MB * 1024 * 1024

    if source_size > max_source_bytes:
        return _error(
            "FILE_TOO_LARGE",
            f"source_file exceeds {MAX_SOURCE_MB}MB limit ({source_size} bytes)",
            status=413,
        )
    if template_size > max_template_bytes:
        return _error(
            "FILE_TOO_LARGE",
            f"template_file exceeds {MAX_TEMPLATE_MB}MB limit ({template_size} bytes)",
            status=413,
        )

    # Validate PDF magic
    stripped = source_bytes.lstrip(b"\x00 \n\r\t\xef\xbb\xbf")
    if not stripped.startswith(b"%PDF"):
        return _error("VALIDATION_ERROR", "source_file does not appear to be a PDF (missing %PDF header)", status=400)

    # Validate template magic (all are zip)
    if not template_bytes.startswith(b"PK"):
        return _error("VALIDATION_ERROR", "template_file does not appear to be a valid Office document (missing PK header)", status=400)

    # Sanitize filenames to prevent path traversal, header injection, XSS
    safe_source_name = sanitize_filename(source_file.filename or "source.pdf")
    safe_template_name = sanitize_filename(template_file.filename or "template.docx")

    # Create job with sanitized filenames
    manager = get_job_manager()
    job = await manager.create_job(
        source_bytes=source_bytes,
        source_filename=safe_source_name,
        template_bytes=template_bytes,
        template_filename=safe_template_name,
    )

    # Start background processing
    background_tasks.add_task(manager.process_job, job.job_id)

    # Return 202 per API.md
    return JSONResponse(
        status_code=202,
        content={
            "success": True,
            "data": {
                "job_id": job.job_id,
                "status": job.status.value,
                "source_file": {
                    "filename": job.source_file.filename,
                    "size_bytes": job.source_file.size_bytes,
                    "page_count": job.source_file.page_count,
                },
                "template_file": {
                    "filename": job.template_file.filename,
                    "size_bytes": job.template_file.size_bytes,
                    "format": job.template_file.format,
                },
                "estimated_time_seconds": job.estimated_time_seconds,
                "created_at": job.created_at,
            },
        },
    )
