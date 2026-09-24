"""Health check endpoint — GET /api/health."""

from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.core.config import get_settings

router = APIRouter()
settings = get_settings()


@router.get("/health", summary="Health check")
async def health_check():
    """Return service health, version, AI configuration status and timestamp."""
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "version": settings.app_version,
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "ai_configured": bool(settings.gemini_api_key),
            "model": settings.gemini_model,
        },
    }


@router.get("/debug/gemini", summary="Debug live Gemini connection")
async def debug_gemini():
    """Directly test Gemini API connection from Render backend.

    Only available when DEBUG=true (development/staging). Disabled in production.
    """
    # VULN-6: Prevent information disclosure in production
    if not settings.debug:
        return JSONResponse(
            status_code=404,
            content={"success": False, "error": {"code": "NOT_FOUND", "message": "Endpoint not available"}},
        )

    from app.services.generation.extractor import get_extractor
    ext = get_extractor(force_fake=False)
    if ext.use_fake or not ext._client:
        return {
            "success": False,
            "error": "Client not initialized or API key missing in environment",
        }

    results = {}
    for model_name in [ext.model, "gemini-3.6-flash", "gemini-3.5-flash"]:
        if not model_name or model_name in results:
            continue
        try:
            ext.model = model_name
            resp = await ext._call_gemini("Ping! Reply with 'PONG' only.")
            results[model_name] = {"success": True, "response": resp.strip()[:100]}
        except Exception as e:
            results[model_name] = {"success": False, "error": str(e)}

    # Also test embedding
    from app.services.rag.embedder import get_embedder
    emb = get_embedder(force_fake=False)
    try:
        vecs = await emb.embed_texts(["Test embedding chunk"])
        results["embedding"] = {
            "success": True,
            "model": emb.model,
            "dims": len(vecs[0]) if vecs else 0,
        }
    except Exception as e:
        results["embedding"] = {"success": False, "model": emb.model, "error": str(e)}

    return {"success": True, "data": results}
