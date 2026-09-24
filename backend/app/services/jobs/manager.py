"""In-memory job manager for Phase 2 — handles job lifecycle and pipeline orchestration."""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Dict, Optional, List

from app.services.jobs.models import Job, JobStatus, FileInfo, JobProgress, FieldResult, SourceReference

# Singleton store
_jobs: Dict[str, Job] = {}
_lock = asyncio.Lock()

# Allowed template extensions
TEMPLATE_EXTS = {".docx", ".xlsx", ".pptx"}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _label_from_field_name(name: str) -> str:
    # full_name -> Full Name
    return name.replace("_", " ").replace("-", " ").title()


class JobManager:
    """Manages jobs in-memory (MVP). Swap to DB/Redis for production."""

    async def create_job(
        self,
        source_bytes: bytes,
        source_filename: str,
        template_bytes: bytes,
        template_filename: str,
    ) -> Job:
        job_id = str(uuid.uuid4())
        # Build file infos
        source_info = FileInfo(filename=source_filename, size_bytes=len(source_bytes))
        # Template format from ext
        import pathlib

        ext = pathlib.Path(template_filename).suffix.lower().lstrip(".")
        template_info = FileInfo(filename=template_filename, size_bytes=len(template_bytes), format=ext)
        # Estimate time: ~2 sec per field + 5 sec base, but for MVP fixed 45
        # Try to parse template quickly to estimate fields
        try:
            from app.services.mapping.parser import parse_template_bytes

            parsed = parse_template_bytes(template_bytes, template_filename)
            est = 10 + len(parsed.fields) * 3
            est = min(120, max(15, est))
            total_fields = len(parsed.fields)
        except Exception:  # noqa: BLE001
            est = 45
            total_fields = 0
            parsed = None

        job = Job(
            job_id=job_id,
            status=JobStatus.queued,
            source_file=source_info,
            template_file=template_info,
            estimated_time_seconds=est,
            source_bytes=source_bytes,
            template_bytes=template_bytes,
            source_filename=source_filename,
            template_filename=template_filename,
            progress=JobProgress(phase="queued", current_field=0, total_fields=total_fields, percent=0),
        )
        # Keep parsed for fast access? but pipeline will re-parse
        # Store
        async with _lock:
            _jobs[job_id] = job
        return job

    async def get_job(self, job_id: str) -> Optional[Job]:
        async with _lock:
            return _jobs.get(job_id)

    def get_job_sync(self, job_id: str) -> Optional[Job]:
        # Sync accessor for tests without async
        return _jobs.get(job_id)

    async def update_status(self, job_id: str, status: JobStatus, **kwargs) -> Optional[Job]:
        async with _lock:
            job = _jobs.get(job_id)
            if not job:
                return None
            job.status = status
            if status == JobStatus.processing and not job.started_at:
                job.started_at = _now_iso()
            if status in (JobStatus.completed, JobStatus.failed):
                job.completed_at = _now_iso()
            for k, v in kwargs.items():
                setattr(job, k, v)
            return job

    async def list_jobs(self) -> List[Job]:
        async with _lock:
            return list(_jobs.values())

    async def clear_all(self) -> None:
        async with _lock:
            _jobs.clear()

    # For tests sync
    def clear_all_sync(self) -> None:
        _jobs.clear()

    async def process_job(self, job_id: str) -> None:
        """Full pipeline: extract -> chunk -> embed -> store -> parse -> retrieve -> extract -> map."""
        job = await self.get_job(job_id)
        if not job:
            return
        try:
            await self.update_status(job_id, JobStatus.processing)
            job = await self.get_job(job_id)
            assert job is not None

            # --- Validate and extract PDF (Phase 1) ---
            await self.update_status(job_id, JobStatus.processing)
            job.progress.phase = "pdf_extraction"
            job.progress.percent = 15

            from app.services.extraction import extract_pdf
            from app.services.extraction.exceptions import PdfExtractionError

            try:
                doc = extract_pdf(job.source_bytes, filename=job.source_filename)  # type: ignore[arg-type]
            except PdfExtractionError as e:
                await self.update_status(job_id, JobStatus.failed, error=str(e))
                return
            except Exception as e:  # noqa: BLE001
                await self.update_status(job_id, JobStatus.failed, error=f"Extraction failed: {e}")
                return

            # Update file info with page count
            if job.source_file:
                job.source_file.page_count = doc.metadata.page_count
            job.extracted_doc = doc
            job.progress.percent = 25

            # --- Chunk (Phase 2) ---
            from app.services.rag.chunker import chunk_document

            chunks = chunk_document(doc)
            if not chunks:
                await self.update_status(job_id, JobStatus.failed, error="No extractable text found in PDF")
                return
            job.progress.phase = "embedding"
            job.progress.percent = 35

            # --- Embed & store ---
            from app.services.rag.embedder import get_embedder
            from app.services.rag.vector_store import InMemoryVectorStore, StoredChunk

            embedder = get_embedder(force_fake=False)  # will fallback to fake if no key
            # Create per-job vector store
            store = InMemoryVectorStore()
            stored_chunks: List[StoredChunk] = []
            # Batch embed
            texts = [c.text for c in chunks]
            embeddings = await embedder.embed_texts(texts)
            for c, emb in zip(chunks, embeddings):
                stored_chunks.append(
                    StoredChunk(
                        chunk_id=c.chunk_id,
                        text=c.text,
                        embedding=emb,
                        page_number=c.page_number,
                        header=c.header,
                        token_count=c.token_count,
                        metadata={"chunk_index": c.chunk_index},
                    )
                )
            await store.add(stored_chunks)
            # Save store on job for later retrieval
            job._vector_store = store  # type: ignore[attr-defined]
            job._chunks = chunks  # type: ignore[attr-defined]
            job.progress.percent = 55

            # --- Parse template (Phase 3: 55% - 74%) ---
            await self.update_status(job_id, JobStatus.mapping)
            job.progress.phase = "template_mapping"
            job.progress.percent = 60

            from app.services.mapping.parser import parse_template_bytes

            try:
                parsed = parse_template_bytes(job.template_bytes, job.template_filename)  # type: ignore[arg-type]
            except Exception as e:  # noqa: BLE001
                await self.update_status(job_id, JobStatus.failed, error=f"Template parse failed: {e}")
                return
            job.parsed_template = parsed
            job.progress.total_fields = len(parsed.fields)
            job.progress.percent = 70

            if not parsed.fields:
                # No placeholders: mark completed with empty results
                job.field_results = []
                job.overall_confidence = 0.0
                job.progress.percent = 100
                await self.update_status(job_id, JobStatus.completed)
                return

            # --- Phase 4: Structured Extraction via Gemini AI (75% - 95%) ---
            await self.update_status(job_id, JobStatus.extracting)
            job.progress.phase = "ai_extraction"
            job.progress.percent = 80
            job.progress.current_field = 0

            from app.services.rag.retriever import Retriever
            from app.services.generation.extractor import get_extractor

            retriever = Retriever(vector_store=store, embedder=embedder)
            extractor = get_extractor(force_fake=False)

            # Step 1: Collect relevant chunks across fields and deduplicate
            # For documents with <= 15 chunks (~15,000 words), pass all document chunks directly.
            # This avoids 50+ separate embedding API calls that trigger Google's 15 RPM free-tier rate limit!
            if len(chunks) <= 15:
                batch_chunks = chunks
            else:
                unique_chunks_dict = {}
                for field in parsed.fields[:8]:
                    try:
                        retrieved = await retriever.retrieve_for_field(field.field_name, top_k=3)
                        for r in retrieved:
                            if r.chunk.chunk_id not in unique_chunks_dict:
                                unique_chunks_dict[r.chunk.chunk_id] = r.chunk
                    except Exception:
                        pass
                batch_chunks = list(unique_chunks_dict.values())[:12] if unique_chunks_dict else chunks[:12]

            batch_chunk_texts = [c.text for c in batch_chunks]
            batch_source_pages = [c.page_number for c in batch_chunks]

            # Step 2: Build fields list for batch extraction
            fields_payload = [
                {
                    "field_name": field.field_name,
                    "description": field.placeholder or "",
                }
                for field in parsed.fields
            ]

            # Step 3: Single-Prompt Batch Extraction (1 single Gemini call for entire document)
            batch_results = await extractor.extract_batch(
                fields=fields_payload,
                chunks=batch_chunk_texts,
                source_pages=batch_source_pages,
            )

            # Step 4: Build FieldResult models
            field_results: List[FieldResult] = []
            total_conf = 0.0
            for idx, field in enumerate(parsed.fields):
                job.progress.current_field = idx + 1
                job.progress.percent = 80 + int(18 * (idx + 1) / len(parsed.fields))

                ext_res = batch_results.get(field.field_name)
                if ext_res is not None and ext_res.extracted_value is not None:
                    status = "extracted"
                    value = ext_res.extracted_value
                    conf = ext_res.confidence
                    src_page = ext_res.source_page
                    src_text = ext_res.source_text
                    ext_by = ext_res.extracted_by
                    fb_reason = ext_res.fallback_reason
                else:
                    status = "not_found"
                    value = None
                    conf = 0.0
                    src_page = ext_res.source_page if ext_res else None
                    src_text = ext_res.source_text if ext_res else None
                    ext_by = ext_res.extracted_by if ext_res else "heuristic"
                    fb_reason = ext_res.fallback_reason if ext_res else extractor.last_fallback_reason

                total_conf += conf

                fr = FieldResult(
                    field_name=field.field_name,
                    field_label=_label_from_field_name(field.field_name),
                    placeholder=field.placeholder,
                    extracted_value=value,
                    confidence=round(conf, 2),
                    source_reference=SourceReference(page=src_page, snippet=src_text[:200] if src_text else None) if src_page or src_text else None,
                    status=status,
                    is_manually_edited=False,
                    extracted_by=ext_by,
                    fallback_reason=fb_reason,
                )
                field_results.append(fr)

            job.field_results = field_results
            job.overall_confidence = round(total_conf / len(field_results), 2) if field_results else 0.0
            job.has_fallback = any(fr.extracted_by == "heuristic" for fr in field_results) or extractor.last_engine_used != "gemini"
            job.fallback_reason = extractor.last_fallback_reason
            job.engine_used = extractor.last_engine_used
            job.progress.percent = 100
            job.progress.current_field = len(field_results)
            await self.update_status(job_id, JobStatus.completed)

        except Exception as e:  # noqa: BLE001
            await self.update_status(job_id, JobStatus.failed, error=str(e))


# Global manager instance
_job_manager = JobManager()


def get_job_manager() -> JobManager:
    return _job_manager


__all__ = ["JobManager", "get_job_manager", "_jobs"]
