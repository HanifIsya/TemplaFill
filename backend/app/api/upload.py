"""File upload endpoint stubs — POST /api/upload."""

from fastapi import APIRouter

router = APIRouter()


@router.post("/upload", summary="Upload source PDF and template")
async def upload_files():
    """Stub — will be implemented in Phase 2 (Task 2.1)."""
    return {
        "success": False,
        "error": {
            "code": "NOT_IMPLEMENTED",
            "message": "Upload endpoint not yet implemented (Task 2.1)",
        },
    }
