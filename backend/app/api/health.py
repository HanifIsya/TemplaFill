"""Health check endpoint — GET /api/health."""

from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter()
settings = get_settings()


@router.get("/health", summary="Health check")
async def health_check():
    """Return service health, version and timestamp."""
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "version": settings.app_version,
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        },
    }


@router.get("/debug/gemini", summary="Debug live Gemini connection")
async def debug_gemini():
    """Directly test Gemini API connection from Render backend."""
    from app.services.generation.extractor import get_extractor
    ext = get_extractor(force_fake=False)
    if ext.use_fake or not ext._client:
        return {
            "success": False,
            "error": "Client not initialized or API key missing in environment",
            "api_key_set": bool(ext.api_key),
        }

    results = {}
    for model_name in ["gemini-3.8-flash", "gemini-3.7-flash"]:
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
