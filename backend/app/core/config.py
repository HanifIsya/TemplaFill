"""Application configuration using pydantic-settings.

Reads environment variables from .env file (if present) and defaults
for local development. All secrets MUST be supplied via env vars.
See .env.example at project root.
"""

from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ----- Application -----
    app_env: str = Field(default="development", description="Runtime environment")
    app_name: str = Field(default="TemplaFill")
    app_version: str = Field(default="0.1.0")
    debug: bool = Field(default=True)

    # ----- Backend Server -----
    backend_host: str = Field(default="0.0.0.0")
    backend_port: int = Field(default=8000)
    cors_origins: str = Field(
        default="http://localhost:3000",
        description="Comma-separated list of allowed CORS origins",
    )

    # ----- Database -----
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/templafill"
    )
    database_echo: bool = Field(default=False)

    # ----- Redis -----
    redis_url: str = Field(default="redis://localhost:6379/0")

    # ----- Gemini API -----
    gemini_api_key: str = Field(default="", description="Gemini API key")
    gemini_model: str = Field(default="gemini-3.7-flash")
    gemini_embedding_model: str = Field(default="gemini-embedding-001")

    # ----- File Storage -----
    upload_dir: str = Field(default="./uploads")
    max_source_file_size_mb: int = Field(default=50)
    max_template_file_size_mb: int = Field(default=20)
    max_source_pages: int = Field(default=500)
    file_retention_hours: int = Field(default=24)

    # ----- Security -----
    secret_key: str = Field(default="change_this_to_a_random_string_in_production")
    jwt_algorithm: str = Field(default="HS256")
    jwt_access_token_expire_minutes: int = Field(default=15)
    jwt_refresh_token_expire_days: int = Field(default=7)

    # ----- Rate Limiting -----
    rate_limit_upload: str = Field(default="10/hour")
    rate_limit_api_read: str = Field(default="60/minute")
    rate_limit_api_write: str = Field(default="30/minute")

    # ----- RAG Pipeline -----
    chunk_size: int = Field(default=800)
    chunk_overlap: int = Field(default=100)
    rag_top_k: int = Field(default=5)
    embedding_batch_size: int = Field(default=100)

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS into a list of origins."""
        if not self.cors_origins:
            return []
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _coerce_cors_origins(cls, v):  # type: ignore[no-untyped-def]
        # Allow both string and list env input
        if isinstance(v, list):
            return ",".join(v)
        return v


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance (singleton per process)."""
    return Settings()


# Eager singleton for convenience imports
settings = get_settings()
