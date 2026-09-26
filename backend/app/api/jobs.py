"""Job endpoints — Tasks 2.3-2.7 (status, results, fields, confirm, download, re-extract, source preview)."""

from __future__ import annotations

import io
import logging
import uuid
from pathlib import Path
from typing import Optional
from urllib.parse import quote

from fastapi import APIRouter, Query, Body, Request
from fastapi.responses import JSONResponse, StreamingResponse

from app.api.dependencies import authorize_job_access, rate_limit
from app.core.security import sanitize_text_input, sanitize_filename
from app.services.jobs.manager import get_job_manager
from app.services.jobs.models import JobStatus

logger = logging.getLogger(__name__)

router = APIRouter()


def _error(code: str, message: str, status: int = 400, details: dict | None = None):
    return JSONResponse(status_code=status, content={"success": False, "error": {"code": code, "message": message, "details": details or {}}})


def _success(data: dict, status: int = 200):
    return JSONResponse(status_code=status, content={"success": True, "data": data})


def _validate_job_id(job_id: str):
    try:
        uuid.UUID(job_id)
    except ValueError:
        return _error("VALIDATION_ERROR", "Invalid job_id format", status=400)
    return None


@router.get("/jobs/{job_id}", summary="Get job status")
async def get_job_status(request: Request, job_id: str):
    rl = rate_limit(request, "read")
    if rl:
        return rl
    err = _validate_job_id(job_id)
    if err:
        return err
    manager = get_job_manager()
    job = await manager.get_job(job_id)
    if not job:
        return _error("NOT_FOUND", "Job not found", status=404)
    # VULN-01: only the session that created the job may read it.
    denied = authorize_job_access(request, job)
    if denied:
        return denied
    return _success(
        {
            "job_id": job.job_id,
            "status": job.status.value,
            "progress": job.progress.model_dump(),
            "created_at": job.created_at,
            "started_at": job.started_at,
            "completed_at": job.completed_at,
        }
    )


@router.get("/jobs/{job_id}/results", summary="Get extraction results")
async def get_job_results(request: Request, job_id: str):
    rl = rate_limit(request, "read")
    if rl:
        return rl
    err = _validate_job_id(job_id)
    if err:
        return err
    manager = get_job_manager()
    job = await manager.get_job(job_id)
    if not job:
        return _error("NOT_FOUND", "Job not found", status=404)
    denied = authorize_job_access(request, job)
    if denied:
        return denied
    if job.status == JobStatus.failed:
        return _error("FAILED", job.error or "Job failed", status=500)
    if job.status != JobStatus.completed:
        # Per API.md, results only for completed; return 404-like with status?
        # We return error with code NOT_COMPLETED
        return _error("NOT_COMPLETED", f"Job not yet completed (status: {job.status.value})", status=404)
    return _success(job.to_results_dict())


@router.patch("/jobs/{job_id}/fields/{field_id}", summary="Edit field value")
async def patch_field(
    request: Request,
    job_id: str,
    field_id: str,
    payload: dict = Body(...),
):
    # Rate limit: 30 writes/minute per IP
    rl = rate_limit(request, "write")
    if rl:
        return rl

    err = _validate_job_id(job_id)
    if err:
        return err
    try:
        uuid.UUID(field_id)
    except ValueError:
        return _error("VALIDATION_ERROR", "Invalid field_id", status=400)

    manager = get_job_manager()
    job = await manager.get_job(job_id)
    if not job:
        return _error("NOT_FOUND", "Job not found", status=404)
    denied = authorize_job_access(request, job)
    if denied:
        return denied
    if job.status != JobStatus.completed:
        return _error("NOT_COMPLETED", "Job not yet completed", status=400)

    # Find field
    field = next((f for f in job.field_results if f.field_id == field_id), None)
    if not field:
        return _error("NOT_FOUND", "Field not found", status=404)

    action = payload.get("action")
    if action not in ("edit", "skip", "confirm", "re_extract"):
        return _error("VALIDATION_ERROR", "action must be one of edit, skip, confirm, re_extract", status=400)

    if action == "edit":
        value = payload.get("value")
        if value is None or (isinstance(value, str) and not value.strip() and value != ""):
            # Value required for edit; allow empty string to clear?
            if value is None:
                return _error("VALIDATION_ERROR", "value is required when action is edit", status=400)
        # Update field with sanitization (VULN-3, VULN-10)
        clean_val = sanitize_text_input(str(value), max_len=5000) if value is not None else None
        field.user_edited_value = clean_val
        field.extracted_value = clean_val  # for simplicity, extracted_value becomes edited value for generation
        field.is_manually_edited = True
        field.status = "edited"
        field.confidence = 1.0
        return _success(
            {
                "field_id": field.field_id,
                "field_name": field.field_name,
                "extracted_value": field.extracted_value,
                "user_edited_value": field.user_edited_value,
                "status": field.status,
                "is_manually_edited": field.is_manually_edited,
            }
        )
    elif action == "skip":
        field.status = "skipped"
        field.is_manually_edited = False
        return _success(
            {
                "field_id": field.field_id,
                "field_name": field.field_name,
                "extracted_value": field.extracted_value,
                "status": field.status,
                "is_manually_edited": field.is_manually_edited,
            }
        )
    elif action == "confirm":
        field.status = "confirmed"
        return _success(
            {
                "field_id": field.field_id,
                "field_name": field.field_name,
                "extracted_value": field.extracted_value,
                "status": field.status,
                "is_manually_edited": field.is_manually_edited,
            }
        )
    elif action == "re_extract":
        hint = sanitize_text_input(str(payload.get("hint", "")), max_len=2000)
        # Re-run extraction for this field with hint
        # Retrieve chunks again and extract with hint appended to description
        try:
            from app.services.generation.extractor import get_extractor

            # Need to retrieve chunks for field
            # Use job's stored vector store if available
            store = getattr(job, "_vector_store", None)
            chunks = getattr(job, "_chunks", None)
            from app.services.rag.retriever import Retriever
            from app.services.rag.embedder import get_embedder

            embedder = get_embedder(force_fake=False)
            if store is not None:
                retriever = Retriever(vector_store=store, embedder=embedder)
                retrieved = await retriever.retrieve_for_field(field.field_name, field_description=hint or "", top_k=5)
                chunk_texts = [r.chunk.text for r in retrieved]
                source_pages = [r.chunk.page_number for r in retrieved]
            elif chunks is not None:
                chunk_texts = [c.text for c in chunks[:5]]
                source_pages = [c.page_number for c in chunks[:5]]
            else:
                chunk_texts = [job.extracted_doc.full_text[:2000]] if job.extracted_doc else []
                source_pages = [1]

            extractor = get_extractor(force_fake=False)
            ext_res = await extractor.extract(field.field_name, chunk_texts, field_description=hint or "", source_pages=source_pages)
            prev = field.extracted_value
            new_val = ext_res.extracted_value
            # Update field
            field.extracted_value = new_val
            field.confidence = ext_res.confidence
            field.source_reference = (
                {"page": ext_res.source_page, "snippet": ext_res.source_text[:200]} if ext_res.source_text else None
            )  # type: ignore[assignment]
            # For Pydantic model, need to update via object
            from app.services.jobs.models import SourceReference

            if ext_res.source_text or ext_res.source_page:
                field.source_reference = SourceReference(page=ext_res.source_page, snippet=ext_res.source_text[:200] if ext_res.source_text else None)
            else:
                field.source_reference = None
            field.status = "extracted" if new_val is not None else "not_found"
            return _success(
                {
                    "field_id": field.field_id,
                    "field_name": field.field_name,
                    "previous_value": prev,
                    "new_value": new_val,
                    "confidence": field.confidence,
                    "source_reference": field.source_reference.model_dump() if field.source_reference else None,
                    "status": field.status,
                }
            )
        except Exception as e:  # noqa: BLE001
            logger.exception("Re-extract failed for field %s in job %s", field_id, job_id)
            return _error("EXTRACTION_ERROR", "Re-extraction failed. Please try again.", status=500)


@router.post("/jobs/{job_id}/confirm", summary="Confirm all fields and generate")
async def confirm_fields(request: Request, job_id: str, payload: dict = Body(default={})):
    # Rate limit: 30 writes/minute per IP
    rl = rate_limit(request, "write")
    if rl:
        return rl

    err = _validate_job_id(job_id)
    if err:
        return err
    manager = get_job_manager()
    job = await manager.get_job(job_id)
    if not job:
        return _error("NOT_FOUND", "Job not found", status=404)
    denied = authorize_job_access(request, job)
    if denied:
        return denied
    if job.status != JobStatus.completed:
        return _error("NOT_COMPLETED", "Job must be completed before confirm", status=400)

    include_summary = payload.get("include_summary_report", False) if isinstance(payload, dict) else False

    # Determine final mapped values: for each field, use user_edited_value if edited, else extracted_value
    # Skip fields with status skipped or not_found with no value
    mapped: dict[str, str] = {}
    for f in job.field_results:
        if f.status == "skipped":
            continue
        val = f.user_edited_value if f.is_manually_edited and f.user_edited_value is not None else f.extracted_value
        if val is None or (isinstance(val, str) and not val.strip()):
            continue
        mapped[f.placeholder] = str(val)
        # Also map normalized for generator fallback
        mapped[f.field_name] = str(val)

    if not mapped:
        return _error("VALIDATION_ERROR", "No fields to generate (all skipped or empty)", status=400)

    # Generate filled document
    try:
        from app.services.mapping.generator import generate_filled_document

        filled_bytes = generate_filled_document(job.template_bytes, job.template_filename, mapped)  # type: ignore[arg-type]
        job.filled_doc_bytes = filled_bytes
        job.filled_doc_filename = f"{Path(job.template_filename).stem}_Filled_{job.job_id[:8]}{Path(job.template_filename).suffix}"
        # Mark generating then completed? Keep completed but filled ready
        # For API contract, status becomes generating then completed; we set completed
        # Store include_summary flag as metadata
        job._include_summary = include_summary  # type: ignore[attr-defined]
        # Update status to completed (already) but ensure filled available
        await manager.update_status(job_id, JobStatus.completed)
        return JSONResponse(
            status_code=202,
            content={
                "success": True,
                "data": {"job_id": job.job_id, "status": "generating", "message": "Document generation started"},
            },
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("Document generation failed for job %s", job_id)
        return _error("GENERATION_ERROR", "Failed to generate document. Please try again.", status=500)


@router.get("/jobs/{job_id}/download", summary="Download filled document")
async def download_document(request: Request, job_id: str, type: str = Query(default="filled", description="filled or summary")):  # noqa: A002
    rl = rate_limit(request, "read")
    if rl:
        return rl
    err = _validate_job_id(job_id)
    if err:
        return err
    manager = get_job_manager()
    job = await manager.get_job(job_id)
    if not job:
        return _error("NOT_FOUND", "Job not found", status=404)
    denied = authorize_job_access(request, job)
    if denied:
        return denied
    if job.status != JobStatus.completed:
        return _error("NOT_COMPLETED", "Job not yet completed", status=404)
    if not job.filled_doc_bytes:
        return _error("NOT_FOUND", "Filled document not yet generated. Call POST /api/jobs/{job_id}/confirm first.", status=404)
    if type not in ("filled", "summary"):
        return _error("VALIDATION_ERROR", "type must be filled or summary", status=400)
    # For now only filled supported; summary would be separate
    if type == "summary":
        return _error("NOT_IMPLEMENTED", "Summary report not yet implemented", status=501)

    # Determine content type
    ext = Path(job.template_filename).suffix.lower()
    media_type = "application/octet-stream"
    if ext == ".docx":
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif ext == ".xlsx":
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    elif ext == ".pptx":
        media_type = "application/vnd.openxmlformats-officedocument.presentationml.presentation"

    # Sanitize filename for Content-Disposition to prevent header injection
    raw_filename = job.filled_doc_filename or f"filled_{job.job_id}{ext}"
    safe_filename = sanitize_filename(raw_filename)
    # Use RFC 5987 encoding for non-ASCII safety
    encoded_filename = quote(safe_filename)
    return StreamingResponse(
        io.BytesIO(job.filled_doc_bytes),
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename=\"{safe_filename}\"; filename*=UTF-8''{encoded_filename}",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.post("/jobs/{job_id}/fields/{field_id}/re-extract", summary="Re-extract field")
async def re_extract_field(request: Request, job_id: str, field_id: str, payload: dict = Body(default={})):
    # Rate limit: 5 re-extracts/minute per IP
    rl = rate_limit(request, "re_extract")
    if rl:
        return rl
    # Sanitize user-provided hint text
    hint = sanitize_text_input(str(payload.get("hint", "") if isinstance(payload, dict) else ""), max_len=2000)
    # Reuse logic from patch with re_extract action
    # Call patch_field internals but simplified
    err = _validate_job_id(job_id)
    if err:
        return err
    try:
        uuid.UUID(field_id)
    except ValueError:
        return _error("VALIDATION_ERROR", "Invalid field_id", status=400)

    manager = get_job_manager()
    job = await manager.get_job(job_id)
    if not job:
        return _error("NOT_FOUND", "Job not found", status=404)
    denied = authorize_job_access(request, job)
    if denied:
        return denied
    field = next((f for f in job.field_results if f.field_id == field_id), None)
    if not field:
        return _error("NOT_FOUND", "Field not found", status=404)

    # Perform re-extract with hint
    try:
        from app.services.rag.retriever import Retriever
        from app.services.rag.embedder import get_embedder
        from app.services.generation.extractor import get_extractor

        store = getattr(job, "_vector_store", None)
        chunks = getattr(job, "_chunks", None)
        embedder = get_embedder(force_fake=False)
        if store is not None:
            retriever = Retriever(vector_store=store, embedder=embedder)
            retrieved = await retriever.retrieve_for_field(field.field_name, field_description=hint or "", top_k=5)
            chunk_texts = [r.chunk.text for r in retrieved]
            source_pages = [r.chunk.page_number for r in retrieved]
        elif chunks is not None:
            chunk_texts = [c.text for c in chunks[:5]]
            source_pages = [c.page_number for c in chunks[:5]]
        else:
            chunk_texts = [job.extracted_doc.full_text[:2000]] if job.extracted_doc else []
            source_pages = [1]

        extractor = get_extractor(force_fake=False)
        ext_res = await extractor.extract(field.field_name, chunk_texts, field_description=hint or "", source_pages=source_pages)
        prev = field.extracted_value
        new_val = ext_res.extracted_value
        field.extracted_value = new_val
        field.confidence = ext_res.confidence
        from app.services.jobs.models import SourceReference

        if ext_res.source_text or ext_res.source_page:
            field.source_reference = SourceReference(page=ext_res.source_page, snippet=ext_res.source_text[:200] if ext_res.source_text else None)
        else:
            field.source_reference = None
        field.status = "extracted" if new_val is not None else "not_found"

        return _success(
            {
                "field_id": field.field_id,
                "field_name": field.field_name,
                "previous_value": prev,
                "new_value": new_val,
                "confidence": field.confidence,
                "source_reference": field.source_reference.model_dump() if field.source_reference else None,
                "status": field.status,
            }
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("Re-extract failed for field %s in job %s", field_id, job_id)
        return _error("EXTRACTION_ERROR", "Re-extraction failed. Please try again.", status=500)


@router.get("/jobs/{job_id}/source/page/{page_number}", summary="Get source page content")
async def get_source_page(request: Request, job_id: str, page_number: int, highlight: Optional[str] = Query(default=None)):
    rl = rate_limit(request, "read")
    if rl:
        return rl
    err = _validate_job_id(job_id)
    if err:
        return err
    manager = get_job_manager()
    job = await manager.get_job(job_id)
    if not job:
        return _error("NOT_FOUND", "Job not found", status=404)
    denied = authorize_job_access(request, job)
    if denied:
        return denied
    if not job.extracted_doc:
        return _error("NOT_FOUND", "Source document not yet processed", status=404)
    doc = job.extracted_doc
    total_pages = len(doc.pages)
    if page_number < 1 or page_number > total_pages:
        return _error("VALIDATION_ERROR", f"page_number must be between 1 and {total_pages}", status=400)
    page = doc.pages[page_number - 1]
    # Build tables info
    tables = []
    for tbl in page.tables:
        tables.append({"table_index": tbl.table_index, "headers": tbl.headers, "rows": tbl.rows})
    content = page.text
    # Highlight handling: could wrap highlight term but for API we just return content and highlight param
    # Frontend can highlight
    return _success(
        {
            "page_number": page_number,
            "total_pages": total_pages,
            "content": content,
            "tables": tables,
        }
    )
