"""Unit tests for GET /api/health and CORS / app wiring.

Run: pytest backend/tests/test_health.py -v
"""

from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app

client = TestClient(app)
settings = get_settings()


def test_health_status_code() -> None:
    """GET /api/health returns 200."""
    response = client.get("/api/health")
    assert response.status_code == 200


def test_health_response_shape() -> None:
    """Response matches API.md contract."""
    response = client.get("/api/health")
    body = response.json()
    assert body["success"] is True
    assert "data" in body
    data = body["data"]
    assert data["status"] == "healthy"
    assert data["version"] == settings.app_version
    assert "timestamp" in data
    # Timestamp should be ISO-8601 with Z
    assert data["timestamp"].endswith("Z")


def test_health_version_is_string() -> None:
    """Version field is a non-empty string."""
    response = client.get("/api/health")
    version = response.json()["data"]["version"]
    assert isinstance(version, str)
    assert len(version) > 0


def test_root_endpoint() -> None:
    """GET / returns app metadata."""
    response = client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["name"] == settings.app_name


def test_cors_headers_present() -> None:
    """CORS headers are added for allowed origin."""
    # FastAPI CORSMiddleware responds to Origin header
    response = client.get(
        "/api/health",
        headers={"Origin": "http://localhost:3000"},
    )
    assert response.status_code == 200
    # When origin is allowed, header should echo it or be wildcard
    assert "access-control-allow-origin" in {k.lower() for k in response.headers.keys()}


def test_openapi_schema_accessible() -> None:
    """OpenAPI schema is generated (FastAPI docs)."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert "paths" in schema
    # Health path must be in schema
    assert "/api/health" in schema["paths"]


def test_docs_accessible() -> None:
    """Swagger docs endpoint is reachable."""
    response = client.get("/docs")
    assert response.status_code == 200


def test_unknown_route_returns_404() -> None:
    """Unknown routes return 404."""
    response = client.get("/api/nonexistent")
    assert response.status_code == 404
