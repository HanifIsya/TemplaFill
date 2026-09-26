"""File upload endpoint — POST /api/upload (Task 2.1)."""

from __future__ import annotations

import io
from pathlib import Path
import zipfile

from fastapi import APIRouter, BackgroundTasks, File, Request, UploadFile
from fastapi.responses import JSONResponse

from app.api.dependencies import rate_limit
from app.core.config import get_settings
from app.core.security import sanitize_filename
from app.services.jobs.manager import get_job_manager

router = APIRouter()
settings = get_settings()

ALLOWED_TEMPLATE_EXTS = {".docx", ".xlsx", ".pptx"}
MAX_SOURCE_MB = settings.max_source_file_size_mb
MAX_TEMPLATE_MB = settings.max_template_file_size_mb
MAX_TEMPLATE_UNCOMPRESSED_BYTES = settings.max_template_uncompressed_mb * 1024 * 1024
MAX_TEMPLATE_ZIP_RATIO = settings.max_template_zip_ratio


def _zip_bomb_guard(template_bytes: bytes) -> str | None:
    """VULN-11: reject Office (ZIP) templates that decompress too much.

    Returns an error message when the archive is unsafe, else None.
    """
    try:
        with zipfile.ZipFile(io.BytesIO(template_bytes)) as zf:
            total_uncompressed = 0
            for info in zf.infolist():
                total_uncompressed += info.file_size
                if total_uncompressed > MAX_TEMPLATE_UNCOMPRESSED_BYTES:
                    return (
                        f"template_file expands beyond the {settings.max_template_uncompressed_mb}MB "
                        "uncompressed limit"
                    )
                if info.compress_size > 0 and (info.file_size / info.compress_size) > MAX_TEMPLATE_ZIP_RATIO:
                    return (
                        f"template_file has a suspicious compression ratio (limit {MAX_TEMPLATE_ZIP_RATIO}:1)"
                    )
    except zipfile.BadZipFile:
        return "template_file is not a valid Office (ZIP) archive"
    return None


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
    # Rate limit: 10 uploads/hour per IP (trusted-proxy-aware)
    rl = rate_limit(request, "upload")
    if rl:
        return rl
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

    # VULN-11: reject ZIP bombs / suspicious archives before any parser runs.
    zip_error = _zip_bomb_guard(template_bytes)
    if zip_error:
        return _error("UNSAFE_FILE", zip_error, status=400)

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
    response = JSONResponse(
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
                # VULN-01: session token authorizing access to THIS job. Cross-origin
                # clients (Vercel frontend) cannot rely on the cookie, so return it
                # here; the client sends it back via the X-Session-Token header.
                "session_token": job.session_token,
            },
        },
    )

    # VULN-01: issue the per-job session cookie. It authorizes access to this
    # job only; subsequent /jobs/{id}/* calls are automatically authenticated.
    if job.session_token:
        response.set_cookie(
            key=settings.session_cookie_name,
            value=job.session_token,
            max_age=settings.session_token_expire_hours * 3600,
            httponly=True,
            samesite=settings.session_cookie_samesite,
            secure=settings.session_cookie_secure,
            path="/",
        )
    return response
