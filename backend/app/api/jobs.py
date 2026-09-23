"""Job-related endpoint stubs — GET /api/jobs/*, PATCH, POST, etc."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/jobs/{job_id}", summary="Get job status")
async def get_job_status(job_id: str):
    """Stub — will be implemented in Phase 2 (Task 2.7)."""
    return {
        "success": False,
        "error": {"code": "NOT_IMPLEMENTED", "message": f"Job status for {job_id} not yet implemented"},
    }


@router.get("/jobs/{job_id}/results", summary="Get extraction results")
async def get_job_results(job_id: str):
    """Stub — will be implemented in Phase 2 (Task 2.3)."""
    return {
        "success": False,
        "error": {"code": "NOT_IMPLEMENTED", "message": f"Results for {job_id} not yet implemented"},
    }


@router.patch("/jobs/{job_id}/fields/{field_id}", summary="Edit field value")
async def patch_field(job_id: str, field_id: str):
    """Stub — will be implemented in Phase 2 (Task 2.4)."""
    return {
        "success": False,
        "error": {"code": "NOT_IMPLEMENTED", "message": "Field edit not yet implemented"},
    }


@router.post("/jobs/{job_id}/confirm", summary="Confirm all fields and generate")
async def confirm_fields(job_id: str):
    """Stub — will be implemented in Phase 2 (Task 2.5)."""
    return {
        "success": False,
        "error": {"code": "NOT_IMPLEMENTED", "message": "Confirm endpoint not yet implemented"},
    }


@router.get("/jobs/{job_id}/download", summary="Download filled document")
async def download_document(job_id: str, type: str = "filled"):  # noqa: A002
    """Stub — will be implemented in Phase 2 (Task 2.6)."""
    return {
        "success": False,
        "error": {"code": "NOT_IMPLEMENTED", "message": "Download endpoint not yet implemented"},
    }


@router.post("/jobs/{job_id}/fields/{field_id}/re-extract", summary="Re-extract field")
async def re_extract_field(job_id: str, field_id: str):
    """Stub — will be implemented in Phase 2."""
    return {
        "success": False,
        "error": {"code": "NOT_IMPLEMENTED", "message": "Re-extract not yet implemented"},
    }


@router.get("/jobs/{job_id}/source/page/{page_number}", summary="Get source page content")
async def get_source_page(job_id: str, page_number: int):
    """Stub — will be implemented in Phase 2."""
    return {
        "success": False,
        "error": {"code": "NOT_IMPLEMENTED", "message": "Source preview not yet implemented"},
    }
