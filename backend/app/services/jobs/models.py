"""Job models for Phase 2 API layer."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional, Any

from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    queued = "queued"
    processing = "processing"
    extracting = "extracting"
    mapping = "mapping"
    completed = "completed"
    failed = "failed"
    generating = "generating"


class FileInfo(BaseModel):
    filename: str
    size_bytes: int
    format: Optional[str] = None  # for template
    page_count: Optional[int] = None  # for source PDF


class JobProgress(BaseModel):
    phase: str = Field(default="field_extraction")
    current_field: int = 0
    total_fields: int = 0
    percent: int = 0


class SourceReference(BaseModel):
    page: Optional[int] = None
    snippet: Optional[str] = None


class FieldResult(BaseModel):
    field_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    field_name: str
    field_label: str  # Title Case
    placeholder: str  # raw like {{full_name}}
    extracted_value: Optional[str] = None
    confidence: float = 0.0
    source_reference: Optional[SourceReference] = None
    status: str = Field(default="not_found")  # extracted|not_found|edited|skipped|confirmed
    is_manually_edited: bool = False
    user_edited_value: Optional[str] = None
    extracted_by: str = Field(default="gemini")  # gemini | heuristic | manual
    fallback_reason: Optional[str] = None


class Job(BaseModel):
    job_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: JobStatus = JobStatus.queued
    progress: JobProgress = Field(default_factory=JobProgress)
    source_file: Optional[FileInfo] = None
    template_file: Optional[FileInfo] = None
    estimated_time_seconds: int = 45
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"))
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error: Optional[str] = None

    # Internal pipeline data (not exposed directly, but used for results)
    source_bytes: Optional[bytes] = Field(default=None, exclude=True, repr=False)
    template_bytes: Optional[bytes] = Field(default=None, exclude=True, repr=False)
    source_filename: str = ""
    template_filename: str = ""
    # Extracted document and chunks (internal)
    extracted_doc: Optional[Any] = Field(default=None, exclude=True, repr=False)
    parsed_template: Optional[Any] = Field(default=None, exclude=True, repr=False)
    field_results: List[FieldResult] = Field(default_factory=list)
    overall_confidence: float = 0.0
    engine_used: str = "gemini"  # gemini | heuristic | hybrid
    has_fallback: bool = False
    fallback_reason: Optional[str] = None
    # Generation
    filled_doc_bytes: Optional[bytes] = Field(default=None, exclude=True, repr=False)
    filled_doc_filename: Optional[str] = None

    model_config = {"arbitrary_types_allowed": True}  # type: ignore[assignment]

    def to_status_dict(self) -> Dict[str, Any]:
        return {
            "job_id": self.job_id,
            "status": self.status.value,
            "progress": self.progress.model_dump(),
            "created_at": self.created_at,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
        }

    def to_upload_response(self) -> Dict[str, Any]:
        return {
            "job_id": self.job_id,
            "status": self.status.value,
            "source_file": self.source_file.model_dump() if self.source_file else None,
            "template_file": self.template_file.model_dump() if self.template_file else None,
            "estimated_time_seconds": self.estimated_time_seconds,
            "created_at": self.created_at,
        }

    def to_results_dict(self) -> Dict[str, Any]:
        fields_found = sum(1 for f in self.field_results if f.status == "extracted" and f.extracted_value is not None)
        fields_not_found = len(self.field_results) - fields_found
        heuristic_count = sum(1 for f in self.field_results if f.extracted_by == "heuristic")
        gemini_count = sum(1 for f in self.field_results if f.extracted_by == "gemini")

        has_fallback = (
            self.has_fallback
            or heuristic_count > 0
            or any("AI_ERROR" in (f.source_reference.snippet or "") for f in self.field_results if f.source_reference)
        )
        if gemini_count > 0 and heuristic_count > 0:
            engine = "hybrid"
        elif heuristic_count > 0 or has_fallback:
            engine = "heuristic"
        else:
            engine = "gemini"

        return {
            "job_id": self.job_id,
            "overall_confidence": round(self.overall_confidence, 2),
            "fields_found": fields_found,
            "fields_not_found": fields_not_found,
            "has_ai_error": has_fallback,
            "has_fallback": has_fallback,
            "engine_used": engine,
            "fallback_reason": self.fallback_reason,
            "fields": [f.model_dump() for f in self.field_results],
        }
